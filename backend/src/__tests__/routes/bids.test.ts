// Two users: requester (test-uid) creates tasks, fixer (fixer-uid) bids
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

beforeEach(async () => {
  await cleanDatabase();
  await createTestUser({ firebase_uid: 'test-uid', email: 'requester@example.com' });
  const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@example.com' });
  fixerId = fixer.id;
});

afterAll(() => prisma.$disconnect());

describe('POST /api/tasks/:id/bids', () => {
  it('fixer can submit a bid', async () => {
    await createOpenTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can fix it today.' });

    expect(res.status).toBe(201);
    expect(res.body.bid).toMatchObject({ offered_price: 150, status: 'PENDING' });
  });

  it('returns 409 on duplicate bid', async () => {
    await createOpenTask();
    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'First bid.' });

    const res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 200, description: 'Second bid.' });

    expect(res.status).toBe(409);
  });

  it('returns 403 when requester tries to bid on own task', async () => {
    await createOpenTask();
    __setUid('test-uid');
    const res = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ offered_price: 100, description: 'Self bid.' });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/bids/:id/accept', () => {
  it('accepting a bid sets it ACCEPTED and task to IN_PROGRESS', async () => {
    await createOpenTask();
    __setUid('fixer-uid');
    const bidRes = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can do it.' });
    const bidId = bidRes.body.bid.id;

    __setUid('test-uid');
    const res = await request(app)
      .put(`/api/bids/${bidId}/accept`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updatedTask?.status).toBe('IN_PROGRESS');
    expect(updatedTask?.assigned_fixer_id).toBe(fixerId);
  });
});

describe('PUT /api/bids/:id/reject', () => {
  it('rejecting a bid sets it to REJECTED', async () => {
    await createOpenTask();
    __setUid('fixer-uid');
    const bidRes = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can do it.' });
    const bidId = bidRes.body.bid.id;

    __setUid('test-uid');
    const res = await request(app)
      .put(`/api/bids/${bidId}/reject`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    expect(bid?.status).toBe('REJECTED');
  });
});

describe('PUT /api/bids/:id/withdraw', () => {
  it('fixer can withdraw a pending bid', async () => {
    await createOpenTask();
    __setUid('fixer-uid');
    const bidRes = await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can do it.' });
    const bidId = bidRes.body.bid.id;

    const res = await request(app)
      .put(`/api/bids/${bidId}/withdraw`)
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    expect(bid?.status).toBe('WITHDRAWN');
  });
});
