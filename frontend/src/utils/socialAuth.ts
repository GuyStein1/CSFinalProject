import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth } from '../config/firebase';

// ── Google Sign-In (web only — native uses useGoogleAuth hook) ──────────────

export async function signInWithGoogleWeb(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signInWithGoogleCredential(idToken: string): Promise<void> {
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
}

// ── Apple Sign-In ───────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<void> {
  if (Platform.OS === 'web') {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    await signInWithPopup(auth, provider);
    return;
  }

  // Native iOS: use expo-apple-authentication
  const nonce = Math.random().toString(36).substring(2, 10);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error('Apple sign-in failed — no identity token');
  }

  const oauthCredential = new OAuthProvider('apple.com').credential({
    idToken: appleCredential.identityToken,
    rawNonce: nonce,
  });

  await signInWithCredential(auth, oauthCredential);
}

// ── Availability checks ─────────────────────────────────────────────────────

export function isAppleSignInAvailable(): boolean {
  // Available on iOS and web, not on Android
  return Platform.OS === 'ios' || Platform.OS === 'web';
}
