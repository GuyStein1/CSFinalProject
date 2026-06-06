import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../api/axiosInstance';
import { FButton } from './ui';
import { brandColors, radii, spacing, typography } from '../theme';

const DISMISSED_KEY = 'onboarding_nudge_dismissed';

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone_number: string | null;
}

export default function OnboardingNudge() {
  const [visible, setVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  useEffect(() => {
    // Delay so the app has time to fully render before showing the modal
    const timer = setTimeout(async () => {
      try {
        const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
        if (dismissed) return;

        const res = await api.get('/api/users/me');
        const user: UserProfile = res.data.user;

        // Profile is "incomplete" if missing all three: avatar, bio, and phone
        const isIncomplete = !user.avatar_url && !user.bio && !user.phone_number;
        if (isIncomplete) {
          setVisible(true);
        } else {
          // Profile is already complete, don't show again
          await AsyncStorage.setItem(DISMISSED_KEY, 'true');
        }
      } catch {
        // non-fatal
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(DISMISSED_KEY, 'true');
  };

  const goToProfile = async () => {
    setVisible(false);
    await AsyncStorage.setItem(DISMISSED_KEY, 'true');
    navigation.navigate('Settings');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="account-edit-outline" size={32} color={brandColors.primary} />
          </View>
          <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: 'center' }]}>
            {t('onboarding.title')}
          </Text>
          <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center' }]}>
            {t('onboarding.message')}
          </Text>
          <FButton onPress={goToProfile} fullWidth icon="account-cog-outline">
            {t('onboarding.completeProfile')}
          </FButton>
          <FButton variant="ghost" onPress={dismiss} fullWidth>
            {t('onboarding.later')}
          </FButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: brandColors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } : {}),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
