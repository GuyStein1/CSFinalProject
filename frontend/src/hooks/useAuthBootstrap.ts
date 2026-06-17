import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../api/axiosInstance';
import { auth } from '../config/firebase';
import { disconnectSocket } from '../utils/socket';
import { friendlyAuthError } from '../utils/authErrors';

const PUSH_PROMPTED_KEY = 'push_permission_prompted';

async function registerPushTokenSilently(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const alreadyPrompted = await AsyncStorage.getItem(PUSH_PROMPTED_KEY);
    const { status: existing } = await Notifications.getPermissionsAsync();

    let finalStatus = existing;
    if (!alreadyPrompted && existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      await AsyncStorage.setItem(PUSH_PROMPTED_KEY, 'true');
    }

    if (finalStatus === 'granted') {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) return;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await api.post('/api/users/me/push-token', { token });
    }
  } catch {
    // Never block auth flow for push failures
  }
}

export type AuthBootstrapStatus = 'checking' | 'signed_out' | 'needs_sync' | 'needs_email_verify' | 'ready' | 'error';

function getApiErrorStatus(error: unknown) {
  const response = (error as { response?: { status?: unknown } } | null)?.response;
  return typeof response?.status === 'number' ? response.status : null;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { error?: { message?: unknown } } } } | null)?.response;
  const message = response?.data?.error?.message;

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (error instanceof Error && error.message === 'Network Error') {
    return 'Could not reach the backend. Check your API base URL and local server.';
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
}

export default function useAuthBootstrap() {
  const [status, setStatus] = useState<AuthBootstrapStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [suggestedFullName, setSuggestedFullName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const pushRegistered = useRef(false);

  const verifyLocalUser = useCallback(async (): Promise<boolean> => {
    const res = await api.get('/api/users/me');
    setIsAdmin(res.data.user?.is_admin === true);
    // If the user activated fixer mode on another device, sync the local flag.
    if (res.data.user?.is_fixer && auth.currentUser) {
      const key = `fixerOnboardingSeen_${auth.currentUser.uid}`;
      await AsyncStorage.setItem(key, 'true');
    }
    // Return whether the backend considers this user email-verified
    return res.data.user?.email_verified === true;
  }, []);

  const bootstrapSignedInUser = useCallback(
    async (user: User) => {
      setStatus('checking');
      setError(null);
      setUserEmail(user.email ?? null);
      setSuggestedFullName(user.displayName ?? '');

      try {
        const backendVerified = await verifyLocalUser();
        // Skip verification if backend already marks user as verified (e.g. seed users)
        // or if Firebase says verified (e.g. Google sign-in)
        if (!user.emailVerified && !backendVerified) {
          setStatus('needs_email_verify');
          return;
        }
        setStatus('ready');
        if (!pushRegistered.current) {
          pushRegistered.current = true;
          void registerPushTokenSilently();
        }
      } catch (nextError) {
        const status = getApiErrorStatus(nextError);

        if (status === 404) {
          // Auto-sync: create local account from Firebase user data
          try {
            const name = user.displayName || user.email?.split('@')[0] || 'User';
            await api.post('/api/auth/sync', {
              full_name: name,
              phone_number: undefined,
            });
            const bv = await verifyLocalUser();
            if (!user.emailVerified && !bv) {
              setStatus('needs_email_verify');
              return;
            }
            setStatus('ready');
            if (!pushRegistered.current) {
              pushRegistered.current = true;
              void registerPushTokenSilently();
            }
            return;
          } catch {
            // If auto-sync fails, fall through to error
          }
          setStatus('needs_sync');
          return;
        }

        if (status === 401) {
          setError(
            'The backend rejected your Firebase session. Check that frontend Firebase config and backend Firebase Admin credentials point to the same project.',
          );
          setStatus('error');
          return;
        }

        setError(getApiErrorMessage(nextError, 'Failed to verify your account.'));
        setStatus('error');
      }
    },
    [verifyLocalUser]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        disconnectSocket(); // tear down socket so next user gets a fresh authenticated connection
        setStatus('signed_out');
        setError(null);
        setUserEmail(null);
        setSuggestedFullName('');
        return;
      }

      void bootstrapSignedInUser(user);
    });

    return unsubscribe;
  }, [bootstrapSignedInUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    setStatus('checking');
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (nextError) {
      setStatus('signed_out');
      setError(friendlyAuthError(nextError, getApiErrorMessage(nextError, 'Failed to sign in.')));
    }
  }, []);

  const syncLocalAccount = useCallback(
    async (fullName: string, phoneNumber: string) => {
      setStatus('checking');
      setError(null);

      try {
        await api.post('/api/auth/sync', {
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || undefined,
        });
        const backendVerified = await verifyLocalUser();
        // New email/password users won't be verified yet
        if (!auth.currentUser?.emailVerified && !backendVerified) {
          setStatus('needs_email_verify');
          return;
        }
        setStatus('ready');
      } catch (nextError) {
        if (getApiErrorStatus(nextError) === 409) {
          try {
            const bv = await verifyLocalUser();
            if (!auth.currentUser?.emailVerified && !bv) {
              setStatus('needs_email_verify');
              return;
            }
            setStatus('ready');
            return;
          } catch {
            // fall through to the standard message below
          }
        }

        setError(getApiErrorMessage(nextError, 'Failed to create your local account.'));
        setStatus('needs_sync');
      }
    },
    [verifyLocalUser]
  );

  const retry = useCallback(async () => {
    if (!auth.currentUser) {
      setStatus('signed_out');
      setError(null);
      return;
    }

    await bootstrapSignedInUser(auth.currentUser);
  }, [bootstrapSignedInUser]);

  const recheckEmailVerification = useCallback(async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    await user.reload();
    if (user.emailVerified) {
      // Sync verified status to backend
      try {
        await user.getIdToken(true); // force token refresh so backend sees updated claims
        await api.patch('/api/users/me/email-verified');
      } catch {
        // non-fatal — the user is verified in Firebase, backend will catch up
      }
      setStatus('ready');
      if (!pushRegistered.current) {
        pushRegistered.current = true;
        void registerPushTokenSilently();
      }
      return true;
    }
    return false;
  }, []);

  const logOut = useCallback(async () => {
    disconnectSocket(); // disconnect before Firebase sign-out so the socket doesn't linger
    await signOut(auth);
  }, []);

  return {
    status,
    error,
    userEmail,
    suggestedFullName,
    isAdmin,
    signIn,
    syncLocalAccount,
    recheckEmailVerification,
    retry,
    logOut,
  };
}
