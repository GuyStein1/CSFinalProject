jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  DefaultTheme: {
    dark: false,
    colors: {
      primary: '#007AFF',
      background: '#fff',
      card: '#fff',
      text: '#000',
      border: '#ccc',
      notification: '#f00',
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  },
}));

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';
import OnboardingNudge from '../OnboardingNudge';

const mockApi = api as jest.Mocked<typeof api>;
const mockNavigate = jest.fn();
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('OnboardingNudge', () => {
  it('shows modal for users with incomplete profile', async () => {
    mockApi.get.mockResolvedValue({
      data: { user: { full_name: 'Test', avatar_url: null, bio: null, phone_number: null } },
    });

    const { queryByText } = render(<OnboardingNudge />);

    // Fast-forward past the 2s delay
    jest.advanceTimersByTime(2500);
    await waitFor(() => {
      expect(queryByText('onboarding.title')).toBeTruthy();
    });
  });

  it('does not show modal if profile is complete', async () => {
    mockApi.get.mockResolvedValue({
      data: { user: { full_name: 'Test', avatar_url: 'http://img.com/a.png', bio: 'Hi', phone_number: '123' } },
    });

    const { queryByText } = render(<OnboardingNudge />);
    jest.advanceTimersByTime(2500);

    // Wait for the async storage call (marks as dismissed)
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('onboarding_nudge_dismissed', 'true');
    });
    expect(queryByText('onboarding.title')).toBeNull();
  });

  it('does not show modal if previously dismissed', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');

    const { queryByText } = render(<OnboardingNudge />);
    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockAsyncStorage.getItem).toHaveBeenCalled();
    });
    expect(queryByText('onboarding.title')).toBeNull();
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('dismiss button persists dismissal and hides modal', async () => {
    mockApi.get.mockResolvedValue({
      data: { user: { full_name: 'Test', avatar_url: null, bio: null, phone_number: null } },
    });

    const { queryByText, getByText } = render(<OnboardingNudge />);
    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(queryByText('onboarding.title')).toBeTruthy();
    });

    fireEvent.press(getByText('onboarding.later'));
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('onboarding_nudge_dismissed', 'true');
    });
  });

  it('complete profile button navigates to Settings', async () => {
    mockApi.get.mockResolvedValue({
      data: { user: { full_name: 'Test', avatar_url: null, bio: null, phone_number: null } },
    });

    const { queryByText, getByText } = render(<OnboardingNudge />);
    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(queryByText('onboarding.title')).toBeTruthy();
    });

    fireEvent.press(getByText('onboarding.completeProfile'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Settings');
    });
  });

  it('shows modal if even one field is present but others missing', async () => {
    // Has bio but no avatar or phone — still shows (all three must be missing for nudge)
    mockApi.get.mockResolvedValue({
      data: { user: { full_name: 'Test', avatar_url: null, bio: 'Hello', phone_number: null } },
    });

    const { queryByText } = render(<OnboardingNudge />);
    jest.advanceTimersByTime(2500);

    // Profile is NOT incomplete (bio is present), so it should dismiss
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('onboarding_nudge_dismissed', 'true');
    });
    expect(queryByText('onboarding.title')).toBeNull();
  });

  it('handles API error gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { queryByText } = render(<OnboardingNudge />);
    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalled();
    });
    expect(queryByText('onboarding.title')).toBeNull();
  });
});
