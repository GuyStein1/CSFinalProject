import { prisma } from '../config/prisma';

/**
 * Wipes all tables in reverse FK order before each integration test.
 * Call this in `beforeEach` in any test file that writes to the DB.
 */
export async function cleanDatabase() {
  await prisma.reviewReport.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Creates a minimal test user directly in the DB (bypassing Firebase auth).
 * The UID here must match what your mocked `verifyIdToken` returns.
 */
export async function createTestUser(overrides: {
  firebase_uid?: string;
  email?: string;
  full_name?: string;
  is_admin?: boolean;
} = {}) {
  return prisma.user.create({
    data: {
      firebase_uid: overrides.firebase_uid ?? 'test-uid',
      email: overrides.email ?? 'test@example.com',
      full_name: overrides.full_name ?? 'Test User',
      is_admin: overrides.is_admin ?? false,
    },
  });
}
