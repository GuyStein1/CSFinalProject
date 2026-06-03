import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockPromptAsync = jest.fn();

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: () => [{ /* request */ }, null, mockPromptAsync],
}));

jest.mock('../../utils/socialAuth', () => ({
  signInWithGoogleWeb: jest.fn().mockResolvedValue(undefined),
  signInWithGoogleCredential: jest.fn().mockResolvedValue(undefined),
}));

import useGoogleAuth from '../useGoogleAuth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const socialAuth = require('../../utils/socialAuth');

describe('useGoogleAuth', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
    jest.clearAllMocks();
  });

  it('returns ready and signIn', () => {
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.ready).toBe(true);
    expect(typeof result.current.signIn).toBe('function');
  });

  it('uses signInWithGoogleWeb on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const { result } = renderHook(() => useGoogleAuth());
    await result.current.signIn();
    expect(socialAuth.signInWithGoogleWeb).toHaveBeenCalled();
  });

  it('uses promptAsync on native and signs in with credential', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { id_token: 'test-token' },
    });

    const { result } = renderHook(() => useGoogleAuth());
    await result.current.signIn();

    expect(mockPromptAsync).toHaveBeenCalled();
    expect(socialAuth.signInWithGoogleCredential).toHaveBeenCalledWith('test-token');
  });

  it('throws when native prompt is cancelled', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    mockPromptAsync.mockResolvedValue({ type: 'cancel' });

    const { result } = renderHook(() => useGoogleAuth());
    await expect(result.current.signIn()).rejects.toThrow('cancelled');
  });

  it('throws when no id_token in native response', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: {},
    });

    const { result } = renderHook(() => useGoogleAuth());
    await expect(result.current.signIn()).rejects.toThrow('No ID token');
  });
});
