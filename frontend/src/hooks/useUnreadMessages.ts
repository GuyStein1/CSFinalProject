import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axiosInstance';
import { getSocket } from '../utils/socket';
import { auth } from '../config/firebase';

const POLL_INTERVAL = 5_000;

/**
 * Tracks total unread message count across conversations.
 * Accepts an optional mode ('requester' | 'fixer') to filter by role.
 * Refreshes on socket `receive_message` events and periodically.
 */
export function useUnreadMessages(mode?: 'requester' | 'fixer') {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const params: Record<string, string> = {};
      if (mode) params.mode = mode;
      const res = await api.get('/api/conversations', { params });
      const conversations: { unreadCount: number; taskStatus?: string }[] = res.data.conversations ?? [];
      // Count conversations with unread messages (not individual messages)
      // so multiple messages from the same person count as one badge unit
      const total = conversations
        .filter((c) => c.taskStatus === 'IN_PROGRESS' && c.unreadCount > 0)
        .length;
      setUnreadCount(total);
    } catch {
      // non-fatal
    }
  }, [mode]);

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
