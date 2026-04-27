// Dynamic mock — allows controlling verifyIdToken behaviour per test
jest.mock('../../config/firebaseAdmin', () => {
  let impl = jest.fn().mockResolvedValue({ uid: 'test-uid' });
  return {
    __esModule: true,
    default: {
      auth: () => ({ verifyIdToken: (...args: unknown[]) => impl(...(args as [])) }),
      apps: [{}],
    },
    __setImpl: (fn: typeof impl) => { impl = fn; },
  };
});

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase, createTestUser } from '../setup';

const { __setImpl } = jest.requireMock('../../config/firebaseAdmin') as {
  __setImpl: (fn: jest.Mock) => void;
};

beforeEach(async () => {
  await cleanDatabase();
  await createTestUser({ firebase_uid: 'test-uid', email: 'test@example.com' });
  __setImpl(jest.fn().mockResolvedValue({ uid: 'test-uid' }));
});
afterAll(() => prisma.$disconnect());

describe('authMiddleware — invalid Firebase token', () => {
  it('returns 401 when Firebase token verification throws', async () => {
    __setImpl(jest.fn().mockRejectedValue(new Error('Invalid token')));
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });
});

describe('authMiddleware — user not in database', () => {
  it('returns 404 when token is valid but user does not exist in DB', async () => {
    __setImpl(jest.fn().mockResolvedValue({ uid: 'uid-not-in-db' }));
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});
