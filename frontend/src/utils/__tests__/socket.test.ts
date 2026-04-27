import { io, mockSocket } from '../../__mocks__/socket.io-client';
import { getSocket, disconnectSocket } from '../socket';
import { auth } from '../../config/firebase';

jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  },
}));

beforeEach(() => {
  // Reset singleton between tests: disconnectSocket() sets _socket = null
  // so the next getSocket() call creates a fresh socket
  disconnectSocket();
  (io as jest.Mock).mockClear();
  mockSocket.connected = false;
  mockSocket.disconnect.mockClear();
  (auth.currentUser!.getIdToken as jest.Mock).mockClear();
});

describe('getSocket', () => {
  it('creates a socket using the Firebase token when no socket exists', async () => {
    await getSocket();
    expect(auth.currentUser?.getIdToken).toHaveBeenCalled();
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'mock-token' } }),
    );
  });

  it('reuses an existing connected socket without creating a new one', async () => {
    mockSocket.connected = true;
    await getSocket(); // creates socket
    (io as jest.Mock).mockClear();
    await getSocket(); // should reuse
    expect(io).not.toHaveBeenCalled();
  });

  it('reconnects when the existing socket is disconnected', async () => {
    mockSocket.connected = true;
    await getSocket();
    mockSocket.connected = false;
    (io as jest.Mock).mockClear();
    await getSocket(); // stale socket → create new
    expect(io).toHaveBeenCalledTimes(1);
  });
});

describe('disconnectSocket', () => {
  it('disconnects the active socket and clears the singleton', async () => {
    await getSocket(); // ensure a socket exists
    disconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('is a no-op when no socket exists', () => {
    // _socket is null after beforeEach → should not throw
    expect(() => disconnectSocket()).not.toThrow();
  });
});
