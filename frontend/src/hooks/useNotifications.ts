import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axiosInstance';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// Notification types sent to fixers vs requesters
export const FIXER_NOTIF_TYPES = ['BID_ACCEPTED', 'BID_REJECTED', 'TASK_COMPLETED', 'TASK_CANCELED'];
export const REQUESTER_NOTIF_TYPES = ['NEW_BID'];

interface UseNotificationsParams {
  enabled?: boolean;
  /** Only count/show notifications whose type is in this list */
  typeFilter?: string[];
  /** Poll interval in ms (0 = no polling) */
  pollInterval?: number;
}

export default function useNotifications({
  enabled = true,
  typeFilter,
  pollInterval = 0,
}: UseNotificationsParams = {}) {
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifications = typeFilter
    ? allNotifications.filter((n) => typeFilter.includes(n.type))
    : allNotifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/api/notifications', {
        params: { limit: 50 },
      });
      setAllNotifications(res.data.notifications ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load notifications.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const markAsRead = useCallback(async (id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.put('/api/notifications/read-all');
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (pollInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchNotifications, pollInterval);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [pollInterval, enabled, fetchNotifications]);

  return {
    notifications,
    total,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
