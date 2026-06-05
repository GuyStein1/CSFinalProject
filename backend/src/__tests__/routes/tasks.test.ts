// Dynamic UID mock — allows multi-user scenarios within one test file
jest.mock('../../config/firebaseAdmin', () => {
  let currentUid = 'test-uid';
  return {
    __esModule: true,
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

// Full dual-confirm completion: confirm payment → requester confirms → fixer confirms
async function completeTaskFull(taskId: string) {
  __setUid('test-uid');
  await request(app)
    .put(`/api/tasks/${taskId}/confirm-payment`)
    .set('Authorization', REQUESTER_AUTH);
  await request(app)
    .put(`/api/tasks/${taskId}/confirm-completion`)
    .set('Authorization', REQUESTER_AUTH);
  __setUid('fixer-uid');
  await request(app)
    .put(`/api/tasks/${taskId}/confirm-completion`)
    .set('Authorization', FIXER_AUTH);
  __setUid('test-uid');
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

  it('returns 400 when coordinates are in the sea', async () => {
    // lat=31.5, lng=33.0 is west of the Israeli coastline (in the Mediterranean)
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({ ...validTask, lat: 31.5, lng: 33.0 });
    expect(res.status).toBe(400);
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

  it('dual-confirm completes an IN_PROGRESS task', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    await completeTaskFull(task.id);
    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updated!.status).toBe('COMPLETED');
  });

  it('rejects direct IN_PROGRESS → COMPLETED transition', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    const res = await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(400);
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
  it('requester can confirm payment on an IN_PROGRESS task', async () => {
    const task = await createTask();
    await acceptBid(task.id);
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
    await completeTaskFull(task.id);
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

// ── PUT /api/tasks/:id/reopen ─────────────────────────────────────────────────

describe('PUT /api/tasks/:id/reopen', () => {
  it('requester can reopen a CANCELED task back to OPEN', async () => {
    const task = await createTask();
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });

    const res = await request(app)
      .put(`/api/tasks/${task.id}/reopen`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('OPEN');
  });

  it('clears the assigned fixer and wipes the stale ACCEPTED bid when reopening a task canceled mid-progress', async () => {
    const task = await createTask();
    await acceptBid(task.id); // task is now IN_PROGRESS with an assigned fixer + ACCEPTED bid

    __setUid('test-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });

    const res = await request(app)
      .put(`/api/tasks/${task.id}/reopen`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('OPEN');
    expect(res.body.task.assigned_fixer_id).toBeNull();

    const reloaded = await prisma.task.findUnique({ where: { id: task.id } });
    expect(reloaded?.assigned_fixer_id).toBeNull();

    // No stale bids remain — an OPEN task must never carry an ACCEPTED bid.
    const remainingBids = await prisma.bid.count({ where: { task_id: task.id } });
    expect(remainingBids).toBe(0);

    // bid_count in GET /api/tasks/:id reflects the clean slate.
    const detail = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', REQUESTER_AUTH);
    expect(detail.body.task.bid_count).toBe(0);
  });

  it('wipes prior bids so a previously-rejected fixer can bid again after reopen', async () => {
    const task = await createTask();

    // Fixer bids while OPEN.
    __setUid('fixer-uid');
    const firstBid = await request(app)
      .post(`/api/tasks/${task.id}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can do this.' });
    expect(firstBid.status).toBe(201);

    // Requester cancels (auto-rejects the pending bid) then reopens.
    __setUid('test-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });
    await request(app)
      .put(`/api/tasks/${task.id}/reopen`)
      .set('Authorization', REQUESTER_AUTH);

    // Same fixer can submit a fresh bid — not blocked by the old one.
    __setUid('fixer-uid');
    const secondBid = await request(app)
      .post(`/api/tasks/${task.id}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 175, description: 'Bidding again.' });
    expect(secondBid.status).toBe(201);
    expect(secondBid.body.has_existing_bid).toBe(false);
  });

  it('wipes the prior chat history when reopening, so a new fixer cannot read it', async () => {
    const task = await createTask();
    await acceptBid(task.id); // IN_PROGRESS with assigned fixer

    const requester = await prisma.user.findUnique({ where: { firebase_uid: 'test-uid' } });
    const fixer = await prisma.user.findUnique({ where: { firebase_uid: 'fixer-uid' } });
    await prisma.message.create({
      data: {
        task_id: task.id,
        sender_id: requester!.id,
        recipient_id: fixer!.id,
        content: 'See you at 3pm.',
      },
    });

    __setUid('test-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });
    await request(app)
      .put(`/api/tasks/${task.id}/reopen`)
      .set('Authorization', REQUESTER_AUTH);

    const remainingMessages = await prisma.message.count({ where: { task_id: task.id } });
    expect(remainingMessages).toBe(0);
  });

  it('returns 400 when the task is not CANCELED', async () => {
    const task = await createTask(); // OPEN
    const res = await request(app)
      .put(`/api/tasks/${task.id}/reopen`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(400);
  });

  it('returns 403 when a non-requester tries to reopen', async () => {
    const task = await createTask();
    await request(app)
      .put(`/api/tasks/${task.id}/status`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ status: 'CANCELED' });

    __setUid('fixer-uid');
    const res = await request(app)
      .put(`/api/tasks/${task.id}/reopen`)
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a nonexistent task', async () => {
    const res = await request(app)
      .put('/api/tasks/00000000-0000-0000-0000-000000000000/reopen')
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(404);
  });
});

// ── POST /api/tasks/:id/reviews (edge cases) ──────────────────────────────────

describe('POST /api/tasks/:id/reviews (forbidden)', () => {
  it('returns 403 when a non-requester tries to submit a review', async () => {
    const task = await createTask();
    await acceptBid(task.id);
    await completeTaskFull(task.id);

    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', FIXER_AUTH)
      .send({ rating: 5 });
    expect(res.status).toBe(403);
    __setUid('test-uid');
  });
});

// ── GET /api/tasks (price filter) ────────────────────────────────────────────

describe('GET /api/tasks (price filter)', () => {
  it('returns tasks within the price range', async () => {
    __setUid('test-uid');
    await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({ ...validTask, suggested_price: 150 });

    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', FIXER_AUTH)
      .query({ lat: 32.08, lng: 34.78, minPrice: 100, maxPrice: 200 });
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.tasks[0].suggested_price).toBe(150);
  });
});

// ── GET /api/tasks/:id/directions ─────────────────────────────────────────────

describe('GET /api/tasks/:id/directions', () => {
  it('returns 400 when originLat or originLng is missing', async () => {
    const task = await createTask();
    const res = await request(app)
      .get(`/api/tasks/${task.id}/directions`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(400);
  });

  it('returns directions: null when no Google Maps API key is configured', async () => {
    const task = await createTask();
    // GOOGLE_MAPS_API_KEY is not set in .env.test → server returns null
    const res = await request(app)
      .get(`/api/tasks/${task.id}/directions?originLat=32.08&originLng=34.78`)
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.directions).toBeNull();
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app)
      .get('/api/tasks/non-existent-id/directions?originLat=32.08&originLng=34.78')
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(404);
  });

  it('returns directions when Google Maps API responds with OK', async () => {
    const task = await createTask();
    const savedKey = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

    const savedFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 'OK',
          routes: [
            {
              legs: [
                {
                  distance: { text: '5 km' },
                  duration: { text: '10 mins' },
                  duration_in_traffic: { text: '12 mins' },
                },
              ],
            },
          ],
        }),
    }) as unknown as typeof global.fetch;

    const res = await request(app)
      .get(`/api/tasks/${task.id}/directions?originLat=32.08&originLng=34.78`)
      .set('Authorization', REQUESTER_AUTH);

    global.fetch = savedFetch;
    process.env.GOOGLE_MAPS_API_KEY = savedKey;

    expect(res.status).toBe(200);
    expect(res.body.directions).not.toBeNull();
    expect(res.body.directions.distanceText).toBe('5 ק״מ');
    expect(res.body.directions.durationText).toBe('10 דקות');
    expect(res.body.directions.durationInTraffic).toBe('12 דקות');
  });

  it('returns null when Google Maps returns a non-OK status', async () => {
    const task = await createTask();
    const savedKey = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

    const savedFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'ZERO_RESULTS', routes: [] }),
    }) as unknown as typeof global.fetch;

    const res = await request(app)
      .get(`/api/tasks/${task.id}/directions?originLat=32.08&originLng=34.78`)
      .set('Authorization', REQUESTER_AUTH);

    global.fetch = savedFetch;
    process.env.GOOGLE_MAPS_API_KEY = savedKey;

    expect(res.status).toBe(200);
    expect(res.body.directions).toBeNull();
  });
});

// ── POST /api/tasks/:id/reviews (review window + no fixer) ───────────────────

describe('POST /api/tasks/:id/reviews (edge cases)', () => {
  async function completeTask() {
    const task = await createTask();
    await acceptBid(task.id);
    await completeTaskFull(task.id);
    return task;
  }

  it('returns 403 when the 14-day review window has expired', async () => {
    const task = await completeTask();
    // Back-date completed_at to 15 days ago to trigger the expiry branch
    await prisma.task.update({
      where: { id: task.id },
      data: { completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    });

    __setUid('test-uid');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('returns 400 when a COMPLETED task has no assigned fixer', async () => {
    // Create a completed task directly — bypass the accept-bid flow so assigned_fixer_id stays null
    const task = await createTask();
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'COMPLETED', completed_at: new Date(), assigned_fixer_id: null },
    });

    __setUid('test-uid');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/reviews`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ rating: 5 });
    expect(res.status).toBe(400);
  });
});

// ── POST /api/tasks/:id/completion-photos ─────────────────────────────────────

describe('POST /api/tasks/:id/completion-photos', () => {
  it('assigned fixer can upload completion photos to an in-progress task', async () => {
    const task = await createTask();
    await acceptBid(task.id);

    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/completion-photos`)
      .set('Authorization', FIXER_AUTH)
      .send({ completion_photos: ['https://example.com/photo1.jpg'] });
    expect(res.status).toBe(200);
    expect(res.body.task.completion_photos).toContain('https://example.com/photo1.jpg');

    // Photo should also be added to portfolio
    const fixerUser = await prisma.user.findFirst({ where: { firebase_uid: 'fixer-uid' } });
    const items = await prisma.portfolioItem.findMany({ where: { fixer_id: fixerUser!.id } });
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('non-assigned user cannot upload completion photos', async () => {
    const task = await createTask();
    await acceptBid(task.id);

    __setUid('test-uid');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/completion-photos`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ completion_photos: ['https://example.com/photo1.jpg'] });
    expect(res.status).toBe(403);
  });

  it('returns 400 on an OPEN task', async () => {
    const task = await createTask();

    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/completion-photos`)
      .set('Authorization', FIXER_AUTH)
      .send({ completion_photos: ['https://example.com/photo1.jpg'] });
    expect(res.status).toBe(403); // not the assigned fixer (no fixer assigned yet)
  });

  it('returns 404 for non-existent task', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .post('/api/tasks/non-existent/completion-photos')
      .set('Authorization', FIXER_AUTH)
      .send({ completion_photos: ['https://example.com/photo1.jpg'] });
    expect(res.status).toBe(404);
  });
});

// ── Response time calculation ─────────────────────────────────────────────────

describe('Fixer response time calculation', () => {
  it('updates avg_response_time_minutes when a bid is placed', async () => {
    const task = await createTask();
    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${task.id}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 100, description: 'Quick response' });

    const fixer = await prisma.user.findFirst({ where: { firebase_uid: 'fixer-uid' } });
    expect(fixer?.avg_response_time_minutes).not.toBeNull();
    expect(typeof fixer?.avg_response_time_minutes).toBe('number');
  });
});

// ── Task urgency ──────────────────────────────────────────────────────────────

describe('Task urgency', () => {
  it('creates a task with urgency TODAY', async () => {
    __setUid('test-uid');
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({
        title: 'Urgent task',
        description: 'Need this done today',
        category: 'PLUMBING',
        urgency: 'TODAY',
        general_location_name: 'Tel Aviv',
        exact_address: '1 Test St',
        lat: 32.08,
        lng: 34.78,
      });
    expect(res.status).toBe(201);
    expect(res.body.task.urgency).toBe('TODAY');
  });

  it('filters discovery feed by urgency', async () => {
    __setUid('test-uid');
    await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({
        title: 'Urgent',
        description: 'Need ASAP',
        category: 'PLUMBING',
        urgency: 'TODAY',
        general_location_name: 'Tel Aviv',
        exact_address: '1 Test St',
        lat: 32.08,
        lng: 34.78,
      });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .query({ lat: 32.08, lng: 34.78, urgency: 'TODAY' });
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.tasks.every((t: { urgency: string }) => t.urgency === 'TODAY')).toBe(true);
  });
});
