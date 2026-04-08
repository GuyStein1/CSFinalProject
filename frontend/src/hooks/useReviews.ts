import { useCallback, useEffect, useState } from 'react';
import api from '../api/axiosInstance';

export interface Review {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: { id: string; full_name: string };
  task?: { id: string; title: string };
}

interface UseReviewsParams {
  userId: string;
  enabled?: boolean;
}

export default function useReviews({ userId, enabled = true }: UseReviewsParams) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!enabled || !userId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/api/users/${userId}/reviews`, {
        params: { limit: 50 },
      });
      setReviews(res.data.reviews ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load reviews.';
      setError(msg);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, total, loading, error, refetch: fetchReviews };
}
