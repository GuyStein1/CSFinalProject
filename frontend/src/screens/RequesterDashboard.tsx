import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
  ImageSourcePropType,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FButton } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type Category =
  | 'ASSEMBLY'
  | 'MOUNTING'
  | 'MOVING'
  | 'PAINTING'
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'OUTDOORS'
  | 'CLEANING';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

interface CategoryInfo {
  value: Category;
  label: string;
  icon: string;
  image: ImageSourcePropType;
  desc: string;
  color: string;
  soft: string;
}

const HERO_CATEGORY: CategoryInfo = {
  value: 'MOVING',
  label: 'Moving',
  icon: 'truck-delivery',
  image: require('../../assets/Moving.jpg'),
  desc: 'Apartment, office, or single piece',
  color: '#1E8449',
  soft: '#E6F4EC',
};

const GRID_CATEGORIES: CategoryInfo[] = [
  { value: 'ASSEMBLY',    label: 'Assembly',    icon: 'hammer-screwdriver', image: require('../../assets/Assembly.jpg'),    desc: '', color: '#7B61FF', soft: '#EFECFF' },
  { value: 'MOUNTING',    label: 'Mounting',    icon: 'television',         image: require('../../assets/Mounting.jpg'),    desc: '', color: '#0D7C6E', soft: '#E0F5F3' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'brush',              image: require('../../assets/Painting.jpg'),    desc: '', color: '#C0392B', soft: '#FCECEA' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water-pump',         image: require('../../assets/Plumbing.jpg'),    desc: '', color: '#2E86C1', soft: '#E4F2FB' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt',     image: require('../../assets/Electricity.jpg'), desc: '', color: '#D4900A', soft: '#FEF3D7' },
  { value: 'OUTDOORS',    label: 'Outdoors',    icon: 'tree-outline',       image: require('../../assets/Outdoors.jpg'),    desc: '', color: '#27AE60', soft: '#E8F8EF' },
  { value: 'CLEANING',    label: 'Cleaning',    icon: 'broom',              image: require('../../assets/Cleaning.jpg'),    desc: '', color: '#8E44AD', soft: '#F4ECF7' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function RequesterDashboard({ navigation }: Props) {
  const [emailVerified, setEmailVerified] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const contentPadding = isDesktop ? 80 : spacing.lg;
  const columnGap = spacing.md;
  const gridWidth = width - contentPadding * 2;
  const cellWidth = (gridWidth - columnGap) / 2;

  const user = auth.currentUser;
  const firstName = user?.displayName?.split(' ')[0] ?? null;
  const greeting = getGreeting();

  useEffect(() => {
    if (user && !user.emailVerified) setEmailVerified(false);
  }, [user]);

  const handleResendVerification = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setVerificationSent(true);
    } catch {
      // silently fail
    }
  };

  const navigateToCreate = (category?: Category) => {
    navigation.navigate('CreateTask', category ? { category } : undefined);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[brandColors.primary, brandColors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.hero, isDesktop && { paddingHorizontal: contentPadding }]}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>REQUESTER</Text>
            <Text style={styles.greeting}>
              {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
            </Text>
            <Text style={styles.heroSub}>What needs fixing today?</Text>
          </View>
          <Pressable
            onPress={() => navigateToCreate()}
            style={({ pressed }) => [
              styles.fab,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
            accessibilityLabel="Post a Task"
          >
            <MaterialCommunityIcons name="plus" size={28} color={brandColors.primaryDark} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* ── Email Verification Banner ──────────────────────────── */}
      {!emailVerified && (
        <View style={[styles.verifyBanner, { marginHorizontal: contentPadding }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={brandColors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: brandColors.textPrimary }]}>Verify your email</Text>
            <Text style={[typography.caption, { color: brandColors.textMuted }]}>
              {verificationSent
                ? 'Verification email sent — check your inbox!'
                : 'Please verify your email to unlock all features.'}
            </Text>
          </View>
          {!verificationSent && (
            <Pressable onPress={() => void handleResendVerification()} style={styles.verifyBtn}>
              <Text style={[typography.caption, { color: brandColors.primary, fontWeight: '700' }]}>Resend</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Browse by Category ───────────────────────────────────── */}
      <View style={[styles.section, { paddingHorizontal: contentPadding }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <View>
            <Text style={styles.sectionEyebrow}>SERVICES</Text>
            <Text style={[typography.h2, { color: brandColors.textPrimary }]}>Browse by category</Text>
          </View>
        </View>

        {/* Moving — full-width hero card */}
        <Pressable
          onPress={() => navigateToCreate(HERO_CATEGORY.value)}
          style={({ pressed }) => [
            styles.heroCard,
            { opacity: pressed ? 0.94 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Image source={HERO_CATEGORY.image} style={styles.heroCardImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(15,36,56,0.08)', 'rgba(15,36,56,0.82)']}
            style={styles.heroCardOverlay}
          >
            <View style={styles.heroCardFooter}>
              <View style={[styles.catIconBadge, { backgroundColor: HERO_CATEGORY.color }]}>
                <MaterialCommunityIcons name={HERO_CATEGORY.icon as never} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroCardEyebrow}>FEATURED</Text>
                <Text style={styles.heroCardTitle}>{HERO_CATEGORY.label}</Text>
                <Text style={styles.heroCardDesc}>{HERO_CATEGORY.desc}</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* 2-column grid for remaining categories */}
        <View style={styles.grid}>
          {GRID_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => navigateToCreate(cat.value)}
              style={({ pressed }) => [
                styles.gridCell,
                {
                  width: cellWidth,
                  backgroundColor: cat.soft,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View style={[styles.gridIconCircle, { backgroundColor: cat.color }]}>
                <MaterialCommunityIcons name={cat.icon as never} size={20} color="#fff" />
              </View>
              <Text style={[styles.gridCellLabel, { color: cat.color }]}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Post a Task CTA ─────────────────────────────────────── */}
      <View style={[styles.ctaSection, { paddingHorizontal: contentPadding }]}>
        <FButton
          onPress={() => navigateToCreate()}
          variant="primary"
          size="lg"
          icon="plus"
          fullWidth
        >
          Post a Task
        </FButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scroll: {
    paddingBottom: 64,
  },

  // ── Hero ───────────────────────────────────────────────────────
  hero: {
    paddingTop: spacing.xl + 4,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: brandColors.secondary,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
    color: brandColors.textOnDark,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 15,
    color: brandColors.textOnDarkMuted,
    marginTop: 2,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: brandColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...shadows.md,
  },

  // ── Verification banner ────────────────────────────────────────
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: brandColors.warningSoft,
    borderLeftWidth: 3,
    borderLeftColor: brandColors.warning,
  },
  verifyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },

  // ── Category section ───────────────────────────────────────────
  section: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionAccent: {
    width: 4,
    height: 44,
    borderRadius: 2,
    backgroundColor: brandColors.secondary,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: brandColors.textMuted,
    textTransform: 'uppercase',
  },

  // ── Moving hero card ───────────────────────────────────────────
  heroCard: {
    height: 140,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  heroCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  catIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroCardEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: brandColors.secondary,
  },
  heroCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  heroCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },

  // ── 2-column grid ─────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCell: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 90,
    justifyContent: 'flex-end',
    ...shadows.sm,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellLabel: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── CTA section ────────────────────────────────────────────────
  ctaSection: {
    marginTop: spacing.xxl,
  },
});
