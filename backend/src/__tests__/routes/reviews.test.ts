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

const REQUESTER_AUTH = 'Bearer requester-token';
const FIXER_AUTH = 'Bearer fixer-token';

let fixerId: string;
let reviewId: string;

async function createTaskAndReview() {
  // Create task as requester
  __setUid('requester-uid');
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', REQUESTER_AUTH)
    .send({
      title: 'Test Task',
      description: 'Test description',
      category: 'PLUMBING',
      general_location_name: 'Tel Aviv',
      exact_address: '1 Test St',
      lat: 32.08,
      lng: 34.78,
    });
  const taskId = taskRes.body.task.id;

  // Fixer submits bid
  __setUid('fixer-uid');
  const bidRes = await request(app)
    .post(`/api/tasks/${taskId}/bids`)
    .set('Authorization', FIXER_AUTH)
    .send({ offered_price: 100, description: 'I can do it' });
  const bidId = bidRes.body.bid.id;

  // Requester accepts bid
  __setUid('requester-uid');
  await request(app).put(`/api/bids/${bidId}/accept`).set('Authorization', REQUESTER_AUTH);

  // Mark completed
  await request(app)
    .put(`/api/tasks/${taskId}/status`)
    .set('Authorization', REQUESTER_AUTH)
    .send({ status: 'COMPLETED' });

  // Requester writes review about fixer
  const reviewRes = await request(app)
    .post(`/api/tasks/${taskId}/reviews`)
    .set('Authorization', REQUESTER_AUTH)
    .send({ rating: 3, comment: 'Average work' });
  reviewId = reviewRes.body.review.id;
}

beforeEach(async () => {
  await cleanDatabase();
  __setUid('requester-uid');
  await createTestUser({ firebase_uid: 'requester-uid', email: 'req@example.com' });
  __setUid('fixer-uid');
  const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@example.com' });
  fixerId = fixer.id;
  await createTaskAndReview();

  void fixerId;
});

afterAll(() => prisma.$disconnect());

describe('POST /api/reviews/:id/report', () => {
  it('fixer (reviewee) can report a review about themselves', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', FIXER_AUTH)
      .send({ reason: 'OFFENSIVE' });
    expect(res.status).toBe(201);
    expect(res.body.report).toMatchObject({ reason: 'OFFENSIVE' });

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    expect(review?.is_flagged).toBe(true);
  });

  it('non-reviewee cannot report', async () => {
    __setUid('requester-uid');
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', REQUESTER_AUTH)
      .send({ reason: 'SPAM' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent review', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .post('/api/reviews/non-existent-id/report')
      .set('Authorization', FIXER_AUTH)
      .send({ reason: 'SPAM' });
    expect(res.status).toBe(404);
  });

  it('returns 409 on duplicate report', async () => {
    __setUid('fixer-uid');
    await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', FIXER_AUTH)
      .send({ reason: 'SPAM' });

    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', FIXER_AUTH)
      .send({ reason: 'OFFENSIVE' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid reason', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', FIXER_AUTH)
      .send({ reason: 'INVALID' });
    expect(res.status).toBe(400);
  });
});
