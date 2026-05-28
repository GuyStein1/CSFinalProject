import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { signInWithGoogleWeb, signInWithGoogleCredential } from '../utils/socialAuth';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export default function useGoogleAuth() {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  const signIn = useCallback(async () => {
    if (Platform.OS === 'web') {
      await signInWithGoogleWeb();
      return;
    }

    // Native: use expo-auth-session prompt
    const result = await promptAsync();
    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled');
    }

    const idToken = result.params?.id_token;
    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

    await signInWithGoogleCredential(idToken);
  }, [promptAsync]);

  return { signIn, ready: request != null || Platform.OS === 'web' };
}
