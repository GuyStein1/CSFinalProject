import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
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

const SPECIALIZATIONS = [
  { value: 'ASSEMBLY', label: 'Assembly', icon: 'tools' },
  { value: 'MOUNTING', label: 'Mounting', icon: 'wall' },
  { value: 'MOVING', label: 'Moving', icon: 'truck-outline' },
  { value: 'PAINTING', label: 'Painting', icon: 'brush-outline' },
  { value: 'PLUMBING', label: 'Plumbing', icon: 'pipe-wrench' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt-outline' },
  { value: 'OUTDOORS', label: 'Outdoors', icon: 'tree-outline' },
  { value: 'CLEANING', label: 'Cleaning', icon: 'broom' },
] as const;

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

export default function FixerProfileScreen() {
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

  const handleAvatarPress = () => {
    if (profile?.avatar_url) {
      Alert.alert('Profile Photo', undefined, [
        { text: 'View Photo', onPress: () => setViewingAvatar(true) },
        { text: 'Change Photo', onPress: () => void pickNewAvatar() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      void pickNewAvatar();
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/api/users/me', {
        full_name: fullName.trim(),
        bio: bio.trim(),
        phone_number: phone.trim() || undefined,
        payment_link: paymentLink.trim() || undefined,
        specializations,
      });
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar ─────────────────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <Pressable onPress={() => void handleAvatarPress()} style={styles.avatarWrapper}>
          {profile?.avatar_url ? (
            <Avatar.Image size={96} source={{ uri: profile.avatar_url }} />
          ) : (
            <Avatar.Icon
              size={96}
              icon="account"
              style={{ backgroundColor: brandColors.primaryMuted }}
            />
          )}
          <View style={styles.cameraBadge}>
            {uploadingAvatar ? (
              <MaterialCommunityIcons name="loading" size={14} color={brandColors.white} />
            ) : (
              <MaterialCommunityIcons name="camera" size={14} color={brandColors.white} />
            )}
          </View>
        </Pressable>

        <Text style={[typography.h2, { color: brandColors.textPrimary, marginTop: spacing.md }]}>
          {profile?.full_name}
        </Text>

        {avgRating != null && avgRating > 0 && (
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={16} color={brandColors.secondary} />
            <Text style={[typography.bodyMedium, { color: brandColors.textSecondary, marginLeft: spacing.xs }]}>
              {avgRating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Edit Form ──────────────────────────────────────────────── */}
      <FCard style={styles.section} shadow="sm">
        <Text style={[typography.eyebrow, { color: brandColors.textMuted, marginBottom: spacing.lg }]}>
          Profile Details
        </Text>

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
        {!paymentLink.trim() && (
          <View style={styles.warningRow}>
            <MaterialCommunityIcons name="alert-outline" size={14} color={brandColors.warning} />
            <Text style={[typography.caption, { color: brandColors.warning, marginLeft: spacing.xs, flex: 1 }]}>
              Add a payment link so requesters can pay you after completing a job.
            </Text>
          </View>
        )}

        <FButton onPress={() => void handleSaveProfile()} loading={saving} disabled={saving} fullWidth style={{ marginTop: spacing.sm }}>
          Save Profile
        </FButton>
      </FCard>

      {/* ── Specializations ───────────────────────────────────────── */}
      <FCard style={styles.section} shadow="sm">
        <Text style={[typography.eyebrow, { color: brandColors.textMuted, marginBottom: spacing.md }]}>
          What do you work on?
        </Text>
        <View style={styles.chipsWrap}>
          {SPECIALIZATIONS.map(s => (
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
        <Text style={[typography.caption, { color: brandColors.textMuted, marginTop: spacing.sm }]}>
          Tap to select. Saved with "Save Profile" above.
        </Text>
      </FCard>

      {/* ── Portfolio ─────────────────────────────────────────────── */}
      <FCard style={styles.section} shadow="sm">
        <View style={styles.portfolioHeader}>
          <Text style={[typography.eyebrow, { color: brandColors.textMuted }]}>
            My Portfolio
          </Text>
          <View style={styles.countChip}>
            <Text style={[typography.caption, { color: brandColors.primary }]}>
              {portfolioItems.length} {portfolioItems.length === 1 ? 'photo' : 'photos'}
            </Text>
          </View>
        </View>

        <View style={styles.portfolioGrid}>
          {/* Add tile */}
          <Pressable
            onPress={() => void handleAddPortfolio()}
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
            <Pressable
              key={item.id}
              onLongPress={() => handleDeletePortfolio(item)}
              style={styles.portfolioTile}
            >
              <Image source={{ uri: item.image_url }} style={styles.portfolioImage} />
            </Pressable>
          ))}
        </View>
        <Text style={[typography.caption, { color: brandColors.textMuted, marginTop: spacing.sm }]}>
          Long-press a photo to delete it.
        </Text>
      </FCard>

      {/* Avatar viewer modal */}
      <Modal visible={viewingAvatar} transparent animationType="fade" onRequestClose={() => setViewingAvatar(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setViewingAvatar(false)}>
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
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: brandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brandColors.background,
    ...shadows.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  section: {
    width: '100%',
    maxWidth: 500,
    marginBottom: spacing.lg,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.warningSoft,
    marginTop: spacing.xs,
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
