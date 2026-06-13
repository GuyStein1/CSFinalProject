export const auth = {
  currentUser: {
    uid: 'mock-firebase-uid',
    email: 'test@example.com',
    emailVerified: true,
    getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    reload: jest.fn().mockResolvedValue(undefined),
  },
};

export const storage = {};
