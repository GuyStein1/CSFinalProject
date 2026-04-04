import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosInstance';

export type Category =
  | 'ELECTRICITY'
  | 'PLUMBING'
  | 'CARPENTRY'
  | 'PAINTING'
  | 'MOVING'
  | 'GENERAL';

export interface DiscoveryTask {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  mediaUrls: string[];
  category: Category;
  suggestedPrice: number | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  generalLocationName: string;
  isPaymentConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  lat: number;
  lng: number;
  distanceKm: number;
  bidCount: number;
}

interface UseTasksParams {
  lat?: number | null;
  lng?: number | null;
  radius?: number;
  category?: Category | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  limit?: number;
  enabled?: boolean;
}

type ApiTask = {
  id: string;
  requester_id: string;
  title: string;
  description: string;
  media_urls: string[];
  category: Category;
  suggested_price: number | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  general_location_name: string;
  is_payment_confirmed: boolean;
  created_at: string;
  updated_at: string;
  lat: number;
  lng: number;
  distance_km: number;
  bid_count: number;
};

export default function useTasks({
  lat,
  lng,
  radius = 10,
  category = null,
  minPrice = null,
  maxPrice = null,
  limit = 20,
  enabled = true,
}: UseTasksParams) {
  const [tasks, setTasks] = useState<DiscoveryTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = enabled && typeof lat === 'number' && typeof lng === 'number';

  const queryParams = useMemo(
    () => ({
      lat,
      lng,
      radius,
      category: category ?? undefined,
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      limit,
    }),
    [category, lat, limit, lng, maxPrice, minPrice, radius]
  );

  const fetchTasks = useCallback(async () => {
    if (!canFetch) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/tasks', {
        params: queryParams,
      });

      const nextTasks = (response.data.tasks ?? []).map((task: ApiTask): DiscoveryTask => ({
        id: task.id,
        requesterId: task.requester_id,
        title: task.title,
        description: task.description,
        mediaUrls: task.media_urls ?? [],
        category: task.category,
        suggestedPrice: task.suggested_price,
        status: task.status,
        generalLocationName: task.general_location_name,
        isPaymentConfirmed: task.is_payment_confirmed,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        lat: Number(task.lat),
        lng: Number(task.lng),
        distanceKm: Number(task.distance_km),
        bidCount: Number(task.bid_count ?? 0),
      }));

      setTasks(nextTasks);
    } catch {
      setError('Failed to load nearby tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [canFetch, queryParams]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
  };
}
