import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

export const FIXER_NOTIF_TYPES = ['BID_ACCEPTED', 'BID_REJECTED', 'TASK_COMPLETED', 'TASK_CANCELED'];
export const REQUESTER_NOTIF_TYPES = ['NEW_BID'];

interface NotificationContextValue {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  unreadCount: (typeFilter?: string[]) => number;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  getFiltered: (typeFilter?: string[]) => AppNotification[];
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL = 30_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/notifications', { params: { limit: 50 } });
      setNotifications(res.data.notifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.put('/api/notifications/read-all');
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const deleteOne = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/api/notifications/${id}`);
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const deleteAll = useCallback(async () => {
    setNotifications([]);
    try {
      await api.delete('/api/notifications');
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const unreadCount = useCallback(
    (typeFilter?: string[]) => {
      const filtered = typeFilter
        ? notifications.filter((n) => typeFilter.includes(n.type))
        : notifications;
      return filtered.filter((n) => !n.is_read).length;
    },
    [notifications],
  );

  const getFiltered = useCallback(
    (typeFilter?: string[]) => {
      return typeFilter
        ? notifications.filter((n) => typeFilter.includes(n.type))
        : notifications;
    },
    [notifications],
  );

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, loading, error, unreadCount, refetch: fetchNotifications, markAsRead, markAllAsRead, deleteOne, deleteAll, getFiltered }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}
