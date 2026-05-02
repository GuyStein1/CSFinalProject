import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axiosInstance';
import { getSocket } from '../utils/socket';
import { auth } from '../config/firebase';

const POLL_INTERVAL = 30_000;

/**
 * Tracks total unread message count across all conversations.
 * Refreshes on socket `receive_message` events and periodically.
 */
export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const res = await api.get('/api/conversations');
      const conversations: { unreadCount: number }[] = res.data.conversations ?? [];
      const total = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCount(total);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    void fetch();

    intervalRef.current = setInterval(() => void fetch(), POLL_INTERVAL);

    // Listen for new messages to refresh count
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    void (async () => {
      if (!auth.currentUser) return;
      socket = await getSocket();
      socket.on('receive_message', () => void fetch());
      socket.on('messages_read', () => void fetch());
    })();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket?.off('receive_message');
      socket?.off('messages_read');
    };
  }, [fetch]);

  return { unreadCount, refetch: fetch };
}
