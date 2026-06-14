import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUnreadMessages } from '../useUnreadMessages';
import api from '../../api/axiosInstance';

const mockApi = api as jest.Mocked<typeof api>;

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true,
};

jest.mock('../../utils/socket', () => ({
  getSocket: () => Promise.resolve(mockSocket),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { conversations: [] } });
});

describe('useUnreadMessages', () => {
  it('returns 0 when there are no conversations', async () => {
    mockApi.get.mockResolvedValue({ data: { conversations: [] } });

    const { result } = renderHook(() => useUnreadMessages());
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/api/conversations', { params: {} }));

    expect(result.current.unreadCount).toBe(0);
  });

  it('counts conversations with unread messages from IN_PROGRESS tasks', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        conversations: [
          { taskId: 't1', unreadCount: 3, taskStatus: 'IN_PROGRESS' },
          { taskId: 't2', unreadCount: 5, taskStatus: 'IN_PROGRESS' },
          { taskId: 't3', unreadCount: 0, taskStatus: 'IN_PROGRESS' },
        ],
      },
    });

    const { result } = renderHook(() => useUnreadMessages());
    // 2 conversations with unread (t1, t2), not sum of messages (8)
    await waitFor(() => expect(result.current.unreadCount).toBe(2));
  });

  it('excludes non-IN_PROGRESS conversations from count', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        conversations: [
          { taskId: 't1', unreadCount: 3, taskStatus: 'IN_PROGRESS' },
          { taskId: 't2', unreadCount: 5, taskStatus: 'COMPLETED' },
          { taskId: 't3', unreadCount: 2, taskStatus: 'CANCELED' },
          { taskId: 't4', unreadCount: 4, taskStatus: 'OPEN' },
        ],
      },
    });

    const { result } = renderHook(() => useUnreadMessages());
    // Only t1 is IN_PROGRESS with unread → 1 conversation
    await waitFor(() => expect(result.current.unreadCount).toBe(1));
  });

  it('refetch function updates the count', async () => {
    mockApi.get.mockResolvedValue({ data: { conversations: [{ taskId: 't1', unreadCount: 2, taskStatus: 'IN_PROGRESS' }] } });

    const { result } = renderHook(() => useUnreadMessages());
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    mockApi.get.mockResolvedValue({ data: { conversations: [{ taskId: 't1', unreadCount: 0, taskStatus: 'IN_PROGRESS' }] } });
    await act(async () => { await result.current.refetch(); });

    expect(result.current.unreadCount).toBe(0);
  });

  it('handles API errors gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUnreadMessages());
    await waitFor(() => expect(mockApi.get).toHaveBeenCalled());

    expect(result.current.unreadCount).toBe(0);
  });

  it('listens to socket events for real-time updates', async () => {
    mockApi.get.mockResolvedValue({ data: { conversations: [{ taskId: 't1', unreadCount: 1 }] } });

    renderHook(() => useUnreadMessages());
    await waitFor(() => expect(mockSocket.on).toHaveBeenCalled());

    const eventNames = mockSocket.on.mock.calls.map((call: [string, unknown]) => call[0]);
    expect(eventNames).toContain('receive_message');
    expect(eventNames).toContain('messages_read');
  });
});
