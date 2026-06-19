import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function useIdleTimer({
  onIdle,
  timeoutMs,
  enabled,
}: {
  onIdle: () => void;
  timeoutMs: number;
  enabled: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onIdle, timeoutMs);
  }, [onIdle, timeoutMs]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset, enabled]);

  return { reset };
}
