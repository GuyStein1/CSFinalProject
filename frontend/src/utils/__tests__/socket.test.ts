import { io, mockSocket } from '../../__mocks__/socket.io-client';
import { auth } from '../../config/firebase';

// Reset module between tests to clear the singleton
let getSocket: () => Promise<unknown>;
let disconnectSocket: () => void;

beforeEach(() => {
  jest.resetModules();
  (io as jest.Mock).mockClear();
  mockSocket.connected = true;
  mockSocket.disconnect.mockClear();

  // Re-import to get a fresh module (clears the _socket singleton)
  const socketModule = jest.requireActual('../socket') as typeof import('../socket');
  getSocket = socketModule.getSocket;
  disconnectSocket = socketModule.disconnectSocket;
});

jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  },
}));

describe('getSocket', () => {
  it('creates a socket with the Firebase token', async () => {
    mockSocket.connected = false;
    await getSocket();
    expect(auth.currentUser?.getIdToken).toHaveBeenCalled();
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'mock-token' } }),
    );
  });
});

describe('disconnectSocket', () => {
  it('disconnects and clears the socket', async () => {
    await getSocket();
    disconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
