// Dynamic UID mock — allows multi-user scenarios within one test file
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

const validTask = {
  title: 'Fix my sink',
  description: 'Dripping tap under the kitchen sink needs replacement.',
  category: 'PLUMBING',
  general_location_name: 'Tel Aviv',
  exact_address: '1 Dizengoff St, Tel Aviv',
  lat: 32.08,
  lng: 34.78,
};

beforeEach(async () => {
  await cleanDatabase();
  __setUid('test-uid');
  await createTestUser({ firebase_uid: 'test-uid', email: 'requester@example.com' });
  await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@example.com' });
});
afterAll(() => prisma.$disconnect());

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTask(overrides: Partial<typeof validTask> = {}) {
  __setUid('test-uid');
  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', REQUESTER_AUTH)
    .send({ ...validTask, ...overrides });
  return res.body.task as { id: string; status: string };
}

// Fixer submits a bid, requester accepts it → task goes IN_PROGRESS
async function acceptBid(taskId: string) {
  __setUid('fixer-uid');
  const bidRes = await request(app)
    .post(`/api/tasks/${taskId}/bids`)
    .set('Authorization', FIXER_AUTH)
    .send({ offered_price: 200, description: 'I can fix it fast.' });
  const bidId = bidRes.body.bid.id as string;

  __setUid('test-uid');
  await request(app)
    .put(`/api/bids/${bidId}/accept`)
    .set('Authorization', REQUESTER_AUTH);

  return bidId;
}

// ── POST /api/tasks ───────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send(validTask);
    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({ title: 'Fix my sink', status: 'OPEN' });
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({ title: 'Only title' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).post('/api/tasks').send(validTask);
    expect(res.status).toBe(401);
  });
});

// ── GET /api/tasks (discovery feed) ──────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns OPEN tasks near given coordinates', async () => {
    await createTask();
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', FIXER_AUTH)
      .query({ lat: 32.08, lng: 34.78, radius: 5 });
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.tasks[0]).toMatchObject({ title: 'Fix my sink' });
  });

  it('returns 400 when lat/lng are missing', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(400);
  });

  it('filters by category — returns no results when category does not match', async () => {
    await createTask({ category: 'PLUMBING' });
    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', FIXER_AUTH)
      .query({ lat: 32.08, lng: 34.78, category: 'CLEANING' });
    expect(res.status).toBe(200);
    expect(res.body.tasks.every((t: { category: string }) => t.category === 'CLEANING')).toBe(true);
  });

  it('does not return tasks outside the radius', async () => {
    await createTask(); // Tel Aviv
    // Query from Eilat (~300 km away) with 1 km radius
    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', FIXER_AUTH)
      .query({ lat: 29.55, lng: 34.95, radius: 1 });
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(0);
  });

  it('does not return IN_PROGRESS or COMPLETED tasks', async () => {
    const task = await createTask();
    await acceptBid(task.id); // moves to IN_PROGRESS
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', FIXER_AUTH)
      .query({ lat: 32.08, lng: 34.78, radius: 5 });
    expect(res.status).toBe(200);
    expect(res.body.tasks.find((t: { id: string }) => t.id === task.id)).toBeUndefined();
  });
});

// ── GET /api/tasks/:id ────────────────────────────────────────────────────────

describe('GET /api/tasks/:id', () => {
  it('requester can see exact_address on their own task', async () => {
    const task = await createTask();
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.task.exact_address).toBe(validTask.exact_address);
  });

  it('third-party fixer cannot see exact_address of unassigned task', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.task).not.toHaveProperty('exact_address');
  });

  it('assigned fixer can see exact_address after bid is accepted', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    __setUid('fixer-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.task.exact_address).toBe(validTask.exact_address);
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .get('/api/tasks/non-existent-id')
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(404);
  });
});

// ── GET /api/tasks/:id/bids ───────────────────────────────────────────────────

describe('GET /api/tasks/:id/bids', () => {
  it('requester can view all bids for their task', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${task.id}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 100, description: 'I can do it.' });

    __setUid('test-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/bids`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.bids).toHaveLength(1);
    expect(res.body.bids[0]).toMatchObject({ offered_price: 100, status: 'PENDING' });
  });

  it('returns 403 when a non-requester tries to view bids', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/bids`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/tasks/:id ────────────────────────────────────────────────────────

describe('PUT /api/tasks/:id', () => {
  it('requester can update title and description on an OPEN task', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ title: 'Updated title' });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Updated title');
  });

  it('returns 403 when a non-requester tries to edit', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', FIXER_AUTH)
      .send({ title: 'Hijacked title' });
    expect(res.status).toBe(403);
  });

  it('returns 409 when editing a task that is no longer OPEN', async () => {
    const task = await createTask();
    await acceptBid(task.id); // task is now IN_PROGRESS
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ title: 'Too late' });
    expect(res.status).toBe(409);
  });
});

// ── PUT /api/tasks/:id/status ─────────────────────────────────────────────────

describe('PUT /api/tasks/:id/status', () => {
  it('requester can cancel an OPEN task', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('CANCELED');
  });

  it('canceling an OPEN task auto-rejects all pending bids', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${task.id}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 100, description: 'I can do it.' });

    __setUid('test-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });

    const bids = await prisma.bid.findMany({ where: { task_id: task.id } });
    expect(bids.every((b) => b.status === 'REJECTED')).toBe(true);
  });

  it('requester can mark an IN_PROGRESS task as COMPLETED', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    const res = await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('COMPLETED');
  });

  it('requester can cancel an IN_PROGRESS task', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    const res = await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('CANCELED');
  });

  it('returns 400 for an invalid transition (OPEN → COMPLETED)', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(400);
  });

  it('returns 403 when a non-requester tries to update status', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', FIXER_AUTH)
      .send({ status: 'CANCELED' });
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/tasks/:id/confirm-payment ────────────────────────────────────────

describe('PUT /api/tasks/:id/confirm-payment', () => {
  it('requester can confirm payment on a COMPLETED task', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'COMPLETED' });

    const res = await request(app)
      .put(`/api/tasks/${task.id}/confirm-payment`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.task.is_payment_confirmed).toBe(true);
  });

  it('returns 400 when trying to confirm payment on an OPEN task', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/api/tasks/${task.id}/confirm-payment`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(400);
  });
});

// ── POST /api/tasks/:id/reviews ───────────────────────────────────────────────

describe('POST /api/tasks/:id/reviews', () => {
  async function completeTask() {
    const task = await createTask();
    await acceptBid(task.id);
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'COMPLETED' });
    return task;
  }

  it('requester can submit a review after task completion', async () => {
    const task = await completeTask();
    const res = await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ rating: 5, comment: 'Excellent work!' });
    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
  });

  it('returns 400 when reviewing an incomplete task', async () => {
    const task = await createTask();
    const res = await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ rating: 4 });
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate review', async () => {
    const task = await completeTask();
    await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ rating: 5 });
    const res = await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ rating: 3 });
    expect(res.status).toBe(409);
  });
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  it('deletes a CANCELED task', async () => {
    const task = await createTask();
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });

  it('returns 400 when trying to delete an OPEN task', async () => {
    const task = await createTask();
    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(400);
  });

  it('returns 403 when a non-requester tries to delete', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });
});
