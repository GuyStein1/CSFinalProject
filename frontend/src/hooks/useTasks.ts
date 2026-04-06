import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosInstance';

export type Category =
  | 'ASSEMBLY'
  | 'MOUNTING'
  | 'MOVING'
  | 'PAINTING'
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'OUTDOORS'
  | 'CLEANING';

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

// Dev-only mock tasks shown when the real backend returns 0 results.
// Placed relative to the provided center so they always appear on screen.
// Remove or disable once the DB is seeded (`cd backend && npx ts-node prisma/seed.ts`).
function makeMockTasks(lat: number, lng: number): DiscoveryTask[] {
  if (!__DEV__) return [];
  const now = new Date().toISOString();
  const base = { mediaUrls: [] as string[], status: 'OPEN' as const, isPaymentConfirmed: false, createdAt: now, updatedAt: now };
  return [
    { ...base, id: 'mock-1', requesterId: 'u1', title: 'Assemble IKEA wardrobe', description: 'Large PAX wardrobe, 2 doors', category: 'ASSEMBLY', suggestedPrice: 150, generalLocationName: 'Nearby', lat: lat + 0.003, lng: lng + 0.002, distanceKm: 0.4, bidCount: 2 },
    { ...base, id: 'mock-2', requesterId: 'u2', title: 'Fix leaking kitchen sink', description: 'Dripping tap, needs new washer', category: 'PLUMBING', suggestedPrice: 200, generalLocationName: 'Nearby', lat: lat - 0.004, lng: lng + 0.005, distanceKm: 0.7, bidCount: 0 },
    { ...base, id: 'mock-3', requesterId: 'u3', title: 'Paint living room walls', description: 'Two walls ~20m², white paint supplied', category: 'PAINTING', suggestedPrice: 400, generalLocationName: 'Nearby', lat: lat + 0.006, lng: lng - 0.003, distanceKm: 0.9, bidCount: 1 },
    { ...base, id: 'mock-4', requesterId: 'u1', title: 'Help moving boxes to 3rd floor', description: '20 boxes, no elevator', category: 'MOVING', suggestedPrice: 250, generalLocationName: 'Nearby', lat: lat - 0.002, lng: lng - 0.006, distanceKm: 0.6, bidCount: 3 },
    { ...base, id: 'mock-5', requesterId: 'u2', title: 'Replace ceiling light fixture', description: 'Swap old lamp for new pendant light', category: 'ELECTRICITY', suggestedPrice: 180, generalLocationName: 'Nearby', lat: lat + 0.001, lng: lng + 0.008, distanceKm: 1.2, bidCount: 0 },
  ];
}

function getErrorStatus(error: unknown) {
  const response = (error as { response?: { status?: unknown } } | null)?.response;
  return typeof response?.status === 'number' ? response.status : null;
}

function getErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { error?: { message?: unknown } } } } | null)?.response;
  const message = response?.data?.error?.message;

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  return error instanceof Error ? error.message : null;
}

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

      setTasks(nextTasks.length > 0 ? nextTasks : makeMockTasks(lat as number, lng as number));
    } catch (nextError) {
      const status = getErrorStatus(nextError);
      const message = getErrorMessage(nextError);

      if (status === 401) {
        setError('Sign in is required before nearby jobs can load.');
      } else if (message === 'Network Error') {
        if (__DEV__) {
          setTasks(makeMockTasks(lat as number, lng as number));
          setError(null);
          return;
        }
        setError('Could not reach the backend. Check your local API server.');
      } else if (message) {
        setError(message);
      } else {
        setError('Failed to load nearby tasks.');
      }
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
