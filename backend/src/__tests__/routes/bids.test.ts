// Dynamic UID mock — allows switching between requester and fixer mid-test
jest.mock('../../config/firebaseAdmin', () => {
  let currentUid = 'test-uid';
  return {
    default: {
      auth: () => ({
        verifyIdToken: jest.fn().mockImplementation(() => Promise.resolve({ uid: currentUid })),
      }),
      apps: [{}],
    },
    __setUid: (uid: string) => { currentUid = uid; },
  };
});

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase, createTestUser } from '../setup';

const REQUESTER_AUTH = 'Bearer requester-token';
const FIXER_AUTH = 'Bearer fixer-token';
const { __setUid } = jest.requireMock('../../config/firebaseAdmin') as { __setUid: (uid: string) => void };

let fixerId: string;
let taskId: string;

const validBid = { offered_price: 150, description: 'I can fix it today.' };

async function createOpenTask() {
  __setUid('test-uid');
  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', REQUESTER_AUTH)
    .send({
      title: 'Fix my tap',
      description: 'Dripping kitchen tap.',
      category: 'PLUMBING',
      general_location_name: 'Tel Aviv',
      exact_address: '1 Test St',
      lat: 32.08,
      lng: 34.78,
    });
  taskId = res.body.task.id;
  return res.body.task;
}

async function fixerSubmitsBid() {
  __setUid('fixer-uid');
  const res = await request(app)
    .post(`/api/tasks/${taskId}/bids`)
    .set('Authorization', FIXER_AUTH)
    .send(validBid);
  return res.body.bid as { id: string };
}

beforeEach(async () => {
  await cleanDatabase();
  __setUid('test-uid');
  await createTestUser({ firebase_uid: 'test-uid', email: 'requester@example.com' });
  const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@example.com' });
  fixerId = fixer.id;
});
afterAll(() => prisma.$disconnect());

// ── POST /api/tasks/:id/bids ──────────────────────────────────────────────────

describe('POST /api/tasks/:id/bids', () => {
  it('fixer can submit a bid, returns 201 with has_existing_bid=false', async () => {
    await createOpenTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send(validBid);
    expect(res.status).toBe(201);
    expect(res.body.bid).toMatchObject({ offered_price: 150, status: 'PENDING' });
    expect(res.body.has_existing_bid).toBe(false);
  });

  it('returns 200 with has_existing_bid=true on duplicate submission', async () => {
    await createOpenTask();
    await fixerSubmitsBid();
    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 200, description: 'Revised offer.' });
    expect(res.status).toBe(200);
    expect(res.body.has_existing_bid).toBe(true);
  });

  it('returns 403 when requester tries to bid on their own task', async () => {
    await createOpenTask();
    __setUid('test-uid');
    const res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', REQUESTER_AUTH)
      .send(validBid);
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/bids/:id/accept ──────────────────────────────────────────────────

describe('PUT /api/bids/:id/accept', () => {
  it('accepting a bid moves task to IN_PROGRESS and rejects all other bids', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();

    // Second fixer also submits a bid
    const fixer2 = await createTestUser({ firebase_uid: 'fixer2-uid', email: 'fixer2@example.com' });
    __setUid('fixer2-uid');
    const bid2Res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', 'Bearer fixer2-token')
      .send({ offered_price: 120, description: 'Cheaper.' });

    __setUid('test-uid');
    const res = await request(app)
      .put(`/api/bids/${bid.id}/accept`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    expect(task?.status).toBe('IN_PROGRESS');
    expect(task?.assigned_fixer_id).toBe(fixerId);

    const bid2 = await prisma.bid.findUnique({ where: { id: bid2Res.body.bid.id } });
    expect(bid2?.status).toBe('REJECTED');

    // Suppress unused variable lint warning
    void fixer2;
  });

  it('returns 403 when a non-requester tries to accept', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    const res = await request(app)
      .put(`/api/bids/${bid.id}/accept`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });

  it('returns 400 when accepting an already-accepted bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    __setUid('test-uid');
    await request(app).put(`/api/bids/${bid.id}/accept`).set('Authorization', REQUESTER_AUTH);
    const res = await request(app)
      .put(`/api/bids/${bid.id}/accept`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/bids/:id/reject ──────────────────────────────────────────────────

describe('PUT /api/bids/:id/reject', () => {
  it('requester can reject a pending bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    __setUid('test-uid');
    const res = await request(app)
      .put(`/api/bids/${bid.id}/reject`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    const updated = await prisma.bid.findUnique({ where: { id: bid.id } });
    expect(updated?.status).toBe('REJECTED');
  });

  it('returns 403 when fixer tries to reject their own bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    const res = await request(app)
      .put(`/api/bids/${bid.id}/reject`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/bids/:id/withdraw ────────────────────────────────────────────────

describe('PUT /api/bids/:id/withdraw', () => {
  it('fixer can withdraw a pending bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    const res = await request(app)
      .put(`/api/bids/${bid.id}/withdraw`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
    const updated = await prisma.bid.findUnique({ where: { id: bid.id } });
    expect(updated?.status).toBe('WITHDRAWN');
  });
});

// ── PUT /api/bids/:id/cancel-accepted ─────────────────────────────────────────

describe('PUT /api/bids/:id/cancel-accepted', () => {
  it('fixer can cancel an accepted bid, task reopens and assigned_fixer cleared', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    __setUid('test-uid');
    await request(app).put(`/api/bids/${bid.id}/accept`).set('Authorization', REQUESTER_AUTH);

    __setUid('fixer-uid');
    const res = await request(app)
      .put(`/api/bids/${bid.id}/cancel-accepted`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    expect(task?.status).toBe('OPEN');
    expect(task?.assigned_fixer_id).toBeNull();
  });

  it('returns 400 when canceling a non-accepted (e.g. pending) bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    const res = await request(app)
      .put(`/api/bids/${bid.id}/cancel-accepted`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/bids/:id/reactivate ──────────────────────────────────────────────

describe('PUT /api/bids/:id/reactivate', () => {
  it('fixer can reactivate a withdrawn bid on an open task', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    await request(app).put(`/api/bids/${bid.id}/withdraw`).set('Authorization', FIXER_AUTH);

    const res = await request(app)
      .put(`/api/bids/${bid.id}/reactivate`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
    const updated = await prisma.bid.findUnique({ where: { id: bid.id } });
    expect(updated?.status).toBe('PENDING');
  });

  it('returns 400 when reactivating a non-withdrawn bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid(); // PENDING, not WITHDRAWN
    const res = await request(app)
      .put(`/api/bids/${bid.id}/reactivate`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/bids/:id (edit) ──────────────────────────────────────────────────

describe('PUT /api/bids/:id', () => {
  it('fixer can edit price and description of a pending bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    const res = await request(app)
      .put(`/api/bids/${bid.id}`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 180, description: 'I need more time.' });
    expect(res.status).toBe(200);
    expect(res.body.bid.offered_price).toBe(180);
    expect(res.body.bid.description).toBe('I need more time.');
  });

  it('returns 403 when a non-owner tries to edit the bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    __setUid('test-uid');
    const res = await request(app)
      .put(`/api/bids/${bid.id}`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ offered_price: 50 });
    expect(res.status).toBe(403);
  });

  it('returns 400 when editing a non-pending bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    __setUid('test-uid');
    await request(app).put(`/api/bids/${bid.id}/reject`).set('Authorization', REQUESTER_AUTH);
    __setUid('fixer-uid');
    const res = await request(app)
      .put(`/api/bids/${bid.id}`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 100 });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/bids/:id ──────────────────────────────────────────────────────

describe('DELETE /api/bids/:id', () => {
  it('fixer can delete a rejected bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    __setUid('test-uid');
    await request(app).put(`/api/bids/${bid.id}/reject`).set('Authorization', REQUESTER_AUTH);

    __setUid('fixer-uid');
    const res = await request(app)
      .delete(`/api/bids/${bid.id}`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
    expect(await prisma.bid.findUnique({ where: { id: bid.id } })).toBeNull();
  });

  it('fixer can delete a withdrawn bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    await request(app).put(`/api/bids/${bid.id}/withdraw`).set('Authorization', FIXER_AUTH);

    const res = await request(app)
      .delete(`/api/bids/${bid.id}`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
  });

  it('returns 400 when deleting a PENDING bid', async () => {
    await createOpenTask();
    const bid = await fixerSubmitsBid();
    const res = await request(app)
      .delete(`/api/bids/${bid.id}`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(400);
  });
});
