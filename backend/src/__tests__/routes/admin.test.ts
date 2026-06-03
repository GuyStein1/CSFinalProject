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

  it('returns 404 for non-existent review', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post('/api/admin/reviews/non-existent/dismiss')
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(404);
  });
});

// ── Verification management ──────────────────────────────────────────────────

describe('GET /api/admin/pending-verifications', () => {
  it('admin can list pending verifications', async () => {
    // Submit a verification
    __setUid('fixer-uid');
    await request(app)
      .post('/api/users/me/verification')
      .set('Authorization', FIXER_AUTH)
      .send({ verification_photo_url: 'https://example.com/id.jpg' });

    __setUid('admin-uid');
    const res = await request(app)
      .get('/api/admin/pending-verifications')
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
    expect(res.body.users.some((u: { id: string }) => u.id)).toBe(true);
  });

  it('non-admin is forbidden', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/admin/pending-verifications')
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/users/:id/verify', () => {
  let fixerDbId: string;

  beforeEach(async () => {
    __setUid('fixer-uid');
    await request(app)
      .post('/api/users/me/verification')
      .set('Authorization', FIXER_AUTH)
      .send({ verification_photo_url: 'https://example.com/id.jpg' });
    const meRes = await request(app).get('/api/users/me').set('Authorization', FIXER_AUTH);
    fixerDbId = meRes.body.user.id;
  });

  it('admin can approve verification', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/users/${fixerDbId}/verify`)
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'approve' });
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: fixerDbId } });
    expect(user?.verification_status).toBe('APPROVED');
  });

  it('admin can reject verification', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/users/${fixerDbId}/verify`)
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'reject' });
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: fixerDbId } });
    expect(user?.verification_status).toBe('REJECTED');
  });

  it('returns 400 for invalid action', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/users/${fixerDbId}/verify`)
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent user', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post('/api/admin/users/non-existent/verify')
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'approve' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/download-photo', () => {
  it('returns 400 for missing url', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .get('/api/admin/download-photo')
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-firebase url', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .get('/api/admin/download-photo')
      .query({ url: 'https://evil.com/photo.jpg' })
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(400);
  });

  it('returns 502 when firebase returns error', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .get('/api/admin/download-photo')
      .query({ url: 'https://firebasestorage.googleapis.com/v0/b/fake/o/nonexistent.jpg' })
      .set('Authorization', ADMIN_AUTH);
    expect(res.status).toBe(502);
  });
});
