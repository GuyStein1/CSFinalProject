const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'new-uid', email: 'alice@example.com', email_verified: false });
jest.mock('../../config/firebaseAdmin', () => ({
  __esModule: true,
  default: {
    auth: () => ({ verifyIdToken: mockVerifyIdToken }),
    apps: [{}],
  },
}));

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase } from '../setup';

beforeEach(cleanDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/sync', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Alice Smith' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ full_name: 'Alice Smith' });

    const dbUser = await prisma.user.findUnique({ where: { firebase_uid: 'new-uid' } });
    expect(dbUser).not.toBeNull();
  });

  it('returns 409 on duplicate sync', async () => {
    await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Alice Smith' });

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Alice Smith' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for missing full_name', async () => {
    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer mock-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without Authorization header', async () => {
    const res = await request(app)
      .post('/api/auth/sync')
      .send({ full_name: 'Alice' });

    expect(res.status).toBe(401);
  });

  it('updates Firebase UID when user re-registers with same email but new UID', async () => {
    // Create user with old UID
    await prisma.user.create({
      data: { firebase_uid: 'old-uid', email: 'alice@example.com', full_name: 'Alice' },
    });

    // Sync comes from new-uid (mock returns uid: 'new-uid', email: 'alice@example.com')
    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer mock-token')
      .send({ full_name: 'Alice Smith' });

    expect(res.status).toBe(200);
    const dbUser = await prisma.user.findFirst({ where: { email: 'alice@example.com' } });
    expect(dbUser?.firebase_uid).toBe('new-uid');
  });
});
