import { Platform } from 'react-native';

jest.mock('firebase/auth', () => {
  const credentialFn = jest.fn();
  function GoogleAuthProvider() { /* constructor */ }
  GoogleAuthProvider.credential = credentialFn;
  return {
    GoogleAuthProvider,
    OAuthProvider: jest.fn().mockImplementation(() => ({
      addScope: jest.fn(),
      credential: jest.fn(),
    })),
    signInWithCredential: jest.fn().mockResolvedValue({}),
    signInWithPopup: jest.fn().mockResolvedValue({}),
  };
});

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('hashed'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('../../config/firebase', () => ({
  auth: {},
}));

import { isAppleSignInAvailable, signInWithGoogleWeb, signInWithGoogleCredential, signInWithApple } from '../socialAuth';

/* eslint-disable @typescript-eslint/no-var-requires */
const firebaseAuth = require('firebase/auth');
const appleAuth = require('expo-apple-authentication');
const expoCrypto = require('expo-crypto');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('isAppleSignInAvailable', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  it('returns true on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    expect(isAppleSignInAvailable()).toBe(true);
  });

  it('returns true on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    expect(isAppleSignInAvailable()).toBe(true);
  });

  it('returns false on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    expect(isAppleSignInAvailable()).toBe(false);
  });
});

describe('signInWithGoogleWeb', () => {
  it('calls signInWithPopup', async () => {
    await signInWithGoogleWeb();
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
  });
});

describe('signInWithGoogleCredential', () => {
  it('creates credential and signs in', async () => {
    firebaseAuth.GoogleAuthProvider.credential.mockReturnValue('mock-cred');
    await signInWithGoogleCredential('mock-id-token');
    expect(firebaseAuth.GoogleAuthProvider.credential).toHaveBeenCalledWith('mock-id-token');
    expect(firebaseAuth.signInWithCredential).toHaveBeenCalledWith({}, 'mock-cred');
  });
});

describe('signInWithApple', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
    jest.clearAllMocks();
  });

  it('uses signInWithPopup on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    await signInWithApple();
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
  });

  it('uses expo-apple-authentication on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const mockOAuthCredential = jest.fn();
    firebaseAuth.OAuthProvider.mockImplementation(() => ({
      addScope: jest.fn(),
      credential: mockOAuthCredential.mockReturnValue('apple-cred'),
    }));
    appleAuth.signInAsync.mockResolvedValue({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Test' },
    });
    expoCrypto.digestStringAsync.mockResolvedValue('hashed-nonce');

    await signInWithApple();

    expect(appleAuth.signInAsync).toHaveBeenCalled();
    expect(firebaseAuth.signInWithCredential).toHaveBeenCalled();
  });

  it('throws when no identity token on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    appleAuth.signInAsync.mockResolvedValue({ identityToken: null });

    await expect(signInWithApple()).rejects.toThrow('no identity token');
  });
});
