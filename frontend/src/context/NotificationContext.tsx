import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/axiosInstance';
import { getSocket } from '../utils/socket';
import { auth } from '../config/firebase';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  user_role: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const FIXER_NOTIF_TYPES = [
  'BID_ACCEPTED', 'BID_REJECTED',
  'TASK_COMPLETED', 'TASK_CANCELED',
  'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED',
  'CERTIFICATION_APPROVED', 'CERTIFICATION_REJECTED',
  'NEW_MESSAGE',
];
export const REQUESTER_NOTIF_TYPES = [
  'NEW_BID', 'BID_WITHDRAWN',
  'TASK_COMPLETED', 'TASK_CANCELED',
  'NEW_MESSAGE',
];

interface NotificationContextValue {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  unreadCount: (typeFilter?: string[], roleFilter?: string) => number;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (mode?: string) => Promise<void>;
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

  const markAllAsRead = useCallback(async (mode?: string) => {
    setNotifications((prev) => prev.map((n) => {
      if (mode && n.user_role !== null && n.user_role !== mode) return n;
      return { ...n, is_read: true };
    }));
    try {
      const params: Record<string, string> = {};
      if (mode) params.mode = mode;
      await api.put('/api/notifications/read-all', null, { params });
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
    (typeFilter?: string[], roleFilter?: string) => {
      let filtered = typeFilter
        ? notifications.filter((n) => typeFilter.includes(n.type))
        : notifications;
      if (roleFilter) {
        filtered = filtered.filter((n) => n.user_role === roleFilter || n.user_role === null);
      }
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

  // Global socket listener — refresh bell badge instantly on notification_update
  // (sent to the user's personal room) or on any incoming message.
  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const socket = await getSocket();
      const notifHandler = () => {
        if (mounted) void fetchNotifications();
      };
      const msgHandler = (msg: { sender?: { firebase_uid?: string } }) => {
        const sentByMe = msg?.sender?.firebase_uid === auth.currentUser?.uid;
        if (mounted && !sentByMe) void fetchNotifications();
      };
      socket.on('notification_update', notifHandler);
      socket.on('receive_message', msgHandler);
      cleanup = () => {
        socket.off('notification_update', notifHandler);
        socket.off('receive_message', msgHandler);
      };
    })();

    return () => {
      mounted = false;
      cleanup?.();
    };
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
