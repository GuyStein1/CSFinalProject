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

// --- Privacy offset: shift task markers by up to 50 m so the exact address is hidden ---
// Uses a simple hash of the task ID to produce a deterministic angle + distance.
const OFFSET_MAX_METERS = 50;
const METERS_PER_DEG_LAT = 111_320; // roughly constant

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned
}

function applyPrivacyOffset(lat: number, lng: number, taskId: string): { lat: number; lng: number } {
  const h = hashCode(taskId);
  // Derive angle (0–2π) and distance (10–50 m) from the hash
  const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2;
  const distance = 10 + ((h >>> 16) / 0xffff) * (OFFSET_MAX_METERS - 10);

  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const dLat = (Math.sin(angle) * distance) / METERS_PER_DEG_LAT;
  const dLng = (Math.cos(angle) * distance) / metersPerDegLng;

  return { lat: lat + dLat, lng: lng + dLng };
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

      const nextTasks = (response.data.tasks ?? []).map((task: ApiTask): DiscoveryTask => {
        const offset = applyPrivacyOffset(Number(task.lat), Number(task.lng), task.id);
        return {
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
        lat: offset.lat,
        lng: offset.lng,
        distanceKm: Number(task.distance_km),
        bidCount: Number(task.bid_count ?? 0),
      };
      });

      setTasks(nextTasks);
    } catch (nextError) {
      const status = getErrorStatus(nextError);
      const message = getErrorMessage(nextError);

      if (status === 401) {
        setError('Sign in is required before nearby jobs can load.');
      } else if (message === 'Network Error') {
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
