import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { useIdleTimer } from '../hooks/useIdleTimer';
import { FButton } from './ui';
import { brandColors, radii, spacing, typography } from '../theme';

const IDLE_MS = 28 * 60 * 1000;
const WARNING_S = 120;

export default function IdleLogoutWarning({ onLogout }: { onLogout: () => void }) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_S);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWarning = useCallback(() => {
    setSecondsLeft(WARNING_S);
    setShowWarning(true);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          onLogout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [onLogout]);

  const { reset } = useIdleTimer({
    onIdle: startWarning,
    timeoutMs: IDLE_MS,
    enabled: !showWarning,
  });

  const extend = useCallback(() => {
    setShowWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    reset();
  }, [reset]);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Portal>
      <Modal
        visible={showWarning}
        dismissable={false}
        contentContainerStyle={{
          marginHorizontal: spacing.xl,
          borderRadius: radii.xl,
          backgroundColor: brandColors.surface,
          padding: spacing.xl,
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: 'center' }]}>
          Session Expiring
        </Text>
        <Text style={[typography.body, { color: brandColors.textSecondary, textAlign: 'center' }]}>
          {"You've been inactive. You'll be logged out in "}
          <Text style={{ fontWeight: '700', color: brandColors.danger }}>
            {mins}:{secs}
          </Text>
          {' to protect your account.'}
        </Text>
        <View style={{ width: '100%' }}>
          <FButton onPress={extend} fullWidth>
            Stay Logged In
          </FButton>
        </View>
      </Modal>
    </Portal>
  );
}
