jest.mock('../../config/firebaseAdmin', () => ({
  default: {
    auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }) }),
    apps: [{}],
  },
}));

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase, createTestUser } from '../setup';

const AUTH = 'Bearer mock-token';
let userId: string;

beforeEach(async () => {
  await cleanDatabase();
  const user = await createTestUser();
  userId = user.id;
});
afterAll(() => prisma.$disconnect());

describe('GET /api/users/me', () => {
  it('returns the authenticated user with portfolio_items', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'test@example.com' });
    expect(Array.isArray(res.body.user.portfolio_items)).toBe(true);
  });
});

describe('PUT /api/users/me', () => {
  it('updates profile fields', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', AUTH)
      .send({ full_name: 'Updated Name', bio: 'Expert plumber' });

    expect(res.status).toBe(200);
    expect(res.body.user.full_name).toBe('Updated Name');
    expect(res.body.user.bio).toBe('Expert plumber');
  });

  it('updates specializations', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', AUTH)
      .send({ specializations: ['PLUMBING', 'CLEANING'] });

    expect(res.status).toBe(200);
    expect(res.body.user.specializations).toEqual(expect.arrayContaining(['PLUMBING', 'CLEANING']));
  });
});

describe('GET /api/users/:id', () => {
  it('returns public profile without auth', async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ full_name: 'Test User' });
    expect(res.body.user.portfolio_items).toBeDefined();
  });

  it('returns 404 for non-existent user', async () => {
    const res = await request(app).get('/api/users/non-existent-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/users/me/portfolio', () => {
  it('creates a portfolio item', async () => {
    const res = await request(app)
      .post('/api/users/me/portfolio')
      .set('Authorization', AUTH)
      .send({ image_url: 'https://example.com/photo.jpg' });

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ image_url: 'https://example.com/photo.jpg' });
  });
});

describe('DELETE /api/users/me/portfolio/:id', () => {
  it('deletes an owned portfolio item', async () => {
    const item = await prisma.portfolioItem.create({
      data: { fixer_id: userId, image_url: 'https://example.com/old.jpg' },
    });

    const res = await request(app)
      .delete(`/api/users/me/portfolio/${item.id}`)
      .set('Authorization', AUTH);

    expect(res.status).toBe(204);
    expect(await prisma.portfolioItem.findUnique({ where: { id: item.id } })).toBeNull();
  });

  it('returns 404 for non-owned item', async () => {
    const otherUser = await createTestUser({ firebase_uid: 'other-uid', email: 'other@example.com' });
    const item = await prisma.portfolioItem.create({
      data: { fixer_id: otherUser.id, image_url: 'https://example.com/photo.jpg' },
    });

    const res = await request(app)
      .delete(`/api/users/me/portfolio/${item.id}`)
      .set('Authorization', AUTH);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/users/me/tasks', () => {
  it('returns the authenticated user\'s posted tasks', async () => {
    // Create a task via the API so coordinates are valid
    await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({
        title: 'My task',
        description: 'A task I need done.',
        category: 'PLUMBING',
        general_location_name: 'Tel Aviv',
        exact_address: '1 Test St',
        lat: 32.08,
        lng: 34.78,
      });

    const res = await request(app).get('/api/users/me/tasks').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.tasks[0].title).toBe('My task');
    expect(typeof res.body.total).toBe('number');
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/users/me/tasks')
      .set('Authorization', AUTH)
      .query({ status: 'OPEN' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/users/me/bids', () => {
  it('returns the authenticated user\'s submitted bids', async () => {
    const res = await request(app).get('/api/users/me/bids').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bids)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });
});

describe('POST /api/users/me/push-token', () => {
  it('registers a push token and returns 200', async () => {
    const res = await request(app)
      .post('/api/users/me/push-token')
      .set('Authorization', AUTH)
      .send({ token: 'ExponentPushToken[test123]' });
    expect(res.status).toBe(200);

    const user = await prisma.user.findFirst({ where: { firebase_uid: 'test-uid' } });
    expect(user?.push_token).toBe('ExponentPushToken[test123]');
  });

  it('returns 400 for an empty token', async () => {
    const res = await request(app)
      .post('/api/users/me/push-token')
      .set('Authorization', AUTH)
      .send({ token: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/:id/reviews', () => {
  it('returns an empty list when user has no reviews', async () => {
    const res = await request(app).get(`/api/users/${userId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('returns 404 for a non-existent user', async () => {
    const res = await request(app).get('/api/users/non-existent-id/reviews');
    expect(res.status).toBe(404);
  });
});
