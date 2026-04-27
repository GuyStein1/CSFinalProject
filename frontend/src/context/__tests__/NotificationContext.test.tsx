import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NotificationProvider, useNotificationContext } from '../NotificationContext';
import api from '../../api/axiosInstance';

const mockApi = api as jest.Mocked<typeof api>;

const makeNotif = (overrides: Partial<{ id: string; type: string; is_read: boolean }> = {}) => ({
  id: overrides.id ?? 'n1',
  user_id: 'u1',
  title: 'Hello',
  body: 'World',
  type: overrides.type ?? 'NEW_BID',
  related_entity_id: 'task-1',
  related_entity_type: 'Task',
  is_read: overrides.is_read ?? false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { notifications: [] } });
  mockApi.put.mockResolvedValue({});
  mockApi.delete.mockResolvedValue({});
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NotificationContext', () => {
  it('fetches notifications on mount', async () => {
    const notifs = [makeNotif({ id: 'n1' }), makeNotif({ id: 'n2' })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);
  });

  it('provides unreadCount that counts unread notifications', async () => {
    const notifs = [
      makeNotif({ id: 'n1', is_read: false }),
      makeNotif({ id: 'n2', is_read: true }),
      makeNotif({ id: 'n3', is_read: false }),
    ];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount()).toBe(2);
  });

  it('unreadCount filters by type when typeFilter provided', async () => {
    const notifs = [
      makeNotif({ id: 'n1', type: 'BID_ACCEPTED', is_read: false }),
      makeNotif({ id: 'n2', type: 'NEW_BID', is_read: false }),
    ];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount(['BID_ACCEPTED'])).toBe(1);
  });

  it('markAsRead calls PUT and sets is_read optimistically', async () => {
    const notifs = [makeNotif({ id: 'n1', is_read: false })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.markAsRead('n1'); });
    expect(mockApi.put).toHaveBeenCalledWith('/api/notifications/n1/read');
    expect(result.current.notifications.find((n) => n.id === 'n1')?.is_read).toBe(true);
  });

  it('markAllAsRead calls PUT and marks all as read', async () => {
    const notifs = [makeNotif({ id: 'n1', is_read: false }), makeNotif({ id: 'n2', is_read: false })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.markAllAsRead(); });
    expect(mockApi.put).toHaveBeenCalledWith('/api/notifications/read-all');
    expect(result.current.notifications.every((n) => n.is_read)).toBe(true);
  });

  it('deleteOne removes the notification from the list', async () => {
    const notifs = [makeNotif({ id: 'n1' }), makeNotif({ id: 'n2' })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.deleteOne('n1'); });
    expect(mockApi.delete).toHaveBeenCalledWith('/api/notifications/n1');
    expect(result.current.notifications.find((n) => n.id === 'n1')).toBeUndefined();
  });

  it('polls with setInterval every 30 seconds', async () => {
    mockApi.get.mockResolvedValue({ data: { notifications: [] } });
    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callsBefore = mockApi.get.mock.calls.length;
    act(() => { jest.advanceTimersByTime(30_000); });
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('deleteAll removes all notifications and calls DELETE /api/notifications', async () => {
    const notifs = [makeNotif({ id: 'n1' }), makeNotif({ id: 'n2' })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.deleteAll(); });
    expect(mockApi.delete).toHaveBeenCalledWith('/api/notifications');
    expect(result.current.notifications).toHaveLength(0);
  });

  it('getFiltered returns only notifications matching the typeFilter', async () => {
    const notifs = [
      makeNotif({ id: 'n1', type: 'NEW_BID' }),
      makeNotif({ id: 'n2', type: 'BID_ACCEPTED' }),
      makeNotif({ id: 'n3', type: 'NEW_BID' }),
    ];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const filtered = result.current.getFiltered(['NEW_BID']);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((n) => n.type === 'NEW_BID')).toBe(true);
  });

  it('getFiltered with no filter returns all notifications', async () => {
    const notifs = [makeNotif({ id: 'n1' }), makeNotif({ id: 'n2' })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs } });

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getFiltered()).toHaveLength(2);
  });

  it('sets error state when fetch fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.notifications).toHaveLength(0);
  });

  it('throws when used outside NotificationProvider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useNotificationContext())).toThrow();
    spy.mockRestore();
  });
});
