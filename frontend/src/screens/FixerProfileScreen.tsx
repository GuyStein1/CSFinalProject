import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/axiosInstance';
import { uploadImage } from '../utils/uploadImage';
import { FButton, FCard, FChip, FInput } from '../components/ui';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors, radii, shadows, spacing, typography } from '../theme';
import { CATEGORY_LIST } from '../utils/categoryMetadata';

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
  const { width } = useWindowDimensions();
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
      Alert.alert('Error', 'Failed to load profile.');
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
      Alert.alert('Error', 'Failed to update avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };


  const handleSaveProfile = async () => {
    const nextPaymentLink = paymentLink.trim();
    if (nextPaymentLink && !isValidUrl(nextPaymentLink)) {
      Alert.alert('Check payment link', 'Enter a full payment URL before saving.');
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
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save profile.');
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
      Alert.alert('Saved', 'Trade coverage updated.');
    } catch {
      Alert.alert('Error', 'Failed to save trade coverage.');
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
      Alert.alert('Error', 'Failed to upload portfolio photo.');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolio = (item: PortfolioItem) => {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/users/me/portfolio/${item.id}`);
            setPortfolioItems(prev => prev.filter(p => p.id !== item.id));
          } catch {
            Alert.alert('Error', 'Failed to delete photo.');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen label="Loading profile..." />;

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
          label: 'Unsaved payment link',
          color: brandColors.warning,
          style: styles.paymentMissing,
          message: 'Payment link changes are not saved yet.',
        }
      : currentPaymentLink.length === 0
      ? {
          icon: 'alert-circle-outline',
          label: 'Payment needed',
          color: brandColors.warning,
          style: styles.paymentMissing,
          message: 'Payment link missing. Requesters need a payout destination after completion.',
        }
      : !currentPaymentLinkValid
        ? {
            icon: 'alert-circle-outline',
            label: 'Invalid payment URL',
            color: brandColors.danger,
            style: styles.paymentInvalid,
            message: 'Enter a full payment URL before saving.',
          }
        : paymentLinkChanged
          ? {
              icon: 'content-save-alert-outline',
              label: 'Unsaved payment link',
              color: brandColors.warning,
              style: styles.paymentMissing,
              message: 'Payment link changes are not saved yet.',
            }
          : savedPaymentLinkValid
            ? {
                icon: 'check-circle-outline',
                label: 'Payment link saved',
                color: brandColors.success,
                style: styles.paymentReady,
                message: null,
              }
            : {
                icon: 'alert-circle-outline',
                label: 'Check payment link',
                color: brandColors.warning,
                style: styles.paymentMissing,
                message: 'Payment link needs to be reviewed before it can be used.',
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
              <Text style={styles.headerKicker}>Fixer Profile</Text>
            </View>
            <Text style={styles.heroName} numberOfLines={2}>{displayName}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{profile?.email}</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {avgRating != null && avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                </Text>
                <Text style={styles.heroStatLabel}>Rating</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{specializations.length}</Text>
                <Text style={styles.heroStatLabel}>Trades</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{portfolioItems.length}</Text>
                <Text style={styles.heroStatLabel}>Photos</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{completionPercent}%</Text>
                <Text style={styles.heroStatLabel}>Profile</Text>
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
                  <Text style={styles.sectionKicker}>Profile details</Text>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>Basics and payout</Text>
                </View>
              </View>

              <FInput label="Full Name" value={fullName} onChangeText={setFullName} returnKeyType="next" />
              <FInput
                label="Bio"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                returnKeyType="next"
              />
              <FInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              <FInput
                label="Payment Link (Bit / Paybox URL)"
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
                Save Profile
              </FButton>
            </FCard>

            <FCard style={styles.section} shadow="sm">
              <View style={styles.portfolioHeader}>
                <View style={styles.sectionHeaderCompact}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="tools" size={18} color={brandColors.primary} />
                  </View>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>Trade coverage</Text>
                </View>
                <View style={styles.countChip}>
                  <Text style={[typography.caption, { color: brandColors.primary }]}>
                    {specializations.length} selected
                  </Text>
                </View>
                {hasSpecializationChanges && (
                  <View style={styles.unsavedChip}>
                    <MaterialCommunityIcons name="content-save-alert-outline" size={12} color={brandColors.warning} />
                    <Text style={[typography.caption, styles.unsavedChipText]}>Unsaved</Text>
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
                  {hasSpecializationChanges ? 'Save Trades' : 'Trades Saved'}
                </FButton>
              </View>
              <View style={styles.chipsWrap}>
                {CATEGORY_LIST.map(s => (
                  <FChip
                    key={s.value}
                    label={s.label}
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
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>Portfolio</Text>
                </View>
                <View style={styles.countChip}>
                  <Text style={[typography.caption, { color: brandColors.primary }]}>
                    {portfolioItems.length} {portfolioItems.length === 1 ? 'photo' : 'photos'}
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
                        Add photo
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
    gap: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.secondary,
    ...shadows.md,
  },
  profileHeroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xxl,
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
