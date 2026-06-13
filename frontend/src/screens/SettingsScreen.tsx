import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, Pressable, Platform, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { brandColors, headerTint, radii, spacing, typography } from '../theme';

export default function SettingsScreen() {
  const user = auth.currentUser;
  const { t } = useTranslation();
  const { language, changeLanguage, isRTL } = useLanguage();
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneSavedSuccess, setPhoneSavedSuccess] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const dismissEditing = () => {
    Keyboard.dismiss();
    if (phone.trim() === savedPhone) setEditingPhone(false);
  };

  const [langOpen, setLangOpen] = useState(false);
  const accountName = user?.displayName?.trim() || 'FixIt account';
  const accountEmail = user?.email || 'Not signed in';
  const verificationLabel = user?.emailVerified ? t('settings.hero.verifiedEmail') : t('settings.hero.emailNotVerified');
  const verificationColor = user?.emailVerified ? brandColors.success : brandColors.warning;

  useEffect(() => {
    if (Platform.OS === 'web') {
      AsyncStorage.getItem('pushEnabled').then((v) => setPushEnabled(v === 'true'));
    } else {
      Notifications.getPermissionsAsync().then(({ status }) => setPushEnabled(status === 'granted'));
    }
    api.get('/api/users/me').then((res) => {
      const p = res.data.user?.phone_number ?? '';
      setPhone(p);
      setSavedPhone(p);
      setEditingPhone(!p);
    }).catch(() => {});
  }, []);

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
      setPushEnabled(value);
      void AsyncStorage.setItem('pushEnabled', String(value));
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
      Alert.alert(t('common.error'), msg);
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(t('settings.alerts.logOut.message'))) {
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
    <ScrollView contentContainerStyle={[styles.container, isRTL && { direction: 'rtl' as const }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={dismissEditing}>
      {/* Hero */}
      <FCard style={styles.heroCard} shadow="sm">
        <View style={[styles.heroRow, isRTL && { direction: 'rtl' as const }]}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="account-cog-outline" size={26} color={brandColors.secondaryDark} />
          </View>
          <View style={styles.heroText}>
            <Text style={[typography.eyebrow, styles.heroEyebrow, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.hero.eyebrow')}</Text>
            <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{accountName}</Text>
            <Text style={[typography.bodySm, styles.heroSub, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{accountEmail}</Text>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroPill}>
            <View style={[styles.statusDot, { backgroundColor: verificationColor }]} />
            <Text style={[typography.caption, { color: brandColors.textPrimary }]}>{verificationLabel}</Text>
          </View>
          <View style={styles.heroPill}>
            <MaterialCommunityIcons name="shield-check-outline" size={13} color={brandColors.secondaryDark} />
            <Text style={[typography.caption, { color: brandColors.textSecondary , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.hero.secureSession')}</Text>
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
          {editingPhone ? (
            <FInput
              autoFocus
              value={phone}
              onChangeText={setPhone}
              placeholder={t('settings.account.phone.placeholder')}
              keyboardType="phone-pad"
              onBlur={() => { if (phone.trim() === savedPhone) setEditingPhone(false); }}
            />
          ) : (
            <View style={styles.savedValueRow}>
              <Text style={[typography.body, { color: brandColors.textPrimary, flex: 1 }]}>{savedPhone}</Text>
              <Pressable
                onPress={() => setEditingPhone(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.edit')}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color={brandColors.primaryMuted} />
              </Pressable>
            </View>
          )}
          {phoneSavedSuccess ? (
            <View style={styles.savedBanner}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={brandColors.success} />
              <Text style={[typography.bodySm, { color: brandColors.success , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.alerts.phone.saved')}
              </Text>
            </View>
          ) : editingPhone && phone.trim() !== savedPhone && phone.trim().length > 0 ? (
            <FButton
              onPress={async () => {
                setSaving(true);
                try {
                  await api.put('/api/users/me', { phone_number: phone.trim() });
                  setSavedPhone(phone.trim());
                  setEditingPhone(false);
                  setPhoneSavedSuccess(true);
                  setTimeout(() => setPhoneSavedSuccess(false), 2500);
                } catch {
                  Alert.alert(t('common.error'), t('settings.alerts.phone.saveError'));
                } finally {
                  setSaving(false);
                }
              }}
              loading={saving}
              disabled={saving}
              size="sm"
              style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start', marginTop: spacing.sm }}
            >
              {t('common.save')}
            </FButton>
          ) : null}
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
              <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.preferences.pushNotifications.label')}
              </Text>
              <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.preferences.pushNotifications.description')}
              </Text>
            </View>
          </View>
          <View style={isRTL ? { direction: 'ltr' as const } : undefined}>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              disabled={pushLoading}
              trackColor={{ true: brandColors.primary, false: brandColors.outlineLight }}
              thumbColor={brandColors.white}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="translate" size={18} color={brandColors.primaryMuted} />
            </View>
            <View style={styles.rowText}>
              <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.preferences.language.label')}
              </Text>
              <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.preferences.language.description')}
              </Text>
            </View>
          </View>
          <View>
            <Pressable
              onPress={() => setLangOpen(!langOpen)}
              style={styles.langSelected}
            >
              <Text style={[typography.caption, { color: brandColors.white, fontWeight: '700' }]}>
                {language === 'en' ? 'EN' : 'עב'}
              </Text>
              <MaterialCommunityIcons
                name={langOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={brandColors.white}
              />
            </Pressable>
            {langOpen && (
              <Pressable
                onPress={() => {
                  void changeLanguage(language === 'en' ? 'he' : 'en');
                  setLangOpen(false);
                }}
                style={styles.langOption}
              >
                <Text style={[typography.caption, { color: brandColors.textPrimary, fontWeight: '700' }]}>
                  {language === 'en' ? 'עב' : 'EN'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Divider style={styles.divider} />

        <Pressable onPress={handleChangePassword} style={styles.actionRow}>
          <View style={styles.settingIcon}>
            <MaterialCommunityIcons name="lock-reset" size={18} color={brandColors.primaryMuted} />
          </View>
          <View style={styles.rowText}>
            <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('settings.preferences.changePassword.label')}
            </Text>
            <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('settings.preferences.changePassword.description')}
            </Text>
          </View>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={brandColors.textMuted} />
        </Pressable>
      </FCard>

      {/* Danger Zone */}
      <FCard style={styles.sectionCard} shadow="sm">
        <SectionHeader icon="logout" label={t('settings.section.session')} />
        <Text style={[typography.bodySm, styles.sessionCopy, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
      <Text style={[typography.eyebrow, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{label}</Text>
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
        <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{label}</Text>
        {value && (
          <Text style={[typography.body, { color: brandColors.textPrimary, marginTop: 2, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{value}</Text>
        )}
        {description && (
          <Text style={[typography.caption, { color: brandColors.textMuted, marginTop: 2, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{description}</Text>
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
    backgroundColor: '#E4EDF7',
    borderBottomWidth: 3,
    borderBottomColor: headerTint.requesterBorder,
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
    backgroundColor: 'rgba(241,181,69,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(212,154,42,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    color: brandColors.secondaryDark,
  },
  heroSub: {
    color: brandColors.textSecondary,
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
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
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
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  savedValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  langSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.primary,
    minWidth: 56,
    justifyContent: 'center',
  },
  langOption: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    minWidth: 56,
    justifyContent: 'center',
  },
});
