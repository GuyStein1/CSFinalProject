import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FButton } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import {
  CATEGORY_LIST,
  CATEGORY_METADATA,
  type Category,
  type CategoryMetadata,
} from '../utils/categoryMetadata';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

const HERO_CATEGORY = CATEGORY_METADATA.MOVING;
const FEATURED_CATEGORIES = [
  CATEGORY_METADATA.MOUNTING,
  CATEGORY_METADATA.PLUMBING,
  CATEGORY_METADATA.ELECTRICITY,
] as const;

const WORKSPACE_STEPS = [
  {
    icon: 'clipboard-edit-outline',
    title: 'Post clearly',
    copy: 'Add the job, area, budget, and photos so Fixers can price it quickly.',
  },
  {
    icon: 'hand-extended-outline',
    title: 'Compare bids',
    copy: 'Review offers, availability, and fit from your task workspace.',
  },
  {
    icon: 'check-decagram-outline',
    title: 'Finish confidently',
    copy: 'Track progress, mark completion, and keep the record in one place.',
  },
] as const;

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

  const wide = width >= 900;
  const tablet = width >= 680;
  const horizontalPadding = wide ? spacing.xxxl : spacing.lg;
  const contentWidth = Math.min(width, 1120);
  const categoryColumns = wide ? 4 : 2;
  const categoryGap = spacing.md;
  const availableContentWidth = Math.max(0, contentWidth - horizontalPadding * 2);
  const categoryCellWidth =
    Math.max(0, (availableContentWidth - categoryGap * (categoryColumns - 1)) / categoryColumns);

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

  const quickActions = [
    {
      icon: 'plus-circle-outline',
      title: 'Post Task',
      copy: 'Start a new request with photos, budget, and location.',
      action: () => navigateToCreate(),
      tone: brandColors.secondary,
      soft: brandColors.warningSoft,
    },
    {
      icon: 'clipboard-list-outline',
      title: 'My Tasks',
      copy: 'Review bids, edit open requests, and mark active jobs complete.',
      action: () => navigation.navigate('MyTasks'),
      tone: brandColors.primaryMuted,
      soft: brandColors.infoSoft,
    },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[brandColors.primary, brandColors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.heroInner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
            <View style={styles.workspacePill}>
              <View style={styles.liveDot} />
              <Text style={styles.workspacePillText}>Requester workspace</Text>
            </View>

            <Text style={styles.greeting}>
              {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
            </Text>
            <Text style={styles.heroSub}>
              Post a clear home task, compare local Fixer bids, and keep every job moving from
              one focused workspace.
            </Text>

            <View style={[styles.heroActions, !tablet && styles.heroActionsStacked]}>
              <FButton
                onPress={() => navigateToCreate()}
                variant="secondary"
                size="lg"
                icon="plus"
                style={!tablet ? styles.fullWidthButton : undefined}
              >
                Post Task
              </FButton>
              <Pressable
                onPress={() => navigation.navigate('MyTasks')}
                accessibilityRole="button"
                accessibilityLabel="Open my tasks"
                style={({ pressed }) => [
                  styles.heroGhostBtn,
                  !tablet && styles.fullWidthButton,
                  { opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={18}
                  color={brandColors.textOnDark}
                />
                <Text style={styles.heroGhostText}>My Tasks</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.heroPanel, wide && styles.heroPanelWide]}>
            <Text style={styles.panelEyebrow}>Next best action</Text>
            <Text style={styles.panelTitle}>Post the task once. Manage the rest here.</Text>
            <View style={styles.panelDivider} />
            <View style={styles.panelRow}>
              <View style={styles.panelIconShell}>
                <MaterialCommunityIcons name="camera-plus-outline" size={19} color={brandColors.secondary} />
              </View>
              <View style={styles.panelText}>
                <Text style={styles.panelRowTitle}>Photos help bids arrive faster</Text>
                <Text style={styles.panelRowCopy}>Add context before local Fixers quote the work.</Text>
              </View>
            </View>
            <View style={styles.panelRow}>
              <View style={styles.panelIconShell}>
                <MaterialCommunityIcons name="shield-check-outline" size={19} color={brandColors.secondary} />
              </View>
              <View style={styles.panelText}>
                <Text style={styles.panelRowTitle}>Your task history stays organized</Text>
                <Text style={styles.panelRowCopy}>Open, in-progress, completed, and canceled jobs remain separated.</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        {!emailVerified && (
          <View style={styles.verifyBanner}>
            <View style={styles.verifyIcon}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={brandColors.warning}
              />
            </View>
            <View style={styles.verifyCopy}>
              <Text style={[typography.label, { color: brandColors.textPrimary }]}>Verify your email</Text>
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                {verificationSent
                  ? 'Verification email sent. Check your inbox to unlock every workspace feature.'
                  : 'Please verify your email to unlock every workspace feature.'}
              </Text>
            </View>
            {!verificationSent && (
              <Pressable
                onPress={() => void handleResendVerification()}
                accessibilityRole="button"
                accessibilityLabel="Resend verification email"
                style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[typography.caption, styles.verifyBtnText]}>Resend</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Controls</Text>
              <Text style={[typography.h2, { color: brandColors.textPrimary }]}>Run your request</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open profile settings"
              style={({ pressed }) => [styles.profileShortcut, { opacity: pressed ? 0.72 : 1 }]}
            >
              <MaterialCommunityIcons name="account-cog-outline" size={18} color={brandColors.primary} />
            </Pressable>
          </View>

          <View style={[styles.quickGrid, wide && styles.quickGridWide]}>
            {quickActions.map((action) => (
              <Pressable
                key={action.title}
                onPress={action.action}
                accessibilityRole="button"
                accessibilityLabel={action.title}
                style={({ pressed }) => [
                  styles.quickTile,
                  wide && styles.quickTileWide,
                  {
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <View style={[styles.quickIcon, { backgroundColor: action.soft }]}>
                  <MaterialCommunityIcons name={action.icon as never} size={22} color={action.tone} />
                </View>
                <View style={styles.quickText}>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{action.title}</Text>
                  <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{action.copy}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={brandColors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Services</Text>
              <Text style={[typography.h2, { color: brandColors.textPrimary }]}>Start with a category</Text>
            </View>
          </View>

          <View style={[styles.serviceLayout, wide && styles.serviceLayoutWide]}>
            <ServiceHeroCard
              category={HERO_CATEGORY}
              onPress={() => navigateToCreate(HERO_CATEGORY.value)}
              wide={wide}
            />
            <View style={[styles.featuredStack, wide && styles.featuredStackWide]}>
              {FEATURED_CATEGORIES.map((category) => (
                <ServiceMiniCard
                  key={category.value}
                  category={category}
                  onPress={() => navigateToCreate(category.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.categoryGrid}>
            {CATEGORY_LIST.map((category) => (
              <Pressable
                key={category.value}
                onPress={() => navigateToCreate(category.value)}
                accessibilityRole="button"
                accessibilityLabel={`Post a ${category.label} task`}
                style={({ pressed }) => [
                  styles.categoryTile,
                  {
                    width: categoryCellWidth,
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.bg }]}>
                  <MaterialCommunityIcons name={category.icon as never} size={19} color={category.color} />
                </View>
                <Text style={[typography.label, styles.categoryLabel]} numberOfLines={1}>
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Flow</Text>
              <Text style={[typography.h2, { color: brandColors.textPrimary }]}>How requests move</Text>
            </View>
          </View>

          <View style={[styles.stepGrid, wide && styles.stepGridWide]}>
            {WORKSPACE_STEPS.map((step, index) => (
              <View key={step.title} style={[styles.stepItem, wide && styles.stepItemWide]}>
                <View style={styles.stepTopRow}>
                  <View style={styles.stepIcon}>
                    <MaterialCommunityIcons name={step.icon as never} size={20} color={brandColors.primary} />
                  </View>
                  <Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{step.title}</Text>
                <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{step.copy}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function ServiceHeroCard({
  category,
  onPress,
  wide,
}: {
  category: CategoryMetadata;
  onPress: () => void;
  wide: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Post a ${category.label} task`}
      style={({ pressed }) => [
        styles.serviceHero,
        wide && styles.serviceHeroWide,
        {
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <Image source={category.image} style={styles.serviceHeroImage} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(15,36,56,0.02)', 'rgba(15,36,56,0.88)']}
        style={styles.serviceHeroOverlay}
      >
        <View style={[styles.serviceIcon, { backgroundColor: category.color }]}>
          <MaterialCommunityIcons name={category.icon as never} size={21} color={brandColors.white} />
        </View>
        <View style={styles.serviceHeroText}>
          <Text style={styles.serviceEyebrow}>Featured request</Text>
          <Text style={styles.serviceTitle}>{category.label}</Text>
          <Text style={styles.serviceCopy}>{category.description}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function ServiceMiniCard({ category, onPress }: { category: CategoryMetadata; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Post a ${category.label} task`}
      style={({ pressed }) => [
        styles.serviceMini,
        {
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Image source={category.image} style={styles.serviceMiniImage} resizeMode="cover" />
      <View style={styles.serviceMiniShade} />
      <View style={[styles.serviceMiniIcon, { backgroundColor: category.bg }]}>
        <MaterialCommunityIcons name={category.icon as never} size={17} color={category.color} />
      </View>
      <View style={styles.serviceMiniText}>
        <Text style={styles.serviceMiniTitle}>{category.label}</Text>
        <Text style={styles.serviceMiniCopy} numberOfLines={1}>
          {category.description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scroll: {
    paddingBottom: 88,
  },
  hero: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  heroInner: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    gap: spacing.xxl,
  },
  heroCopy: {
    gap: spacing.md,
  },
  heroCopyWide: {
    maxWidth: 610,
  },
  workspacePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.12)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: brandColors.secondary,
  },
  workspacePillText: {
    ...typography.eyebrow,
    color: brandColors.textOnDark,
  },
  greeting: {
    ...typography.hero,
    color: brandColors.textOnDark,
    maxWidth: 640,
  },
  heroSub: {
    ...typography.body,
    color: brandColors.textOnDarkMuted,
    maxWidth: 620,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroActionsStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  fullWidthButton: {
    width: '100%',
  },
  heroGhostBtn: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.28)',
  },
  heroGhostText: {
    ...typography.button,
    color: brandColors.textOnDark,
  },
  heroPanel: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.14)',
    gap: spacing.md,
  },
  heroPanelWide: {
    position: 'absolute',
    right: spacing.xxxl,
    top: spacing.sm,
    width: 350,
  },
  panelEyebrow: {
    ...typography.eyebrow,
    color: brandColors.secondary,
  },
  panelTitle: {
    ...typography.h2,
    color: brandColors.textOnDark,
  },
  panelDivider: {
    height: 1,
    backgroundColor: 'rgba(255,252,246,0.14)',
  },
  panelRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  panelIconShell: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelText: {
    flex: 1,
    gap: 2,
  },
  panelRowTitle: {
    ...typography.label,
    color: brandColors.textOnDark,
  },
  panelRowCopy: {
    ...typography.caption,
    color: brandColors.textOnDarkMuted,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: -spacing.xl,
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.warningSoft,
    ...shadows.sm,
  },
  verifyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyCopy: {
    flex: 1,
    gap: 2,
  },
  verifyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.warningSoft,
  },
  verifyBtnText: {
    color: brandColors.warning,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.xxxl,
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: brandColors.primaryMuted,
  },
  profileShortcut: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  quickGrid: {
    gap: spacing.md,
  },
  quickGridWide: {
    flexDirection: 'row',
  },
  quickTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    ...shadows.sm,
  },
  quickTileWide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    flex: 1,
    gap: spacing.xs,
  },
  serviceLayout: {
    gap: spacing.md,
  },
  serviceLayoutWide: {
    flexDirection: 'row',
  },
  serviceHero: {
    minHeight: 250,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: brandColors.primaryDark,
    ...shadows.md,
  },
  serviceHeroWide: {
    flex: 1,
  },
  serviceHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  serviceHeroOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHeroText: {
    gap: spacing.xs,
  },
  serviceEyebrow: {
    ...typography.eyebrow,
    color: brandColors.secondary,
  },
  serviceTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.white,
  },
  serviceCopy: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.86)',
    maxWidth: 360,
  },
  featuredStack: {
    gap: spacing.md,
  },
  featuredStackWide: {
    width: 330,
  },
  serviceMini: {
    minHeight: 74,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: brandColors.primaryDark,
    ...shadows.sm,
  },
  serviceMiniImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  serviceMiniShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,36,56,0.58)',
  },
  serviceMiniIcon: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceMiniText: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
    paddingLeft: 58,
  },
  serviceMiniTitle: {
    ...typography.label,
    color: brandColors.white,
  },
  serviceMiniCopy: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.76)',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryTile: {
    minHeight: 96,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    justifyContent: 'space-between',
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: brandColors.textPrimary,
  },
  stepGrid: {
    gap: spacing.md,
  },
  stepGridWide: {
    flexDirection: 'row',
  },
  stepItem: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    gap: spacing.sm,
  },
  stepItemWide: {
    flex: 1,
  },
  stepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: brandColors.surfaceAlt,
  },
});
