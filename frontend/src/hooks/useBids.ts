import { useCallback, useEffect, useState } from 'react';
import api from '../api/axiosInstance';

export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface BidTask {
  id: string;
  title: string;
  category: string;
  status: string;
  suggested_price: number | null;
  general_location_name: string;
}

export interface UserBid {
  id: string;
  task_id: string;
  offered_price: number;
  description: string;
  status: BidStatus;
  created_at: string;
  task: BidTask;
}

interface UseBidsOptions {
  status?: BidStatus | null;
  enabled?: boolean;
}

export default function useBids({ status = null, enabled = true }: UseBidsOptions = {}) {
  const [bids, setBids] = useState<UserBid[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBids = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { limit: '50' };
      if (status) params.status = status;

      const res = await api.get('/api/users/me/bids', { params });
      setBids(res.data.bids ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setError('Failed to load your bids.');
    } finally {
      setLoading(false);
    }
  }, [status, enabled]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const updateBidLocally = useCallback((bidId: string, newStatus: BidStatus) => {
    setBids((prev) => {
      const updated = prev.map((b) => (b.id === bidId ? { ...b, status: newStatus } : b));
      // If filtering by status, remove bids that no longer match
      if (status) {
        return updated.filter((b) => b.status === status);
      }
      return updated;
    });
  }, [status]);

  const removeBidLocally = useCallback((bidId: string) => {
    setBids((prev) => prev.filter((b) => b.id !== bidId));
  }, []);

  return { bids, total, loading, error, refetch: fetchBids, updateBidLocally, removeBidLocally };
}
