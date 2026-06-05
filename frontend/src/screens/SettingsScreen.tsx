import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, Pressable, Platform } from 'react-native';
import { Text, Switch, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { auth } from '../config/firebase';
import api from '../api/axiosInstance';
import { useLanguage } from '../context/LanguageContext';
import { FButton, FCard, FInput } from '../components/ui';
import { brandColors, radii, spacing, typography } from '../theme';

export default function SettingsScreen() {
  const user = auth.currentUser;
  const { t } = useTranslation();
  const { language, changeLanguage, isRTL } = useLanguage();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const accountName = user?.displayName?.trim() || 'FixIt account';
  const accountEmail = user?.email || 'Not signed in';
  const verificationLabel = user?.emailVerified ? t('settings.hero.verifiedEmail') : t('settings.hero.emailNotVerified');
  const verificationColor = user?.emailVerified ? brandColors.success : brandColors.warning;

  const handleChangePassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert(t('settings.alerts.passwordReset.successTitle'), t('settings.alerts.passwordReset.success'));
    } catch {
      Alert.alert(t('common.error'), t('settings.alerts.passwordReset.error'));
    }
  };

  const handlePushToggle = async (value: boolean) => {
    if (Platform.OS === 'web') {
      // On web, toggle locally (push tokens only work on mobile)
      setPushEnabled(value);
      return;
    }
    if (!value) {
      setPushEnabled(false);
      return;
    }
    setPushLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('settings.alerts.notifications.deniedTitle'), t('settings.alerts.notifications.denied'));
        setPushLoading(false);
        return;
      }
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      await api.post('/api/users/me/push-token', { token: tokenData.data });
      setPushEnabled(true);
      Alert.alert(t('settings.alerts.notifications.enabledTitle'), t('settings.alerts.notifications.enabled'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', msg);
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to log out?')) {
        await signOut(auth);
      }
    } else {
      Alert.alert(t('settings.alerts.logOut.title'), t('settings.alerts.logOut.message'), [
        { text: t('common.cancel') },
        {
          text: t('settings.alerts.logOut.confirm'),
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
          },
        },
      ]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <FCard style={styles.heroCard} shadow="sm">
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="account-cog-outline" size={26} color={brandColors.secondary} />
          </View>
          <View style={styles.heroText}>
            <Text style={[typography.eyebrow, styles.heroEyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.hero.eyebrow')}</Text>
            <Text style={[typography.h2, { color: brandColors.textOnDark, textAlign: isRTL ? 'right' : 'left' }]}>{accountName}</Text>
            <Text style={[typography.bodySm, styles.heroSub, { textAlign: isRTL ? 'right' : 'left' }]}>{accountEmail}</Text>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroPill}>
            <View style={[styles.statusDot, { backgroundColor: verificationColor }]} />
            <Text style={[typography.caption, { color: brandColors.textOnDark }]}>{verificationLabel}</Text>
          </View>
          <View style={styles.heroPill}>
            <MaterialCommunityIcons name="shield-check-outline" size={13} color={brandColors.secondary} />
            <Text style={[typography.caption, { color: brandColors.textOnDark }]}>{t('settings.hero.secureSession')}</Text>
          </View>
        </View>
      </FCard>

      {/* Account Section */}
      <FCard style={styles.sectionCard} shadow="sm">
        <SectionHeader icon="account-outline" label={t('settings.section.account')} />

        <SettingRow
          icon="email-outline"
          label={t('settings.account.email.label')}
          value={accountEmail}
          description={t('settings.account.email.description')}
        />

        <Divider style={styles.divider} />

        <View style={styles.phoneSection}>
          <SettingRow
            icon="phone-outline"
            label={t('settings.account.phone.label')}
            description={t('settings.account.phone.description')}
          />
          <FInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t('settings.account.phone.placeholder')}
            keyboardType="phone-pad"
          />
          <FButton
            onPress={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                Alert.alert(t('settings.alerts.phone.savedTitle'), t('settings.alerts.phone.saved'));
              }, 500);
            }}
            loading={saving}
            disabled={saving || phone.trim().length === 0}
            size="sm"
            style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start', marginTop: spacing.sm }}
          >
            {t('common.save')}
          </FButton>
        </View>
      </FCard>

      {/* Preferences Section */}
      <FCard style={styles.sectionCard} shadow="sm">
        <SectionHeader icon="tune-variant" label={t('settings.section.preferences')} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={brandColors.primaryMuted} />
            </View>
            <View style={styles.rowText}>
              <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.preferences.pushNotifications.label')}
              </Text>
              <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.preferences.pushNotifications.description')}
              </Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handlePushToggle}
            disabled={pushLoading}
            trackColor={{ true: brandColors.primary, false: brandColors.outlineLight }}
            thumbColor={brandColors.white}
          />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="translate" size={18} color={brandColors.primaryMuted} />
            </View>
            <View style={styles.rowText}>
              <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.preferences.language.label')}
              </Text>
              <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.preferences.language.description')}
              </Text>
            </View>
          </View>
          <View style={{ gap: spacing.xs }}>
            <Pressable
              onPress={() => void changeLanguage('en')}
              style={[styles.langChip, language === 'en' && styles.langChipActive]}
            >
              <Text style={[typography.caption, { color: language === 'en' ? brandColors.white : brandColors.textMuted, fontWeight: '700' }]}>EN</Text>
            </Pressable>
            <Pressable
              onPress={() => void changeLanguage('he')}
              style={[styles.langChip, language === 'he' && styles.langChipActive]}
            >
              <Text style={[typography.caption, { color: language === 'he' ? brandColors.white : brandColors.textMuted, fontWeight: '700' }]}>עב</Text>
            </Pressable>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Pressable onPress={handleChangePassword} style={styles.actionRow}>
          <View style={styles.settingIcon}>
            <MaterialCommunityIcons name="lock-reset" size={18} color={brandColors.primaryMuted} />
          </View>
          <View style={styles.rowText}>
            <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.preferences.changePassword.label')}
            </Text>
            <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.preferences.changePassword.description')}
            </Text>
          </View>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={brandColors.textMuted} />
        </Pressable>
      </FCard>

      {/* Danger Zone */}
      <FCard style={styles.sectionCard} shadow="sm">
        <SectionHeader icon="logout" label={t('settings.section.session')} />
        <Text style={[typography.bodySm, styles.sessionCopy, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.session.copy')}
        </Text>
        <FButton
          variant="danger"
          icon="logout"
          onPress={handleLogout}
          fullWidth
          style={styles.logoutButton}
        >
          {t('settings.session.logout')}
        </FButton>
      </FCard>
    </ScrollView>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <MaterialCommunityIcons name={icon as never} size={16} color={brandColors.primary} />
      </View>
      <Text style={[typography.eyebrow, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value?: string;
  description?: string;
}) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon as never} size={18} color={brandColors.primaryMuted} />
      </View>
      <View style={styles.rowText}>
        <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
        {value && (
          <Text style={[typography.body, { color: brandColors.textPrimary, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }]}>{value}</Text>
        )}
        {description && (
          <Text style={[typography.caption, { color: brandColors.textMuted, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }]}>{description}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    backgroundColor: brandColors.background,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    maxWidth: 500,
    marginBottom: spacing.lg,
    backgroundColor: brandColors.primary,
    overflow: 'hidden',
  },
  sectionCard: {
    width: '100%',
    maxWidth: 500,
    marginBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    color: brandColors.secondary,
  },
  heroSub: {
    color: brandColors.textOnDarkMuted,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,252,246,0.10)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    marginVertical: spacing.lg,
    backgroundColor: brandColors.outlineLight,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSection: {
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  sessionCopy: {
    color: brandColors.textMuted,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    marginTop: spacing.xs,
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    minWidth: 36,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
});
