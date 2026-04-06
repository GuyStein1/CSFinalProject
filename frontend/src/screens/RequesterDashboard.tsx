import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
  ImageSourcePropType,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
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
  emoji: string;
  image: ImageSourcePropType;
  description: string;
  jobs: string[];
  color: string;
  softColor: string;
}

const CATEGORIES: CategoryInfo[] = [
  {
    value: 'ASSEMBLY',
    label: 'Assembly',
    emoji: '🔩',
    image: require('../../assets/Assembly.jpg'),
    description: 'Professional assembly of furniture, flat-packs, and home equipment.',
    jobs: [
      'Assemble IKEA furniture',
      'Build a wardrobe',
      'Set up a desk & chair',
      'Assemble a bed frame',
      'Put together shelving units',
      'Build a TV stand or sideboard',
    ],
    color: '#7B61FF',
    softColor: '#EFECFF',
  },
  {
    value: 'MOUNTING',
    label: 'Mounting',
    emoji: '📺',
    image: require('../../assets/Mounting.jpg'),
    description: 'Secure mounting of TVs, shelves, mirrors, curtain rods, and more.',
    jobs: [
      'Mount a TV on the wall',
      'Hang wall shelves',
      'Install curtain rods',
      'Hang a mirror or artwork',
      'Mount a whiteboard or corkboard',
      'Install floating wall cabinets',
    ],
    color: '#0D7C6E',
    softColor: '#E0F5F3',
  },
  {
    value: 'MOVING',
    label: 'Moving',
    emoji: '🚚',
    image: require('../../assets/Moving.jpg'),
    description: 'Help with moving furniture, packing, and heavy lifting.',
    jobs: [
      'Move furniture within home',
      'Help with apartment move',
      'Pack and label boxes',
      'Load / unload a truck',
      'Carry heavy items upstairs',
      'Disassemble & reassemble furniture for moving',
    ],
    color: '#1E8449',
    softColor: '#E6F4EC',
  },
  {
    value: 'PAINTING',
    label: 'Painting',
    emoji: '🎨',
    image: require('../../assets/Painting.jpg'),
    description: 'Interior and exterior painting — from single rooms to full homes.',
    jobs: [
      'Paint a room',
      'Touch up walls and ceilings',
      'Paint exterior trim',
      'Repaint kitchen cabinets',
      'Apply wallpaper',
      'Stain or varnish wood surfaces',
    ],
    color: '#C0392B',
    softColor: '#FCECEA',
  },
  {
    value: 'PLUMBING',
    label: 'Plumbing',
    emoji: '🚿',
    image: require('../../assets/Plumbing.jpg'),
    description: 'Leaks, blocked drains, faucet replacements, and water installations.',
    jobs: [
      'Fix a leaking pipe',
      'Unclog a drain',
      'Replace a faucet or tap',
      'Install a new shower head',
      'Fix a running toilet',
      'Connect a washing machine',
    ],
    color: '#2E86C1',
    softColor: '#E4F2FB',
  },
  {
    value: 'ELECTRICITY',
    label: 'Electricity',
    emoji: '⚡',
    image: require('../../assets/Electricity.jpg'),
    description: 'Electrical repairs, lighting installations, and outlet work.',
    jobs: [
      'Fix or replace a light fixture',
      'Install a new power outlet',
      'Replace a circuit breaker',
      'Set up smart home lighting',
      'Install a ceiling fan',
      'Rewire a light switch',
    ],
    color: '#D4900A',
    softColor: '#FEF3D7',
  },
  {
    value: 'OUTDOORS',
    label: 'Outdoors',
    emoji: '🌿',
    image: require('../../assets/Outdoors.jpg'),
    description: 'Garden care, lawn work, pressure washing, and outdoor maintenance.',
    jobs: [
      'Mow and edge the lawn',
      'Trim hedges and bushes',
      'Pressure wash patio or driveway',
      'Plant flowers or build garden beds',
      'Clear leaves and garden waste',
      'Assemble or repair garden furniture',
    ],
    color: '#27AE60',
    softColor: '#E8F8EF',
  },
  {
    value: 'CLEANING',
    label: 'Cleaning',
    emoji: '🧹',
    image: require('../../assets/Cleaning.jpg'),
    description: 'Professional home cleaning, deep cleans, and post-renovation tidy-ups.',
    jobs: [
      'Full apartment clean',
      'Deep clean kitchen and bathrooms',
      'Post-renovation cleanup',
      'Spring cleaning & decluttering',
      'Carpet and upholstery cleaning',
      'Window cleaning inside & out',
    ],
    color: '#8E44AD',
    softColor: '#F4ECF7',
  },
];

// Injects Poppins from Google Fonts on web (once, no extra package needed)
function useDisplayFont() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (document.getElementById('fixit-poppins')) return;
      const link = document.createElement('link');
      link.id = 'fixit-poppins';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  return Platform.OS === 'web' ? 'Poppins' : undefined;
}

export default function RequesterDashboard({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const { width } = useWindowDimensions();
  const displayFont = useDisplayFont();

  useEffect(() => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) setEmailVerified(false);
  }, []);

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setVerificationSent(true);
    } catch {
      // silently fail
    }
  };

  const isDesktop = width >= 768;
  const heroPaddingH = isDesktop ? 80 : spacing.xxl;
  const selected = CATEGORIES.find((c) => c.value === selectedCategory) ?? null;

  const handleCategoryPress = (value: Category) => {
    setSelectedCategory((prev) => (prev === value ? null : value));
  };

  const CARD_WIDTH = isDesktop ? 190 : 150;
  const CARD_HEIGHT = isDesktop ? 240 : 200;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#050D18', '#0C1E33', '#132D4A', '#1A3D63']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.hero, isDesktop && styles.heroDesktop]}
      >
        {/* Decorative glow orbs */}
        <View style={[styles.orb, styles.orbTopLeft]} />
        <View style={[styles.orb, styles.orbBottomRight]} />

        <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
          {/* Eyebrow */}
          <View style={styles.eyebrowBadge}>
            <Feather name="shield" size={11} color={brandColors.secondary} />
            <Text style={styles.eyebrowText}>YOUR TRUSTED LOCAL FIXERS</Text>
          </View>

          {/* Headline */}
          <Text
            style={[
              styles.headline,
              isDesktop && styles.headlineDesktop,
              displayFont ? { fontFamily: displayFont } : null,
            ]}
          >
            Let's Fix Your Problems
          </Text>

          {/* Subtitle */}
          <Text style={[styles.heroSubtitle, isDesktop && styles.heroSubtitleDesktop]}>
            What do you need help with today?
          </Text>

          {/* CTA — sharp corners for contrast with the rounded hero */}
          <Pressable
            style={({ pressed }) => [
              styles.heroCta,
              isDesktop && styles.heroCtaDesktop,
              { transform: [{ scale: pressed ? 0.96 : 1 }], opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <Feather name="plus" size={18} color={brandColors.primaryDark} />
            <Text style={[typography.button, { color: brandColors.primaryDark }]}>
              Post a Task
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* ── Email Verification Banner ──────────────────────────── */}
      {!emailVerified && (
        <View style={[styles.verifyBanner, { marginHorizontal: heroPaddingH }]}>
          <Feather name="alert-circle" size={18} color={brandColors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: brandColors.textPrimary }]}>
              Verify your email
            </Text>
            <Text style={[typography.caption, { color: brandColors.textMuted }]}>
              {verificationSent
                ? 'Verification email sent — check your inbox!'
                : 'Please verify your email to unlock all features.'}
            </Text>
          </View>
          {!verificationSent && (
            <Pressable onPress={handleResendVerification} style={styles.verifyBtn}>
              <Text style={[typography.caption, { color: brandColors.primary, fontWeight: '700' }]}>
                Resend
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Category Carousel ────────────────────────────────────── */}
      <View style={styles.section}>
        {/* Editorial section header */}
        <View style={[styles.sectionHeader, { paddingHorizontal: heroPaddingH }]}>
          <View style={styles.sectionAccentRule} />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionEyebrow}>POPULAR SERVICES</Text>
            <Text style={[typography.h2, { color: brandColors.textPrimary }]}>
              Browse by category
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.carouselContent,
            { paddingHorizontal: heroPaddingH },
          ]}
          decelerationRate="fast"
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.value;
            return (
              <Pressable
                key={cat.value}
                style={({ pressed }) => [
                  styles.carouselCard,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    borderColor: isActive ? cat.color : 'transparent',
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                onPress={() => handleCategoryPress(cat.value)}
              >
                <Image
                  source={cat.image}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.78)']}
                  style={styles.carouselOverlay}
                >
                  {/* Emoji badge — much more distinctive than a tiny icon */}
                  <View style={[styles.carouselEmojiBadge, { backgroundColor: cat.color }]}>
                    <Text style={styles.carouselEmoji}>{cat.emoji}</Text>
                  </View>
                  <Text style={styles.carouselLabel}>{cat.label}</Text>
                </LinearGradient>

                {isActive && (
                  <View style={[styles.activeRing, { borderColor: cat.color }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Category info panel ──────────────────────────────────── */}
      {selected && (
        <View
          style={[
            styles.infoPanel,
            {
              marginHorizontal: isDesktop ? heroPaddingH : 0,
              borderTopColor: selected.color,
            },
          ]}
        >
          {/* Top color stripe */}
          <View style={[styles.infoPanelStripe, { backgroundColor: selected.color }]} />

          <View style={styles.infoPanelBody}>
            <View style={styles.infoPanelHeader}>
              <Text style={styles.infoPanelEmoji}>{selected.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                  {selected.label}
                </Text>
                <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                  {selected.description}
                </Text>
              </View>
            </View>

            <Text style={[typography.label, styles.jobsLabel]}>Popular jobs</Text>
            <View style={styles.jobChips}>
              {selected.jobs.map((job) => (
                <Pressable
                  key={job}
                  style={({ pressed }) => [
                    styles.jobChip,
                    { borderColor: selected.softColor, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() =>
                    navigation.navigate('CreateTask', {
                      category: selected.value,
                      title: job,
                    })
                  }
                >
                  <Text style={styles.jobChipEmoji}>{selected.emoji}</Text>
                  <Text style={[typography.caption, { color: brandColors.textPrimary }]}>
                    {job}
                  </Text>
                </Pressable>
              ))}
            </View>

            <FButton
              onPress={() =>
                navigation.navigate('CreateTask', { category: selected.value })
              }
              variant="primary"
              size="md"
              iconRight="arrow-right"
              fullWidth
            >
              {`Post a ${selected.label} Task`}
            </FButton>
          </View>
        </View>
      )}
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
    paddingTop: spacing.xxxl + 8,
    paddingBottom: spacing.xxxl + 8,
    paddingHorizontal: spacing.xxl,
    overflow: 'hidden',
  },
  heroDesktop: {
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 80,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopLeft: {
    width: 260,
    height: 260,
    top: -100,
    left: -80,
    backgroundColor: 'rgba(42, 100, 160, 0.35)',
  },
  orbBottomRight: {
    width: 200,
    height: 200,
    bottom: -80,
    right: -60,
    backgroundColor: 'rgba(26, 61, 99, 0.5)',
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroContentDesktop: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(241, 181, 69, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(241, 181, 69, 0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: brandColors.secondary,
    textTransform: 'uppercase' as const,
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.8,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  headlineDesktop: {
    fontSize: 56,
    lineHeight: 66,
    letterSpacing: -2,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xxl + 4,
    lineHeight: 22,
  },
  heroSubtitleDesktop: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  // Sharp-cornered CTA — deliberate contrast with the rounded hero elements
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.secondary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.sharp,
    gap: spacing.sm,
    ...shadows.md,
  },
  heroCtaDesktop: {
    paddingHorizontal: 36,
    paddingVertical: 14,
  },

  // ── Verification banner ────────────────────────────────────────
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sharp,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  // Amber vertical rule to the left of the section title
  sectionAccentRule: {
    width: 4,
    height: 44,
    borderRadius: radii.sharp,
    backgroundColor: brandColors.secondary,
  },
  sectionHeaderText: {
    gap: 2,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: brandColors.textMuted,
    textTransform: 'uppercase' as const,
  },
  carouselContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  carouselCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 3,
    ...shadows.md,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Emoji badge — more character than a tiny icon
  carouselEmojiBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselEmoji: {
    fontSize: 15,
    lineHeight: 20,
  },
  carouselLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  activeRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xl,
    borderWidth: 3,
  },

  // ── Info panel — sharp top, rounded bottom, color stripe ───────
  infoPanel: {
    marginTop: spacing.xl,
    borderRadius: radii.xl,
    borderTopLeftRadius: radii.sharp,
    borderTopRightRadius: radii.sharp,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderTopWidth: 0, // stripe takes its place
    borderColor: brandColors.outlineLight,
    overflow: 'hidden',
    ...shadows.md,
  },
  infoPanelStripe: {
    height: 5,
  },
  infoPanelBody: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoPanelEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  jobsLabel: {
    color: brandColors.textMuted,
    marginTop: spacing.xs,
  },
  jobChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  jobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    backgroundColor: brandColors.background,
  },
  jobChipEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
});
