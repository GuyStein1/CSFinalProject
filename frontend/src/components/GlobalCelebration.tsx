import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationContext } from '../context/NotificationContext';
import CelebrationOverlay from './CelebrationOverlay';

const STORAGE_KEY = 'fixit:celebrated_bid_ids';

export default function GlobalCelebration() {
  const { notifications } = useNotificationContext();
  const seenRef = useRef<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [fire, setFire] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const arr = JSON.parse(raw) as string[];
            if (Array.isArray(arr)) seenRef.current = new Set(arr);
          } catch { /* ignore malformed data */ }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const unseen = notifications.filter(
      (n) => n.type === 'BID_ACCEPTED' && !seenRef.current.has(n.id),
    );
    if (unseen.length === 0) return;
    unseen.forEach((n) => seenRef.current.add(n.id));
    const arr = Array.from(seenRef.current).slice(-200);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    setFire(true);
  }, [notifications, loaded]);

  return <CelebrationOverlay fire={fire} onComplete={() => setFire(false)} />;
}
