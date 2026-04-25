import { renderHook, act, waitFor } from '@testing-library/react-native';
import useNotifications, { FIXER_NOTIF_TYPES, REQUESTER_NOTIF_TYPES } from '../useNotifications';
import api from '../../api/axiosInstance';

const mockApi = api as jest.Mocked<typeof api>;

const makeNotification = (overrides: Partial<{
  id: string; type: string; is_read: boolean;
}> = {}) => ({
  id: overrides.id ?? 'notif-1',
  user_id: 'user-1',
  title: 'Test',
  body: 'Test body',
  type: overrides.type ?? 'NEW_BID',
  related_entity_id: 'task-1',
  related_entity_type: 'Task',
  is_read: overrides.is_read ?? false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { notifications: [], total: 0 } });
});

describe('useNotifications', () => {
  it('starts with loading=true while fetching', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);
  });

  it('populates notifications after successful fetch', async () => {
    const notifs = [makeNotification({ id: 'n1' }), makeNotification({ id: 'n2' })];
    mockApi.get.mockResolvedValue({ data: { notifications: notifs, total: 2 } });

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.total).toBe(2);
  });

  it('does not fetch when enabled=false', async () => {
    const { result } = renderHook(() => useNotifications({ enabled: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  describe('typeFilter', () => {
    it('returns only matching type notifications', async () => {
      const notifs = [
        makeNotification({ id: 'n1', type: 'BID_ACCEPTED' }),
        makeNotification({ id: 'n2', type: 'NEW_BID' }),
      ];
      mockApi.get.mockResolvedValue({ data: { notifications: notifs, total: 2 } });

      const { result } = renderHook(() => useNotifications({ typeFilter: FIXER_NOTIF_TYPES }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('BID_ACCEPTED');
    });

    it('REQUESTER_NOTIF_TYPES filters NEW_BID only', async () => {
      const notifs = [
        makeNotification({ id: 'n1', type: 'NEW_BID' }),
        makeNotification({ id: 'n2', type: 'BID_ACCEPTED' }),
      ];
      mockApi.get.mockResolvedValue({ data: { notifications: notifs, total: 2 } });

      const { result } = renderHook(() => useNotifications({ typeFilter: REQUESTER_NOTIF_TYPES }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.notifications.every((n) => n.type === 'NEW_BID')).toBe(true);
    });
  });

  describe('unreadCount', () => {
    it('counts only unread notifications', async () => {
      const notifs = [
        makeNotification({ id: 'n1', is_read: false }),
        makeNotification({ id: 'n2', is_read: true }),
        makeNotification({ id: 'n3', is_read: false }),
      ];
      mockApi.get.mockResolvedValue({ data: { notifications: notifs, total: 3 } });

      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.unreadCount).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('optimistically sets is_read=true before the API call resolves', async () => {
      const notif = makeNotification({ id: 'n1', is_read: false });
      mockApi.get.mockResolvedValue({ data: { notifications: [notif], total: 1 } });
      mockApi.put.mockResolvedValue({});

      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { void result.current.markAsRead('n1'); });
      expect(result.current.notifications.find((n) => n.id === 'n1')?.is_read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      const notifs = [
        makeNotification({ id: 'n1', is_read: false }),
        makeNotification({ id: 'n2', is_read: false }),
      ];
      mockApi.get.mockResolvedValue({ data: { notifications: notifs, total: 2 } });
      mockApi.put.mockResolvedValue({});

      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.markAllAsRead(); });
      expect(result.current.notifications.every((n) => n.is_read)).toBe(true);
    });
  });
});
