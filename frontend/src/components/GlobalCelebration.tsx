import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useNotificationContext } from '../context/NotificationContext';
import CelebrationOverlay from './CelebrationOverlay';

/**
 * Global celebration that fires a confetti overlay whenever the fixer
 * receives a BID_ACCEPTED notification, regardless of which screen they
 * are on. Persists "seen" notification IDs in localStorage (web) so the
 * effect does not re-fire on refresh, but WILL fire on the next login
 * for any BID_ACCEPTED notifications that arrived while the user was
 * logged out.
 */

const STORAGE_KEY = 'fixit:celebrated_bid_ids';

function loadSeenIds(): Set<string> {
  if (Platform.OS !== 'web') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  if (Platform.OS !== 'web') return;
  try {
    // Cap the stored array to avoid unbounded growth.
    const arr = Array.from(ids).slice(-200);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore quota / access errors
  }
}

export default function GlobalCelebration() {
  const { notifications } = useNotificationContext();
  const seenRef = useRef<Set<string>>(loadSeenIds());
  const [fire, setFire] = useState(false);

  useEffect(() => {
    // Find BID_ACCEPTED notifications we haven't celebrated yet.
    const unseen = notifications.filter(
      (n) => n.type === 'BID_ACCEPTED' && !seenRef.current.has(n.id),
    );
    if (unseen.length === 0) return;

    // Mark them all as seen and persist.
    unseen.forEach((n) => seenRef.current.add(n.id));
    saveSeenIds(seenRef.current);

    // Trigger confetti (single shot — additional accepts during the
    // animation will simply be marked seen without re-triggering).
    setFire(true);
  }, [notifications]);

  return <CelebrationOverlay fire={fire} onComplete={() => setFire(false)} />;
}
