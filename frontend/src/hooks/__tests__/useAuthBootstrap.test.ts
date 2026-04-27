import { renderHook, act, waitFor } from '@testing-library/react-native';
import useAuthBootstrap from '../useAuthBootstrap';
import api from '../../api/axiosInstance';
import { auth } from '../../config/firebase';

const mockApi = api as jest.Mocked<typeof api>;

// Capture the onAuthStateChanged callback so tests can trigger auth state changes
let capturedCallback: ((user: unknown) => void) | null = null;

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth: unknown, cb: (user: unknown) => void) => {
    capturedCallback = cb;
    return jest.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

const { onAuthStateChanged, signInWithEmailAndPassword, signOut } =
  jest.requireMock('firebase/auth') as {
    onAuthStateChanged: jest.Mock;
    signInWithEmailAndPassword: jest.Mock;
    signOut: jest.Mock;
  };

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
};

beforeEach(() => {
  jest.clearAllMocks();
  capturedCallback = null;
  mockApi.get.mockResolvedValue({ data: {} });
  mockApi.post.mockResolvedValue({});
  signInWithEmailAndPassword.mockResolvedValue(undefined);
  signOut.mockResolvedValue(undefined);
  onAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
    capturedCallback = cb;
    return jest.fn();
  });
});

describe('useAuthBootstrap', () => {
  it('starts with status="checking"', () => {
    const { result } = renderHook(() => useAuthBootstrap());
    expect(result.current.status).toBe('checking');
  });

  it('sets status="signed_out" when Firebase reports no user', async () => {
    const { result } = renderHook(() => useAuthBootstrap());
    act(() => { capturedCallback!(null); });
    await waitFor(() => expect(result.current.status).toBe('signed_out'));
    expect(result.current.error).toBeNull();
    expect(result.current.userEmail).toBeNull();
  });

  it('sets status="ready" when user is signed in and /me succeeds', async () => {
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.userEmail).toBe('test@example.com');
    expect(result.current.suggestedFullName).toBe('Test User');
    expect(mockApi.get).toHaveBeenCalledWith('/api/users/me');
  });

  it('sets status="needs_sync" when /me returns 404', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('needs_sync'));
  });

  it('sets status="error" with Firebase project message when /me returns 401', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 401 } });
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/firebase/i);
  });

  it('sets status="error" with backend message for Network Error', async () => {
    mockApi.get.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/backend/i);
  });

  it('uses API response error message when provided', async () => {
    mockApi.get.mockRejectedValue({
      response: { status: 500, data: { error: { message: 'DB is down' } } },
    });
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('DB is down');
  });

  it('uses Error.message as fallback for unknown /me errors', async () => {
    mockApi.get.mockRejectedValue(new Error('Something failed'));
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Something failed');
  });

  describe('syncLocalAccount', () => {
    it('posts to /api/auth/sync and fetches /me on success', async () => {
      const { result } = renderHook(() => useAuthBootstrap());
      act(() => { capturedCallback!(null); });
      await waitFor(() => expect(result.current.status).toBe('signed_out'));

      await act(async () => {
        await result.current.syncLocalAccount('Test User', '050-1234567');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/sync', {
        full_name: 'Test User',
        phone_number: '050-1234567',
      });
      expect(result.current.status).toBe('ready');
    });

    it('omits phone_number when empty string', async () => {
      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => {
        await result.current.syncLocalAccount('Test User', '');
      });
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/sync', {
        full_name: 'Test User',
        phone_number: undefined,
      });
    });

    it('treats 409 as already-synced — calls /me and sets ready', async () => {
      mockApi.post.mockRejectedValue({ response: { status: 409 } });
      mockApi.get.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => {
        await result.current.syncLocalAccount('Test User', '');
      });
      expect(result.current.status).toBe('ready');
    });

    it('sets needs_sync and error when sync fails for non-409 reason', async () => {
      mockApi.post.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useAuthBootstrap());
      act(() => { capturedCallback!(null); });
      await waitFor(() => expect(result.current.status).toBe('signed_out'));

      await act(async () => {
        await result.current.syncLocalAccount('Test User', '');
      });
      expect(result.current.status).toBe('needs_sync');
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('signIn', () => {
    it('calls signInWithEmailAndPassword with trimmed email', async () => {
      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => {
        await result.current.signIn('  test@example.com  ', 'password123');
      });
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123',
      );
    });

    it('sets status="signed_out" and error when sign-in fails', async () => {
      signInWithEmailAndPassword.mockRejectedValue(new Error('Wrong password'));

      const { result } = renderHook(() => useAuthBootstrap());
      act(() => { capturedCallback!(null); });
      await waitFor(() => expect(result.current.status).toBe('signed_out'));

      await act(async () => {
        await result.current.signIn('test@example.com', 'wrong');
      });
      await waitFor(() => expect(result.current.status).toBe('signed_out'));
      expect(result.current.error).toMatch(/wrong password/i);
    });
  });

  describe('logOut', () => {
    it('calls Firebase signOut', async () => {
      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => { await result.current.logOut(); });
      expect(signOut).toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('re-runs bootstrap for the current Firebase user', async () => {
      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => { await result.current.retry(); });
      await waitFor(() => expect(result.current.status).toBe('ready'));
      // /me should have been called (by bootstrapSignedInUser)
      expect(mockApi.get).toHaveBeenCalledWith('/api/users/me');
    });

    it('sets signed_out when no currentUser on retry', async () => {
      const firebaseAuth = auth as { currentUser: unknown };
      const savedUser = firebaseAuth.currentUser;
      firebaseAuth.currentUser = null;

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => { await result.current.retry(); });
      expect(result.current.status).toBe('signed_out');

      firebaseAuth.currentUser = savedUser;
    });
  });
});
