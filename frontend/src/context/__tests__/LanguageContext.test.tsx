import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import api from '../../api/axiosInstance';

// AsyncStorage and api are wired via moduleNameMapper in jest.config.ts
jest.mock('expo-updates', () => ({ reloadAsync: jest.fn() }));
jest.mock('../../i18n', () => ({ changeLanguage: jest.fn() }));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockUpdates = Updates as jest.Mocked<typeof Updates>;
const mockApi = api as jest.Mocked<typeof api>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  mockUpdates.reloadAsync.mockResolvedValue(undefined);
  mockApi.put.mockResolvedValue({});
});

describe('LanguageContext', () => {
  it('defaults to English when no stored preference', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());
    expect(result.current.language).toBe('en');
    expect(result.current.isRTL).toBe(false);
  });

  it('restores Hebrew from AsyncStorage on mount', async () => {
    mockStorage.getItem.mockResolvedValue('he');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('he'));
    expect(result.current.isRTL).toBe(true);
  });

  it('syncFromServer updates language when it differs from current', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    act(() => { result.current.syncFromServer('he'); });
    expect(result.current.language).toBe('he');
    expect(mockStorage.setItem).toHaveBeenCalledWith('@fixit_language', 'he');
  });

  it('syncFromServer is a no-op when language is already current', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    const callsBefore = (mockStorage.setItem as jest.Mock).mock.calls.length;
    act(() => { result.current.syncFromServer('en'); });
    expect((mockStorage.setItem as jest.Mock).mock.calls.length).toBe(callsBefore);
  });

  it('changeLanguage persists preference, updates state, and calls the API', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    await act(async () => { await result.current.changeLanguage('he'); });

    expect(mockStorage.setItem).toHaveBeenCalledWith('@fixit_language', 'he');
    expect(result.current.language).toBe('he');
    expect(mockApi.put).toHaveBeenCalledWith('/api/users/me', { language: 'he' });
  });

  it('changeLanguage continues silently when the API call fails', async () => {
    mockApi.put.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    await act(async () => { await result.current.changeLanguage('he'); });
    expect(result.current.language).toBe('he');
  });

  it('triggers RTL reload on native when switching to Hebrew', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    await act(async () => { await result.current.changeLanguage('he'); });
    expect(mockUpdates.reloadAsync).toHaveBeenCalled();
  });

  it('continues silently when Updates.reloadAsync throws', async () => {
    mockUpdates.reloadAsync.mockRejectedValue(new Error('not supported'));
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    await act(async () => { await result.current.changeLanguage('he'); });
    expect(result.current.language).toBe('he');
  });

  it('skips RTL reload when needsRTLChange is false (same direction)', async () => {
    // I18nManager.isRTL stays false in Jest; calling 'en' keeps it false !== false = false
    const { result } = renderHook(() => useLanguage(), { wrapper });
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    await act(async () => { await result.current.changeLanguage('en'); });
    expect(result.current.language).toBe('en');
    expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
  });

  it('recovers gracefully if AsyncStorage.getItem rejects on mount', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('storage unavailable'));
    const { result } = renderHook(() => useLanguage(), { wrapper });
    // Should silently catch and leave language as 'en'
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.language).toBe('en');
  });
});
