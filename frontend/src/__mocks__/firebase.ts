export const auth = {
  currentUser: {
    uid: 'mock-firebase-uid',
    email: 'test@example.com',
    getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
  },
};

export const storage = {};
