/**
 * Call this at the top of any integration test file to mock Firebase token
 * verification. The mocked UID ('test-uid') must match what createTestUser()
 * creates in setup.ts.
 */
export function mockFirebaseAuth(uid = 'test-uid') {
  jest.mock('../../config/firebaseAdmin', () => ({
    default: {
      auth: () => ({
        verifyIdToken: jest.fn().mockResolvedValue({ uid }),
      }),
      apps: [{}], // pretend app is already initialized
    },
  }));
}
