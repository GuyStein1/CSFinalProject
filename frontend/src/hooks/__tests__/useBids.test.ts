import { renderHook, act, waitFor } from '@testing-library/react-native';
import useBids from '../useBids';
import api from '../../api/axiosInstance';

const mockApi = api as jest.Mocked<typeof api>;

const makeBid = (overrides: Partial<{ id: string; status: string }> = {}) => ({
  id: overrides.id ?? 'bid-1',
  task_id: 'task-1',
  offered_price: 100,
  description: 'I can do it.',
  status: overrides.status ?? 'PENDING',
  created_at: new Date().toISOString(),
  task: { id: 'task-1', title: 'Fix sink', category: 'PLUMBING', status: 'OPEN', suggested_price: null, general_location_name: 'Tel Aviv', completed_at: null },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { bids: [], total: 0 } });
});

describe('useBids', () => {
  it('fetches bids on mount', async () => {
    const bids = [makeBid({ id: 'b1' }), makeBid({ id: 'b2' })];
    mockApi.get.mockResolvedValue({ data: { bids, total: 2 } });

    const { result } = renderHook(() => useBids());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bids).toHaveLength(2);
  });

  it('does not fetch when enabled=false', async () => {
    renderHook(() => useBids({ enabled: false }));
    await waitFor(() => {}, { timeout: 100 });
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('passes status filter as query param', async () => {
    mockApi.get.mockResolvedValue({ data: { bids: [], total: 0 } });
    const { result } = renderHook(() => useBids({ status: 'ACCEPTED' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/users/me/bids',
      expect.objectContaining({ params: expect.objectContaining({ status: 'ACCEPTED' }) }),
    );
  });

  describe('updateBidLocally', () => {
    it('updates the status of the matching bid', async () => {
      const bids = [makeBid({ id: 'b1', status: 'PENDING' })];
      mockApi.get.mockResolvedValue({ data: { bids, total: 1 } });

      const { result } = renderHook(() => useBids());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.updateBidLocally('b1', 'ACCEPTED'));
      expect(result.current.bids[0].status).toBe('ACCEPTED');
    });

    it('removes bids that no longer match the status filter', async () => {
      const bids = [makeBid({ id: 'b1', status: 'PENDING' })];
      mockApi.get.mockResolvedValue({ data: { bids, total: 1 } });

      const { result } = renderHook(() => useBids({ status: 'PENDING' }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.updateBidLocally('b1', 'ACCEPTED'));
      expect(result.current.bids).toHaveLength(0);
    });
  });

  describe('removeBidLocally', () => {
    it('removes the bid with the given id from state', async () => {
      const bids = [makeBid({ id: 'b1' }), makeBid({ id: 'b2' })];
      mockApi.get.mockResolvedValue({ data: { bids, total: 2 } });

      const { result } = renderHook(() => useBids());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.removeBidLocally('b1'));
      expect(result.current.bids.find((b) => b.id === 'b1')).toBeUndefined();
      expect(result.current.bids).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('sets a 401-specific error message', async () => {
      mockApi.get.mockRejectedValue({ response: { status: 401 } });
      const { result } = renderHook(() => useBids());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toMatch(/sign in/i);
    });

    it('sets a network error message', async () => {
      mockApi.get.mockRejectedValue({ message: 'Network Error' });
      const { result } = renderHook(() => useBids());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toMatch(/server/i);
    });
  });
});
