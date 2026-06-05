import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Avatar, Divider, Switch, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../api/axiosInstance';
import { uploadImage } from '../utils/uploadImage';
import { FButton, FCard, FChip, FInput } from '../components/ui';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors, radii, shadows, spacing, typography } from '../theme';
import { CATEGORY_LIST, getCategoryLabel } from '../utils/categoryMetadata';

interface PortfolioItem {
  id: string;
  image_url: string;
  description: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  phone_number: string | null;
  payment_link: string | null;
  specializations: string[];
  average_rating_as_fixer: number;
  completed_tasks_as_fixer: number;
  avg_response_time_minutes: number | null;
  verification_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  portfolio_items: PortfolioItem[];
}

function isValidUrl(value: string) {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

function sameStringSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every((value) => bSet.has(value));
}

export default function FixerProfileScreen() {
  const navigation = useNavigation<{ navigate: (screen: string, params: object) => void }>();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isWide = width >= 900;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingSpecializations, setSavingSpecializations] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [uploadingVerification, setUploadingVerification] = useState(false);

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await api.get('/api/users/me');
      const u: Profile = res.data.user;
      setProfile(u);
      setFullName(u.full_name ?? '');
      setBio(u.bio ?? '');
      setPhone(u.phone_number ?? '');
      setPaymentLink(u.payment_link ?? '');
      setSpecializations(u.specializations ?? []);
      setPortfolioItems(u.portfolio_items ?? []);
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void fetchProfile();
    }, [fetchProfile]),
  );

  const pickNewAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !profile) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(result.assets[0].uri, `avatars/${profile.id}/${Date.now()}.jpg`);
      await api.put('/api/users/me', { avatar_url: url });
      setProfile(p => p ? { ...p, avatar_url: url } : p);
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.avatarError'));
    } finally {
      setUploadingAvatar(false);
    }
  };


  const handleSaveProfile = async () => {
    const nextPaymentLink = paymentLink.trim();
    if (nextPaymentLink && !isValidUrl(nextPaymentLink)) {
      Alert.alert(t('fixerProfile.payment.checkLink'), t('fixerProfile.payment.checkLinkMessage'));
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/api/users/me', {
        full_name: fullName.trim(),
        bio: bio.trim(),
        phone_number: phone.trim() || undefined,
        payment_link: nextPaymentLink || undefined,
        specializations,
      });
      const updated = res.data.user as Partial<Profile>;
      setProfile(prev => prev ? { ...prev, ...updated, portfolio_items: portfolioItems } : prev);
      setFullName(updated.full_name ?? fullName.trim());
      setBio(updated.bio ?? bio.trim());
      setPhone(updated.phone_number ?? phone.trim());
      setPaymentLink(updated.payment_link ?? '');
      setSpecializations(updated.specializations ?? specializations);
      Alert.alert(t('fixerProfile.alerts.savedTitle'), t('fixerProfile.alerts.saved'));
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialization = (value: string) => {
    setSpecializations(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value],
    );
  };

  const handleSaveSpecializations = async () => {
    setSavingSpecializations(true);
    try {
      const res = await api.put('/api/users/me', { specializations });
      const updated = res.data.user as Partial<Profile>;
      setProfile(prev => prev ? {
        ...prev,
        specializations: updated.specializations ?? specializations,
      } : prev);
      setSpecializations(updated.specializations ?? specializations);
      Alert.alert(t('fixerProfile.alerts.savedTitle'), t('fixerProfile.alerts.tradesSaved'));
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.tradesSaveError'));
    } finally {
      setSavingSpecializations(false);
    }
  };

  const handleAddPortfolio = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled || !profile) return;
    setUploadingPortfolio(true);
    try {
      const url = await uploadImage(result.assets[0].uri, `portfolio/${profile.id}/${Date.now()}.jpg`);
      const res = await api.post('/api/users/me/portfolio', { image_url: url });
      setPortfolioItems(prev => [res.data.portfolioItem, ...prev]);
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.portfolioUploadError'));
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolio = async (item: PortfolioItem) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(t('fixerProfile.alerts.deletePortfolio.message'))
      : await new Promise<boolean>(resolve =>
          Alert.alert(
            t('fixerProfile.alerts.deletePortfolio.title'),
            t('fixerProfile.alerts.deletePortfolio.message'),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('fixerProfile.alerts.deletePortfolio.confirm'), style: 'destructive', onPress: () => resolve(true) },
            ],
          ),
        );
    if (!confirmed) return;
    try {
      await api.delete(`/api/users/me/portfolio/${item.id}`);
      setPortfolioItems(prev => prev.filter(p => p.id !== item.id));
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.portfolioDeleteError'));
    }
  };

  const handleSubmitVerification = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !profile) return;
    setUploadingVerification(true);
    try {
      const url = await uploadImage(result.assets[0].uri, `verification/${profile.id}/${Date.now()}.jpg`);
      await api.post('/api/users/me/verification', { verification_photo_url: url });
      setProfile(p => p ? { ...p, verification_status: 'PENDING' } : p);
      Alert.alert(t('fixerProfile.alerts.verificationSubmitted.title'), t('fixerProfile.alerts.verificationSubmitted.message'));
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.alerts.verificationError'));
    } finally {
      setUploadingVerification(false);
    }
  };

  if (loading) return <LoadingScreen label={t('common.loading')} />;

  const avgRating = profile?.average_rating_as_fixer;
  const displayName = fullName.trim() || profile?.full_name || 'Fixer profile';
  const savedPaymentLink = profile?.payment_link?.trim() ?? '';
  const currentPaymentLink = paymentLink.trim();
  const currentPaymentLinkValid = currentPaymentLink.length > 0 && isValidUrl(currentPaymentLink);
  const savedPaymentLinkValid = savedPaymentLink.length > 0 && isValidUrl(savedPaymentLink);
  const paymentLinkChanged = currentPaymentLink !== savedPaymentLink;
  const paymentStatus =
    currentPaymentLink.length === 0 && savedPaymentLink.length > 0
      ? {
          icon: 'content-save-alert-outline',
          label: t('fixerProfile.payment.unsavedLabel'),
          color: brandColors.warning,
          style: styles.paymentMissing,
          message: t('fixerProfile.payment.unsavedMessage'),
        }
      : currentPaymentLink.length === 0
      ? {
          icon: 'alert-circle-outline',
          label: t('fixerProfile.payment.missing'),
          color: brandColors.warning,
          style: styles.paymentMissing,
          message: t('fixerProfile.payment.missingMessage'),
        }
      : !currentPaymentLinkValid
        ? {
            icon: 'alert-circle-outline',
            label: t('fixerProfile.payment.invalid'),
            color: brandColors.danger,
            style: styles.paymentInvalid,
            message: t('fixerProfile.payment.invalidMessage'),
          }
        : paymentLinkChanged
          ? {
              icon: 'content-save-alert-outline',
              label: t('fixerProfile.payment.unsavedLabel'),
              color: brandColors.warning,
              style: styles.paymentMissing,
              message: t('fixerProfile.payment.unsavedMessage'),
            }
          : savedPaymentLinkValid
            ? {
                icon: 'check-circle-outline',
                label: t('fixerProfile.payment.ready'),
                color: brandColors.success,
                style: styles.paymentReady,
                message: null,
              }
            : {
                icon: 'alert-circle-outline',
                label: t('fixerProfile.payment.checkLink'),
                color: brandColors.warning,
                style: styles.paymentMissing,
                message: t('fixerProfile.payment.reviewMessage'),
              };
  const hasSpecializationChanges = !sameStringSet(specializations, profile?.specializations ?? []);
  const completionItems = [
    fullName.trim(),
    bio.trim(),
    phone.trim(),
    savedPaymentLinkValid,
    specializations.length > 0,
    portfolioItems.length > 0,
    profile?.avatar_url,
  ];
  const completionPercent = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100,
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.workspaceShell, isWide && styles.workspaceShellWide]}>
        <View style={[styles.profileHero, isWide && styles.profileHeroWide]}>
          <View style={styles.avatarWrapper}>
            <Pressable
              onPress={() => profile?.avatar_url ? setViewingAvatar(true) : void pickNewAvatar()}
              accessibilityRole="button"
              accessibilityLabel={profile?.avatar_url ? 'View profile photo' : 'Add profile photo'}
              accessibilityState={{ busy: uploadingAvatar }}
            >
              {profile?.avatar_url ? (
                <Avatar.Image size={104} source={{ uri: profile.avatar_url }} />
              ) : (
                <Avatar.Icon
                  size={104}
                  icon="account"
                  style={{ backgroundColor: brandColors.primaryMuted }}
                />
              )}
            </Pressable>
            <Pressable
              style={styles.cameraBadge}
              onPress={() => void pickNewAvatar()}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityState={{ busy: uploadingAvatar }}
            >
              {uploadingAvatar ? (
                <MaterialCommunityIcons name="loading" size={14} color={brandColors.white} />
              ) : (
                <MaterialCommunityIcons name="camera" size={14} color={brandColors.white} />
              )}
            </Pressable>
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.headerKickerRow}>
              <View style={styles.headerIconShell}>
                <MaterialCommunityIcons name="account-hard-hat-outline" size={17} color={brandColors.secondary} />
              </View>
              <Text style={styles.headerKicker}>{t('fixerProfile.headerKicker')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.heroName} numberOfLines={2}>{displayName}</Text>
              {profile?.verification_status === 'APPROVED' && (
                <MaterialCommunityIcons name="check-decagram" size={22} color="#29B6F6" />
              )}
            </View>
            <Text style={styles.heroEmail} numberOfLines={1}>{profile?.email}</Text>

            <View style={styles.heroStats}>
              <Pressable
                style={styles.heroStat}
                onPress={() => {
                  if (profile?.id) {
                    navigation.navigate('PublicProfile', { userId: profile.id });
                  }
                }}
              >
                <Text style={styles.heroStatValue}>
                  {avgRating != null && avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                </Text>
                <Text style={[styles.heroStatLabel, { textDecorationLine: 'underline' }]}>{t('fixerProfile.stats.rating')}</Text>
              </Pressable>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{specializations.length}</Text>
                <Text style={styles.heroStatLabel}>{t('fixerProfile.stats.trades')}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{portfolioItems.length}</Text>
                <Text style={styles.heroStatLabel}>{t('fixerProfile.stats.photos')}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{completionPercent}%</Text>
                <Text style={styles.heroStatLabel}>{t('fixerProfile.stats.profileCompletion')}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.paymentStatus, paymentStatus.style]}>
            <MaterialCommunityIcons
              name={paymentStatus.icon as never}
              size={16}
              color={paymentStatus.color}
            />
            <Text
              style={[
                typography.caption,
                { color: paymentStatus.color, fontWeight: '700' },
              ]}
            >
              {paymentStatus.label}
            </Text>
          </View>
        </View>

        <View style={[styles.profileGrid, isWide && styles.profileGridWide]}>
          <View style={styles.profileMainColumn}>
            <FCard style={styles.section} shadow="sm">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialCommunityIcons name="account-edit-outline" size={18} color={brandColors.primary} />
                </View>
                <View>
                  <Text style={styles.sectionKicker}>{t('fixerProfile.sectionKicker')}</Text>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('fixerProfile.sectionTitle')}</Text>
                </View>
              </View>

              <FInput label={t('fixerProfile.fields.fullName')} value={fullName} onChangeText={setFullName} returnKeyType="next" />
              <FInput
                label={t('fixerProfile.fields.bio')}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                returnKeyType="next"
              />
              <FInput
                label={t('fixerProfile.fields.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              <FInput
                label={t('fixerProfile.fields.paymentLink')}
                value={paymentLink}
                onChangeText={setPaymentLink}
                keyboardType="url"
                autoCapitalize="none"
                returnKeyType="done"
              />
              {paymentStatus.message && (
                <View style={[styles.warningRow, paymentStatus.color === brandColors.danger && styles.dangerRow]}>
                  <MaterialCommunityIcons name="alert-outline" size={14} color={paymentStatus.color} />
                  <Text style={[typography.caption, { color: paymentStatus.color, marginLeft: spacing.xs, flex: 1 }]}>
                    {paymentStatus.message}
                  </Text>
                </View>
              )}

              <FButton
                onPress={() => void handleSaveProfile()}
                loading={saving}
                disabled={saving || (currentPaymentLink.length > 0 && !currentPaymentLinkValid)}
                fullWidth
                style={{ marginTop: spacing.sm }}
              >
                {t('fixerProfile.actions.save')}
              </FButton>

              <Divider style={{ marginVertical: spacing.lg, backgroundColor: brandColors.outlineLight }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="bell-outline" size={18} color={brandColors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                      {t('fixerProfile.pushNotifications.label')}
                    </Text>
                    <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                      {t('fixerProfile.pushNotifications.description')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={async (value) => {
                    if (Platform.OS === 'web') {
                      // On web, toggle locally (push tokens only work on mobile)
                      setPushEnabled(value);
                      return;
                    }
                    if (!value) { setPushEnabled(false); return; }
                    setPushLoading(true);
                    try {
                      const { status } = await Notifications.requestPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert(t('fixerProfile.alerts.permissionDenied'), t('fixerProfile.alerts.enableNotifications'));
                        return;
                      }
                      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string;
                      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
                      await api.post('/api/users/me/push-token', { token: tokenData.data });
                      setPushEnabled(true);
                    } catch (err) {
                      Alert.alert('Error', err instanceof Error ? err.message : String(err));
                    } finally {
                      setPushLoading(false);
                    }
                  }}
                  disabled={pushLoading}
                  trackColor={{ true: brandColors.primary, false: brandColors.outlineLight }}
                  thumbColor={brandColors.white}
                />
              </View>
            </FCard>

            {/* Verification section */}
            <FCard style={styles.section} shadow="sm">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialCommunityIcons name="shield-check-outline" size={18} color={brandColors.primary} />
                </View>
                <View>
                  <Text style={styles.sectionKicker}>{t('fixerProfile.verification.kicker')}</Text>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('fixerProfile.verification.title')}</Text>
                </View>
              </View>

              {profile?.verification_status === 'APPROVED' ? (
                <View style={styles.verificationBanner}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={brandColors.primary} />
                  <Text style={[typography.bodyMedium, { color: brandColors.primary }]}>{t('fixerProfile.verification.verified')}</Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1 }]}>
                    {t('fixerProfile.verification.verifiedMsg')}
                  </Text>
                </View>
              ) : profile?.verification_status === 'PENDING' ? (
                <View style={styles.verificationBanner}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={brandColors.warning} />
                  <Text style={[typography.bodyMedium, { color: brandColors.warning }]}>{t('fixerProfile.verification.pending')}</Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1 }]}>
                    {t('fixerProfile.verification.pendingMsg')}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[typography.body, { color: brandColors.textMuted, marginBottom: spacing.md }]}>
                    {t('fixerProfile.verification.uploadMsg')}
                  </Text>
                  <FButton
                    variant="secondary"
                    icon="camera-outline"
                    onPress={() => void handleSubmitVerification()}
                    loading={uploadingVerification}
                    disabled={uploadingVerification}
                    fullWidth
                  >
                    {t('fixerProfile.verification.uploadBtn')}
                  </FButton>
                </>
              )}
            </FCard>

            <FCard style={styles.section} shadow="sm">
              <View style={styles.portfolioHeader}>
                <View style={styles.sectionHeaderCompact}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="tools" size={18} color={brandColors.primary} />
                  </View>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('fixerProfile.tradeCoverage.title')}</Text>
                </View>
                <View style={styles.countChip}>
                  <Text style={[typography.caption, { color: brandColors.primary }]}>
                    {t('fixerProfile.tradeCoverage.selectedCount', { count: specializations.length })}
                  </Text>
                </View>
                {hasSpecializationChanges && (
                  <View style={styles.unsavedChip}>
                    <MaterialCommunityIcons name="content-save-alert-outline" size={12} color={brandColors.warning} />
                    <Text style={[typography.caption, styles.unsavedChipText]}>{t('fixerProfile.tradeCoverage.unsaved')}</Text>
                  </View>
                )}
                <FButton
                  size="sm"
                  variant={hasSpecializationChanges ? 'secondary' : 'outline'}
                  icon={hasSpecializationChanges ? 'content-save-outline' : 'check-circle-outline'}
                  disabled={!hasSpecializationChanges || saving || savingSpecializations}
                  loading={savingSpecializations}
                  onPress={() => void handleSaveSpecializations()}
                >
                  {hasSpecializationChanges ? t('fixerProfile.tradeCoverage.save') : t('fixerProfile.tradeCoverage.saved')}
                </FButton>
              </View>
              <View style={styles.chipsWrap}>
                {CATEGORY_LIST.map(s => (
                  <FChip
                    key={s.value}
                    label={getCategoryLabel(s.value, t)}
                    icon={s.icon}
                    selected={specializations.includes(s.value)}
                    onPress={() => toggleSpecialization(s.value)}
                    compact
                  />
                ))}
              </View>
            </FCard>
          </View>

          <View style={styles.profileSideColumn}>
            <FCard style={styles.section} shadow="sm">
              <View style={styles.portfolioHeader}>
                <View style={styles.sectionHeaderCompact}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={18} color={brandColors.primary} />
                  </View>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('fixerProfile.portfolio.title')}</Text>
                </View>
                <View style={styles.countChip}>
                  <Text style={[typography.caption, { color: brandColors.primary }]}>
                    {t('fixerProfile.portfolio.photoCount', { count: portfolioItems.length })}
                  </Text>
                </View>
              </View>

              <View style={styles.portfolioGrid}>
                <Pressable
                  onPress={() => void handleAddPortfolio()}
                  accessibilityRole="button"
                  accessibilityLabel="Add portfolio photo"
                  accessibilityState={{ busy: uploadingPortfolio }}
                  style={({ pressed }) => [styles.portfolioTile, styles.addTile, { opacity: pressed ? 0.7 : 1 }]}
                >
                  {uploadingPortfolio ? (
                    <MaterialCommunityIcons name="loading" size={28} color={brandColors.primaryMuted} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="plus" size={28} color={brandColors.primaryMuted} />
                      <Text style={[typography.caption, { color: brandColors.primaryMuted, marginTop: spacing.xs }]}>
                        {t('fixerProfile.portfolio.addPhoto')}
                      </Text>
                    </>
                  )}
                </Pressable>

                {portfolioItems.map(item => (
                  <View key={item.id} style={styles.portfolioTile}>
                    <Image source={{ uri: item.image_url }} style={styles.portfolioImage} />
                    <Pressable
                      style={styles.portfolioDeleteBtn}
                      hitSlop={8}
                      onPress={() => handleDeletePortfolio(item)}
                      accessibilityRole="button"
                      accessibilityLabel="Delete portfolio photo"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color={brandColors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </FCard>
          </View>
        </View>
      </View>

      {/* Avatar viewer modal */}
      <Modal visible={viewingAvatar} transparent animationType="fade" onRequestClose={() => setViewingAvatar(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setViewingAvatar(false)}
          accessibilityRole="button"
          accessibilityLabel="Close profile photo preview"
        >
          <Image
            source={{ uri: profile?.avatar_url ?? '' }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const TILE_SIZE = '31%' as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    alignItems: 'center',
  },
  workspaceShell: {
    width: '100%',
    gap: spacing.lg,
  },
  workspaceShellWide: {
    maxWidth: 1120,
  },
  profileHero: {
    backgroundColor: brandColors.primaryDark,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.secondary,
    ...shadows.md,
  },
  profileHeroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: brandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brandColors.primaryDark,
    ...shadows.sm,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconShell: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(241,181,69,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.22)',
  },
  headerKicker: {
    ...typography.eyebrow,
    color: brandColors.secondary,
    letterSpacing: 0.8,
  },
  heroName: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.textOnDark,
  },
  heroEmail: {
    ...typography.bodySm,
    color: brandColors.textOnDarkMuted,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroStat: {
    minWidth: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.14)',
  },
  heroStatValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.secondary,
  },
  heroStatLabel: {
    ...typography.caption,
    color: brandColors.textOnDarkMuted,
    marginTop: 1,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  paymentReady: {
    backgroundColor: brandColors.successSoft,
    borderColor: 'rgba(81,122,88,0.24)',
  },
  paymentMissing: {
    backgroundColor: brandColors.warningSoft,
    borderColor: 'rgba(155,109,42,0.24)',
  },
  paymentInvalid: {
    backgroundColor: brandColors.dangerSoft,
    borderColor: 'rgba(168,91,91,0.24)',
  },
  profileGrid: {
    gap: spacing.lg,
  },
  profileGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileMainColumn: {
    flex: 1.3,
    gap: spacing.lg,
  },
  profileSideColumn: {
    flex: 0.9,
    gap: spacing.lg,
  },
  section: {
    width: '100%',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionKicker: {
    ...typography.eyebrow,
    color: brandColors.textMuted,
    marginBottom: 2,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.warningSoft,
    marginTop: spacing.xs,
  },
  dangerRow: {
    backgroundColor: brandColors.dangerSoft,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  countChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.infoSoft,
  },
  unsavedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(155,109,42,0.22)',
  },
  unsavedChipText: {
    color: brandColors.warning,
    fontWeight: '700',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  portfolioTile: {
    width: TILE_SIZE,
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: brandColors.surfaceAlt,
    position: 'relative',
  },
  addTile: {
    backgroundColor: brandColors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: brandColors.outlineLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  portfolioDeleteBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,36,56,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '90%',
    height: '70%',
    borderRadius: radii.xl,
  },
});
