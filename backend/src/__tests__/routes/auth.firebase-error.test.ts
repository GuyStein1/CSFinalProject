// Mock Firebase to throw an auth error with errorInfo — covers the auth/sync error-handling branch
jest.mock('../../config/firebaseAdmin', () => {
  const firebaseAuthError = new Error('Firebase: auth/invalid-id-token');
  (firebaseAuthError as unknown as Record<string, unknown>).errorInfo = { code: 'auth/invalid-id-token' };
  return {
    __esModule: true,
    default: {
      auth: () => ({ verifyIdToken: jest.fn().mockRejectedValue(firebaseAuthError) }),
      apps: [{}],
    },
  };
});

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase } from '../setup';

beforeEach(cleanDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/sync — Firebase auth error', () => {
  it('returns 401 when Firebase rejects token with an auth/* error code', async () => {
    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer invalid-token')
      .send({ full_name: 'Alice' });
    expect(res.status).toBe(401);
  });
});
