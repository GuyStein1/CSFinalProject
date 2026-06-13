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
  emailVerified: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  capturedCallback = null;
  mockApi.get.mockResolvedValue({ data: {} });
  mockApi.post.mockResolvedValue({});
  mockApi.patch.mockResolvedValue({});
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

  it('sets status="needs_email_verify" when emailVerified is false and backend not verified', async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(unverifiedUser); });
    await waitFor(() => expect(result.current.status).toBe('needs_email_verify'));
  });

  it('sets status="ready" when Firebase emailVerified is false but backend email_verified is true', async () => {
    mockApi.get.mockResolvedValue({ data: { user: { email_verified: true } } });
    const unverifiedFirebaseUser = { ...mockUser, emailVerified: false };
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(unverifiedFirebaseUser); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('auto-syncs and sets ready when /me returns 404 then sync succeeds', async () => {
    mockApi.get
      .mockRejectedValueOnce({ response: { status: 404 } }) // first /me call
      .mockResolvedValueOnce({ data: { user: { email_verified: true } } }); // second /me after sync
    mockApi.post.mockResolvedValue({});
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockApi.post).toHaveBeenCalledWith('/api/auth/sync', {
      full_name: 'Test User',
      phone_number: undefined,
    });
  });

  it('auto-syncs and sets needs_email_verify when user not verified', async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    mockApi.get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { user: { email_verified: false } } });
    mockApi.post.mockResolvedValue({});
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(unverifiedUser); });
    await waitFor(() => expect(result.current.status).toBe('needs_email_verify'));
  });

  it('falls back to needs_sync when auto-sync fails', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });
    mockApi.post.mockRejectedValue(new Error('sync failed'));
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

  it('uses fallback error message when error has no message', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => { capturedCallback!(mockUser); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Failed to verify your account.');
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

    it('sets needs_email_verify after sync when emailVerified is false', async () => {
      const firebaseAuth = auth as unknown as { currentUser: { emailVerified: boolean } };
      firebaseAuth.currentUser.emailVerified = false;

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => {
        await result.current.syncLocalAccount('Test User', '');
      });
      expect(result.current.status).toBe('needs_email_verify');

      firebaseAuth.currentUser.emailVerified = true;
    });

    it('treats 409 as already-synced — calls /me and sets ready when verified', async () => {
      mockApi.post.mockRejectedValue({ response: { status: 409 } });
      mockApi.get.mockResolvedValue({ data: { user: { email_verified: true } } });

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => {
        await result.current.syncLocalAccount('Test User', '');
      });
      expect(result.current.status).toBe('ready');
    });

    it('treats 409 as already-synced but sets needs_email_verify when not verified', async () => {
      const firebaseAuth = auth as unknown as { currentUser: { emailVerified: boolean } };
      firebaseAuth.currentUser.emailVerified = false;
      mockApi.post.mockRejectedValue({ response: { status: 409 } });
      mockApi.get.mockResolvedValue({ data: { user: { email_verified: false } } });

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => {
        await result.current.syncLocalAccount('Test User', '');
      });
      expect(result.current.status).toBe('needs_email_verify');

      firebaseAuth.currentUser.emailVerified = true;
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

  describe('recheckEmailVerification', () => {
    it('sets status="ready" and patches backend when emailVerified becomes true', async () => {
      const firebaseAuth = auth as unknown as { currentUser: { emailVerified: boolean; reload: jest.Mock; getIdToken: jest.Mock } };
      firebaseAuth.currentUser.emailVerified = false;

      const { result } = renderHook(() => useAuthBootstrap());
      firebaseAuth.currentUser.reload.mockImplementation(() => {
        firebaseAuth.currentUser.emailVerified = true;
      });

      await act(async () => { await result.current.recheckEmailVerification(); });
      expect(result.current.status).toBe('ready');
      expect(mockApi.patch).toHaveBeenCalledWith('/api/users/me/email-verified');

      // restore
      firebaseAuth.currentUser.emailVerified = true;
    });

    it('does nothing when emailVerified is still false after reload', async () => {
      const firebaseAuth = auth as unknown as { currentUser: { emailVerified: boolean; reload: jest.Mock } };
      firebaseAuth.currentUser.emailVerified = false;
      firebaseAuth.currentUser.reload.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => { await result.current.recheckEmailVerification(); });
      expect(mockApi.patch).not.toHaveBeenCalled();

      // restore
      firebaseAuth.currentUser.emailVerified = true;
    });

    it('still sets ready even if backend patch fails', async () => {
      const firebaseAuth = auth as unknown as { currentUser: { emailVerified: boolean; reload: jest.Mock; getIdToken: jest.Mock } };
      firebaseAuth.currentUser.emailVerified = false;
      firebaseAuth.currentUser.reload.mockImplementation(() => {
        firebaseAuth.currentUser.emailVerified = true;
      });
      mockApi.patch.mockRejectedValue(new Error('patch failed'));

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => { await result.current.recheckEmailVerification(); });
      expect(result.current.status).toBe('ready');

      // restore
      firebaseAuth.currentUser.emailVerified = true;
    });

    it('does nothing when there is no currentUser', async () => {
      const firebaseAuth = auth as { currentUser: unknown };
      const saved = firebaseAuth.currentUser;
      firebaseAuth.currentUser = null;

      const { result } = renderHook(() => useAuthBootstrap());
      await act(async () => { await result.current.recheckEmailVerification(); });
      // should not crash, status stays as-is
      expect(mockApi.patch).not.toHaveBeenCalled();

      firebaseAuth.currentUser = saved;
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
