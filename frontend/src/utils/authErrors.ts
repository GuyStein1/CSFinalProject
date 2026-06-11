import i18n from '../i18n';

// Maps Firebase Auth error codes to friendly, translatable message keys so the
// UI never leaks raw strings like "Firebase: Error (auth/invalid-credential)."
const FIREBASE_AUTH_ERROR_KEYS: Record<string, string> = {
  'auth/invalid-credential': 'auth.errors.invalidCredentials',
  'auth/invalid-login-credentials': 'auth.errors.invalidCredentials',
  'auth/user-not-found': 'auth.errors.invalidCredentials',
  'auth/wrong-password': 'auth.errors.invalidCredentials',
  'auth/invalid-email': 'auth.errors.invalidEmail',
  'auth/user-disabled': 'auth.errors.userDisabled',
  'auth/too-many-requests': 'auth.errors.tooManyRequests',
  'auth/network-request-failed': 'auth.errors.network',
  'auth/email-already-in-use': 'auth.errors.emailInUse',
  'auth/weak-password': 'auth.errors.weakPassword',
};

function extractFirebaseAuthCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.startsWith('auth/')) return code;
  // Some SDK paths only expose the code inside the message, e.g. "(auth/...)".
  if (error instanceof Error) {
    const match = error.message.match(/auth\/[a-z-]+/i);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/**
 * Turns a Firebase Auth error into a friendly, localized message.
 * Returns `fallback` for anything that isn't a recognized Firebase auth error
 * (network/backend failures keep their own messaging).
 */
export function friendlyAuthError(error: unknown, fallback: string): string {
  const code = extractFirebaseAuthCode(error);
  if (!code) return fallback;
  return i18n.t(FIREBASE_AUTH_ERROR_KEYS[code] ?? 'auth.errors.generic');
}
