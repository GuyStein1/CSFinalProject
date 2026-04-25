import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../api/axiosInstance';
import { auth } from '../config/firebase';

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

export type AuthBootstrapStatus = 'checking' | 'signed_out' | 'needs_sync' | 'ready' | 'error';

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
  const pushRegistered = useRef(false);

  const verifyLocalUser = useCallback(async () => {
    await api.get('/api/users/me');
  }, []);

  const bootstrapSignedInUser = useCallback(
    async (user: User) => {
      setStatus('checking');
      setError(null);
      setUserEmail(user.email ?? null);
      setSuggestedFullName(user.displayName ?? '');

      try {
        await verifyLocalUser();
        setStatus('ready');
        if (!pushRegistered.current) {
          pushRegistered.current = true;
          void registerPushTokenSilently();
        }
      } catch (nextError) {
        const status = getApiErrorStatus(nextError);

        if (status === 404) {
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
      setError(getApiErrorMessage(nextError, 'Failed to sign in.'));
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
        await verifyLocalUser();
        setStatus('ready');
      } catch (nextError) {
        if (getApiErrorStatus(nextError) === 409) {
          try {
            await verifyLocalUser();
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

  const logOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  return {
    status,
    error,
    userEmail,
    suggestedFullName,
    signIn,
    syncLocalAccount,
    retry,
    logOut,
  };
}
