import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar, Divider, Switch, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../api/axiosInstance';
import { uploadImage } from '../utils/uploadImage';
import { FButton, FCard, FChip, FInput } from '../components/ui';
import LoadingScreen from '../components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { brandColors, heroGradientFixer, radii, shadows, spacing, typography } from '../theme';
import { CATEGORY_LIST, getCategoryLabel } from '../utils/categoryMetadata';

interface PortfolioItem {
  id: string;
  image_url: string;
  description: string | null;
}

interface Certification {
  id: string;
  category: string;
  title: string;
  document_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_note?: string | null;
}

const CERTIFIABLE_CATEGORIES = ['PLUMBING', 'ELECTRICITY'] as const;

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
  certifications: Certification[];
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
  const { language, changeLanguage, isRTL } = useLanguage();
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
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  // Original values for change detection
  const [origName, setOrigName] = useState('');
  const [origBio, setOrigBio] = useState('');
  const [origPhone, setOrigPhone] = useState('');
  const [origPayment, setOrigPayment] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [uploadingVerification, setUploadingVerification] = useState(false);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [uploadingCert, setUploadingCert] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  const dismissEditing = () => {
    Keyboard.dismiss();
    if (fullName.trim() === origName) setEditingName(false);
    if (bio.trim() === origBio) setEditingBio(false);
    if (phone.trim() === origPhone) setEditingPhone(false);
    if (paymentLink.trim() === origPayment) setEditingPayment(false);
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      AsyncStorage.getItem('pushEnabled').then((v) => setPushEnabled(v === 'true'));
    } else {
      Notifications.getPermissionsAsync().then(({ status }) => setPushEnabled(status === 'granted'));
    }
  }, []);

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await api.get('/api/users/me');
      const u: Profile = res.data.user;
      setProfile(u);
      const n = u.full_name ?? '';
      const b = u.bio ?? '';
      const p = u.phone_number ?? '';
      const pl = u.payment_link ?? '';
      setFullName(n);
      setBio(b);
      setPhone(p);
      setPaymentLink(pl);
      setOrigName(n);
      setOrigBio(b);
      setOrigPhone(p);
      setOrigPayment(pl);
      setEditingName(!n);
      setEditingBio(!b);
      setEditingPhone(!p);
      setEditingPayment(!pl);
      setSpecializations(u.specializations ?? []);
      setPortfolioItems(u.portfolio_items ?? []);
      setCertifications(u.certifications ?? []);
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
      const savedPhoneVal = updated.phone_number ?? phone.trim();
      const savedPaymentVal = updated.payment_link ?? '';
      setPhone(savedPhoneVal);
      setPaymentLink(savedPaymentVal);
      setEditingName(false);
      setEditingBio(false);
      setEditingPhone(!savedPhoneVal);
      setEditingPayment(!savedPaymentVal);
      setSpecializations(updated.specializations ?? specializations);
      setOrigName(updated.full_name ?? fullName.trim());
      setOrigBio(updated.bio ?? bio.trim());
      setOrigPhone(savedPhoneVal);
      setOrigPayment(savedPaymentVal);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
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

  const handleUploadCertification = async (category: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !profile) return;
    setUploadingCert(category);
    try {
      const url = await uploadImage(result.assets[0].uri, `certifications/${profile.id}/${category}/${Date.now()}.jpg`);
      const categoryLabel = category === 'ELECTRICITY' ? t('fixerProfile.certifications.badge.ELECTRICITY') : t('fixerProfile.certifications.badge.PLUMBING');
      const res = await api.post('/api/users/me/certifications', {
        category,
        title: categoryLabel,
        document_url: url,
      });
      const cert = res.data.certification as Certification;
      setCertifications(prev => {
        const filtered = prev.filter(c => c.category !== category);
        return [...filtered, cert];
      });
    } catch {
      Alert.alert(t('common.error'), t('fixerProfile.certifications.uploadError'));
    } finally {
      setUploadingCert(null);
    }
  };

  const certifiableSpecs = specializations.filter(s => (CERTIFIABLE_CATEGORIES as readonly string[]).includes(s));

  if (loading) return <LoadingScreen label={t('common.loading')} />;

  const avgRating = profile?.average_rating_as_fixer;
  const displayName = fullName.trim() || profile?.full_name || 'Fixer profile';
  const currentPaymentLink = paymentLink.trim();
  const currentPaymentLinkValid = currentPaymentLink.length > 0 && isValidUrl(currentPaymentLink);
  const hasSpecializationChanges = !sameStringSet(specializations, profile?.specializations ?? []);


  return (
    <ScrollView
      style={[styles.container, isRTL && { direction: 'rtl' as const }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={dismissEditing}
    >
      <View style={[styles.workspaceShell, isWide && styles.workspaceShellWide]}>
        <LinearGradient
          colors={heroGradientFixer.colors}
          locations={heroGradientFixer.locations}
          start={heroGradientFixer.start}
          end={heroGradientFixer.end}
          style={[styles.profileHero, isWide && styles.profileHeroWide]}
        >
          <View
            ref={(el: unknown) => { if (el && Platform.OS === 'web') { (el as HTMLElement).dir = 'ltr'; } }}
            style={styles.heroInnerRow}
          >
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
                <MaterialCommunityIcons name="account-hard-hat-outline" size={17} color={brandColors.secondaryDark} />
              </View>
              <Text style={[styles.headerKicker, { textAlign: 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.headerKicker')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' }}>
              <Text style={[styles.heroName, { textAlign: 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{displayName}</Text>
              {profile?.verification_status === 'APPROVED' && (
                <MaterialCommunityIcons name="check-decagram" size={22} color="#29B6F6" />
              )}
            </View>
            <Text style={[styles.heroEmail, { textAlign: 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>{profile?.email}</Text>
          </View>

          <Pressable
            style={styles.heroStat}
            onPress={() => {
              if (profile?.id) {
                navigation.navigate('PublicProfile', { userId: profile.id });
              }
            }}
          >
            <Text style={styles.heroStatValue}>
              {avgRating != null && avgRating > 0 ? avgRating.toFixed(1) : t('fixerProfile.stats.new')}
            </Text>
            <Text style={[styles.heroStatLabel, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.stats.rating')}</Text>
            <Text numberOfLines={1} style={[typography.caption, { color: brandColors.secondaryDark, marginTop: spacing.xs, textDecorationLine: 'underline', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('fixerProfile.stats.tapToView')}
            </Text>
          </Pressable>

          </View>
        </LinearGradient>

        <View style={[styles.profileGrid, isWide && styles.profileGridWide]}>
          <View style={styles.profileMainColumn}>
            <FCard style={styles.section} shadow="sm">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialCommunityIcons name="account-edit-outline" size={18} color={brandColors.primary} />
                </View>
                <View>
                  <Text style={[styles.sectionKicker, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.sectionKicker')}</Text>
                  <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.sectionTitle')}</Text>
                </View>
              </View>

              <View>
                <Text style={[typography.caption, { color: brandColors.textMuted, marginBottom: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.fields.fullName')}</Text>
                {editingName ? (
                  <FInput autoFocus value={fullName} onChangeText={setFullName} returnKeyType="next" onBlur={() => { if (fullName.trim() === origName) setEditingName(false); }} />
                ) : (
                  <View style={styles.savedValueRow}>
                    <Text style={[typography.body, { color: brandColors.textPrimary, flex: 1 }]}>{fullName}</Text>
                    <Pressable onPress={() => setEditingName(true)} hitSlop={8}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={brandColors.primaryMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
              <View>
                <Text style={[typography.caption, { color: brandColors.textMuted, marginBottom: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.fields.bio')}</Text>
                {editingBio ? (
                  <FInput autoFocus value={bio} onChangeText={setBio} multiline numberOfLines={3} returnKeyType="next" onBlur={() => { if (bio.trim() === origBio) setEditingBio(false); }} />
                ) : (
                  <View style={styles.savedValueRow}>
                    <Text style={[typography.body, { color: brandColors.textPrimary, flex: 1 }]}>{bio}</Text>
                    <Pressable onPress={() => setEditingBio(true)} hitSlop={8}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={brandColors.primaryMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
              <View>
                <Text style={[typography.caption, { color: brandColors.textMuted, marginBottom: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.fields.phone')}</Text>
                {editingPhone ? (
                  <FInput
                    autoFocus
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onBlur={() => { if (phone.trim() === origPhone) setEditingPhone(false); }}
                  />
                ) : (
                  <View style={styles.savedValueRow}>
                    <Text style={[typography.body, { color: brandColors.textPrimary, flex: 1 }]}>{phone}</Text>
                    <Pressable onPress={() => setEditingPhone(true)} hitSlop={8}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={brandColors.primaryMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
              <View>
                <Text style={[typography.caption, { color: brandColors.textMuted, marginBottom: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.fields.paymentLink')}</Text>
                {editingPayment ? (
                  <FInput
                    autoFocus
                    value={paymentLink}
                    onChangeText={setPaymentLink}
                    keyboardType="url"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onBlur={() => { if (paymentLink.trim() === origPayment) setEditingPayment(false); }}
                  />
                ) : (
                  <View style={styles.savedValueRow}>
                    <Text style={[typography.body, { color: brandColors.textPrimary, flex: 1 }]} numberOfLines={1}>{paymentLink}</Text>
                    <Pressable onPress={() => setEditingPayment(true)} hitSlop={8}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={brandColors.primaryMuted} />
                    </Pressable>
                  </View>
                )}
              </View>

              <Divider style={{ marginVertical: spacing.lg, backgroundColor: brandColors.outlineLight }} />

              <View style={styles.portfolioHeader}>
                <View style={styles.sectionHeaderCompact}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="tools" size={18} color={brandColors.primary} />
                  </View>
                  <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.tradeCoverage.title')}</Text>
                </View>
                <View style={styles.countChip}>
                  <Text style={[typography.caption, { color: brandColors.primary , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('fixerProfile.tradeCoverage.selectedCount', { count: specializations.length })}
                  </Text>
                </View>
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

              <Divider style={{ marginVertical: spacing.lg, backgroundColor: brandColors.outlineLight }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="bell-outline" size={18} color={brandColors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {t('fixerProfile.pushNotifications.label')}
                    </Text>
                    <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {t('fixerProfile.pushNotifications.description')}
                    </Text>
                  </View>
                </View>
                <View style={isRTL ? { direction: 'ltr' as const } : undefined}>
                  <Switch
                    value={pushEnabled}
                    onValueChange={async (value) => {
                      if (Platform.OS === 'web') {
                        setPushEnabled(value);
                        void AsyncStorage.setItem('pushEnabled', String(value));
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
                        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
                      } finally {
                        setPushLoading(false);
                      }
                    }}
                    disabled={pushLoading}
                    trackColor={{ true: brandColors.primary, false: brandColors.outlineLight }}
                    thumbColor={brandColors.white}
                  />
                </View>
              </View>

              <Divider style={{ marginVertical: spacing.lg, backgroundColor: brandColors.outlineLight }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="translate" size={18} color={brandColors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
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

              {savedSuccess ? (
                <View style={styles.savedBanner}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color={brandColors.success} />
                  <Text style={[typography.bodyMedium, { color: brandColors.success , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('fixerProfile.alerts.savedTitle')}
                  </Text>
                </View>
              ) : (fullName.trim() !== origName || bio.trim() !== origBio || phone.trim() !== origPhone || paymentLink.trim() !== origPayment || hasSpecializationChanges) ? (
                <FButton
                  onPress={() => void handleSaveProfile()}
                  loading={saving}
                  disabled={saving || (currentPaymentLink.length > 0 && !currentPaymentLinkValid)}
                  fullWidth
                  style={{ marginTop: spacing.lg }}
                >
                  {t('fixerProfile.actions.save')}
                </FButton>
              ) : null}
            </FCard>

            {/* Verification section — hidden once approved */}
            {profile?.verification_status !== 'APPROVED' && (
              <FCard style={styles.section} shadow="sm">
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color={brandColors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.sectionKicker, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.verification.kicker')}</Text>
                    <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.verification.title')}</Text>
                  </View>
                </View>

                {profile?.verification_status === 'PENDING' ? (
                  <View style={styles.verificationBanner}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={brandColors.warning} />
                    <Text style={[typography.bodyMedium, { color: brandColors.warning, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.verification.pending')}</Text>
                    <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {t('fixerProfile.verification.pendingMsg')}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[typography.body, { color: brandColors.textMuted, marginBottom: spacing.md, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
            )}

          </View>

          <View style={styles.profileSideColumn}>
            <FCard style={styles.section} shadow="sm">
              <View style={styles.portfolioHeader}>
                <View style={styles.sectionHeaderCompact}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={18} color={brandColors.primary} />
                  </View>
                  <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('fixerProfile.portfolio.title')}</Text>
                </View>
                <View style={styles.countChip}>
                  <Text style={[typography.caption, { color: brandColors.primary , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
                      <Text style={[typography.caption, { color: brandColors.primaryMuted, marginTop: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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

            {certifiableSpecs.length > 0 && (
              <FCard style={styles.section} shadow="sm">
                <View style={styles.sectionHeaderCompact}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="certificate-outline" size={18} color={brandColors.primary} />
                  </View>
                  <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('fixerProfile.certifications.title')}
                  </Text>
                </View>
                <Text style={[typography.bodySm, { color: brandColors.textMuted, marginBottom: spacing.md, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('fixerProfile.certifications.description')}
                </Text>

                {certifiableSpecs.map(category => {
                  const cert = certifications.find(c => c.category === category);
                  const badgeLabel = t(`fixerProfile.certifications.badge.${category}`);

                  if (cert?.status === 'APPROVED') {
                    return (
                      <View key={category} style={styles.certRow}>
                        <View style={styles.certBadge}>
                          <MaterialCommunityIcons name="check-decagram" size={18} color={brandColors.success} />
                          <Text style={[typography.label, { color: brandColors.success }]}>{badgeLabel}</Text>
                        </View>
                      </View>
                    );
                  }

                  if (cert?.status === 'PENDING') {
                    return (
                      <View key={category} style={styles.certRow}>
                        <View style={styles.certPending}>
                          <MaterialCommunityIcons name="clock-outline" size={18} color={brandColors.warning} />
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.label, { color: brandColors.textPrimary , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{badgeLabel}</Text>
                            <Text style={[typography.caption, { color: brandColors.textMuted , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {t('fixerProfile.certifications.pendingMsg')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  if (cert?.status === 'REJECTED') {
                    return (
                      <View key={category} style={styles.certRow}>
                        <View style={styles.certRejected}>
                          <MaterialCommunityIcons name="close-circle-outline" size={18} color={brandColors.danger} />
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.label, { color: brandColors.danger , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {t('fixerProfile.certifications.rejected')}
                            </Text>
                            {cert.rejection_note && (
                              <Text style={[typography.caption, { color: brandColors.textMuted, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{cert.rejection_note}</Text>
                            )}
                            <Text style={[typography.caption, { color: brandColors.textMuted , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {t('fixerProfile.certifications.rejectedMsg')}
                            </Text>
                          </View>
                        </View>
                        <FButton
                          onPress={() => void handleUploadCertification(category)}
                          variant="outline"
                          size="sm"
                          icon="upload"
                          loading={uploadingCert === category}
                          style={{ marginTop: spacing.sm }}
                        >
                          {t('fixerProfile.certifications.reuploadBtn')}
                        </FButton>
                      </View>
                    );
                  }

                  // No certification yet — show upload button
                  return (
                    <View key={category} style={styles.certRow}>
                      <FButton
                        onPress={() => void handleUploadCertification(category)}
                        variant="outline"
                        size="sm"
                        icon="upload"
                        loading={uploadingCert === category}
                      >
                        {`${t('fixerProfile.certifications.uploadBtn')} — ${badgeLabel}`}
                      </FButton>
                    </View>
                  );
                })}
              </FCard>
            )}
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
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(52,168,83,0.08)',
  },
  langSelected: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.primary,
    minWidth: 56,
    justifyContent: 'center' as const,
  },
  langOption: {
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    minWidth: 56,
    justifyContent: 'center' as const,
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
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.secondary,
    overflow: 'hidden' as const,
    ...shadows.md,
  },
  profileHeroWide: {
    padding: spacing.xl,
  },
  heroInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
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
    backgroundColor: 'rgba(241,181,69,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,154,42,0.35)',
  },
  headerKicker: {
    ...typography.eyebrow,
    color: brandColors.secondaryDark,
    letterSpacing: 0.8,
  },
  heroName: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.textPrimary,
    flex: 1,
  },
  heroEmail: {
    ...typography.bodySm,
    color: brandColors.textSecondary,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroStat: {
    minWidth: 82,
    maxWidth: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.secondaryDark,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  heroStatLabel: {
    ...typography.caption,
    color: brandColors.textSecondary,
    marginTop: 1,
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
  certRow: {
    marginBottom: spacing.md,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: brandColors.successSoft,
  },
  certPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: brandColors.warningSoft,
  },
  certRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: brandColors.dangerSoft,
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
