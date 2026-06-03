import React from 'react';
import { render } from '@testing-library/react-native';
import AuthScreen from '../AuthScreen';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../../hooks/useGoogleAuth', () => () => ({
  signIn: jest.fn(),
  ready: true,
}));

const baseProps = {
  status: 'signed_out' as const,
  error: null,
  userEmail: null,
  suggestedFullName: '',
  onSignIn: jest.fn(),
  onSyncLocalAccount: jest.fn(),
  onRetry: jest.fn(),
  onLogOut: jest.fn(),
};

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can open directly in login mode from landing CTAs', () => {
    const { getByText, UNSAFE_getByProps } = render(
      <AuthScreen {...baseProps} initialMode="login" />,
    );

    expect(getByText('Sign in to FixIt')).toBeTruthy();
    expect(UNSAFE_getByProps({ label: 'Email' })).toBeTruthy();
    expect(UNSAFE_getByProps({ label: 'Password' })).toBeTruthy();
  });

  it('keeps the welcome screen as the default auth entry', () => {
    const { getByText } = render(<AuthScreen {...baseProps} />);

    expect(getByText('Your neighborhood. Fixed.')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });
});
