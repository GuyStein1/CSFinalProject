import i18n from '../../i18n';
import { friendlyAuthError } from '../authErrors';

describe('friendlyAuthError', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('maps Firebase auth error codes to friendly translated messages', () => {
    expect(friendlyAuthError({ code: 'auth/invalid-credential' }, 'Fallback')).toBe(
      'Incorrect email or password. Please try again.',
    );
    expect(friendlyAuthError({ code: 'auth/email-already-in-use' }, 'Fallback')).toBe(
      'An account with this email already exists. Try signing in instead.',
    );
  });

  it('extracts Firebase auth codes from SDK error messages', () => {
    expect(
      friendlyAuthError(
        new Error('Firebase: Error (auth/weak-password).'),
        'Fallback',
      ),
    ).toBe('Please choose a stronger password (at least 6 characters).');
  });

  it('returns the generic auth message for unknown Firebase auth codes', () => {
    expect(friendlyAuthError({ code: 'auth/custom-provider-error' }, 'Fallback')).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('keeps the provided fallback for non-auth failures', () => {
    expect(friendlyAuthError({ code: 'storage/retry-limit-exceeded' }, 'Fallback')).toBe(
      'Fallback',
    );
    expect(friendlyAuthError(new Error('Plain network failure'), 'Fallback')).toBe(
      'Fallback',
    );
    expect(friendlyAuthError(null, 'Fallback')).toBe('Fallback');
  });
});
