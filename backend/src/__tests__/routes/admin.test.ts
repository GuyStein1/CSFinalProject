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

const { __setUid } = jest.requireMock('../../config/firebaseAdmin') as { __setUid: (uid: string) => void };

const ADMIN_AUTH = 'Bearer admin-token';
const REQUESTER_AUTH = 'Bearer requester-token';
const FIXER_AUTH = 'Bearer fixer-token';

let reviewId: string;

async function setupFlaggedReview() {
  // Create task via API
  __setUid('requester-uid');
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', REQUESTER_AUTH)
    .send({
      title: 'Test Task',
      description: 'Test',
      category: 'PLUMBING',
      general_location_name: 'Tel Aviv',
      exact_address: '1 Test St',
      lat: 32.08,
      lng: 34.78,
    });
  const taskId = taskRes.body.task.id;

  // Fixer bids
  __setUid('fixer-uid');
  const bidRes = await request(app)
    .post(`/api/tasks/${taskId}/bids`)
    .set('Authorization', FIXER_AUTH)
    .send({ offered_price: 100, description: 'Can do' });

  // Accept bid, complete task
  __setUid('requester-uid');
  await request(app).put(`/api/bids/${bidRes.body.bid.id}/accept`).set('Authorization', REQUESTER_AUTH);
  await request(app).put(`/api/tasks/${taskId}/status`).set('Authorization', REQUESTER_AUTH).send({ status: 'COMPLETED' });

  // Write review
  const reviewRes = await request(app)
    .post(`/api/tasks/${taskId}/reviews`)
    .set('Authorization', REQUESTER_AUTH)
    .send({ rating: 1, comment: 'Terrible' });
  reviewId = reviewRes.body.review.id;

  // Fixer reports it
  __setUid('fixer-uid');
  await request(app)
    .post(`/api/reviews/${reviewId}/report`)
    .set('Authorization', FIXER_AUTH)
    .send({ reason: 'OFFENSIVE' });
}

beforeEach(async () => {
  await cleanDatabase();
  __setUid('admin-uid');
  await createTestUser({ firebase_uid: 'admin-uid', email: 'admin@example.com', is_admin: true });
  __setUid('requester-uid');
  await createTestUser({ firebase_uid: 'requester-uid', email: 'req@example.com' });
  __setUid('fixer-uid');
  await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@example.com' });
  await setupFlaggedReview();
});

afterAll(() => prisma.$disconnect());

describe('GET /api/admin/flagged-reviews', () => {
  it('admin can list flagged reviews', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .get('/api/admin/flagged-reviews')
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].reports).toHaveLength(1);
  });

  it('non-admin is forbidden', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/admin/flagged-reviews')
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/reviews/:id/hide', () => {
  it('admin can hide a review', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/reviews/${reviewId}/hide`)
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(200);

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    expect(review?.is_hidden).toBe(true);
  });

  it('returns 404 for non-existent review', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post('/api/admin/reviews/non-existent/hide')
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/reviews/:id/dismiss', () => {
  it('admin can dismiss reports and clear flagged status', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/reviews/${reviewId}/dismiss`)
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(200);

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    expect(review?.is_flagged).toBe(false);

    const reports = await prisma.reviewReport.findMany({ where: { review_id: reviewId } });
    expect(reports).toHaveLength(0);
  });
});
