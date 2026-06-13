import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendEmailVerification } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../config/firebase';
import { useLanguage } from '../context/LanguageContext';
import { FButton } from '../components/ui';
import { brandColors, spacing, typography } from '../theme';

interface Props {
  email: string | null;
  onRecheck: () => Promise<boolean>;
  onLogOut: () => void;
}

export default function EmailVerifyScreen({ email, onRecheck, onLogOut }: Props) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const COOLDOWN_SECONDS = 30;

  const handleResend = async () => {
    if (!auth.currentUser || cooldown > 0) return;
    try {
      await sendEmailVerification(auth.currentUser);
      const msg = t('auth.emailVerify.resentMessage');
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('', msg);
      }
      setCooldown(COOLDOWN_SECONDS);
      timerRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('', msg);
      }
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    try {
      const verified = await onRecheck();
      if (!verified) {
        const msg = t('auth.emailVerify.notVerifiedYet');
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('', msg);
        }
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = () => {
    const msg = t('auth.emailVerify.signOutConfirmMessage');
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        onLogOut();
      }
    } else {
      Alert.alert('', msg, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.emailVerify.signOut'), style: 'destructive', onPress: onLogOut },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="email-check-outline" size={64} color={brandColors.primary} />
        <Text style={[typography.h2, styles.title]}>{t('auth.emailVerify.title')}</Text>
        <Text style={[typography.body, styles.message, isRTL && { writingDirection: 'rtl' }]}>
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
          disabled={cooldown > 0}
          style={styles.secondaryBtn}
        >
          {cooldown > 0 ? `${t('auth.emailVerify.resent')} (${cooldown}s)` : t('auth.emailVerify.resend')}
        </FButton>

        <FButton
          onPress={handleSignOut}
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
