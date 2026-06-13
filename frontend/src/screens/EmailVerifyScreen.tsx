import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendEmailVerification } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../config/firebase';
import { FButton } from '../components/ui';
import { brandColors, spacing, typography } from '../theme';

interface Props {
  email: string | null;
  onRecheck: () => Promise<void>;
  onLogOut: () => void;
}

export default function EmailVerifyScreen({ email, onRecheck, onLogOut }: Props) {
  const { t } = useTranslation();
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setResent(true);
    } catch {
      // silently fail — Firebase rate-limits this anyway
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="email-check-outline" size={64} color={brandColors.primary} />
        <Text style={[typography.h2, styles.title]}>{t('auth.emailVerify.title')}</Text>
        <Text style={[typography.body, styles.message]}>
          {t('auth.emailVerify.message', { email: email ?? '' })}
        </Text>

        <FButton
          onPress={() => void handleRecheck()}
          disabled={checking}
          style={styles.primaryBtn}
        >
          {checking ? t('common.loading') : t('auth.emailVerify.checkButton')}
        </FButton>

        <FButton
          onPress={() => void handleResend()}
          variant="outline"
          disabled={resent}
          style={styles.secondaryBtn}
        >
          {resent ? t('auth.emailVerify.resent') : t('auth.emailVerify.resend')}
        </FButton>

        <FButton
          onPress={onLogOut}
          variant="ghost"
          style={styles.signOutBtn}
        >
          {t('auth.emailVerify.signOut')}
        </FButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.background,
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    padding: spacing.xl,
    backgroundColor: brandColors.surface,
    borderRadius: 16,
    gap: spacing.md,
  },
  title: {
    color: brandColors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  message: {
    color: brandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
  secondaryBtn: {
    width: '100%',
  },
  signOutBtn: {
    width: '100%',
  },
});
