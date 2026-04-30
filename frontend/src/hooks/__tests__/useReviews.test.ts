import { renderHook, waitFor } from '@testing-library/react-native';
import useReviews from '../useReviews';
import api from '../../api/axiosInstance';

const mockApi = api as jest.Mocked<typeof api>;

const makeReview = (id = 'r1') => ({
  id,
  task_id: 'task-1',
  reviewer_id: 'user-2',
  reviewee_id: 'user-1',
  rating: 4,
  comment: 'Great work!',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { reviews: [], total: 0 } });
});

describe('useReviews', () => {
  it('fetches reviews for the given userId', async () => {
    const reviews = [makeReview('r1'), makeReview('r2')];
    mockApi.get.mockResolvedValue({ data: { reviews, total: 2 } });

    const { result } = renderHook(() => useReviews({ userId: 'user-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/users/user-1/reviews',
      expect.objectContaining({ params: { limit: 50 } }),
    );
    expect(result.current.reviews).toHaveLength(2);
    expect(result.current.total).toBe(2);
  });

  it('does not fetch when userId is an empty string', async () => {
    const { result } = renderHook(() => useReviews({ userId: '' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).not.toHaveBeenCalled();
    expect(result.current.reviews).toHaveLength(0);
  });

  it('does not fetch when enabled=false', async () => {
    const { result } = renderHook(() => useReviews({ userId: 'user-1', enabled: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('sets error state on API failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => useReviews({ userId: 'user-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network failure');
    expect(result.current.reviews).toHaveLength(0);
  });

  it('sets total from response', async () => {
    mockApi.get.mockResolvedValue({ data: { reviews: [makeReview()], total: 42 } });
    const { result } = renderHook(() => useReviews({ userId: 'user-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(42);
  });
});
