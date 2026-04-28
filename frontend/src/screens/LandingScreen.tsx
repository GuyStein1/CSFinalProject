import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLogo from '../components/AppLogo';
import { FButton } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import { CATEGORY_LIST, CATEGORY_METADATA, type Category } from '../constants/categories';

interface Props {
  isSignedIn?: boolean;
  onLogin?: () => void;
  onCreateAccount?: () => void;
  onPostTask: (category?: Category) => void;
  onCategoryPress?: (category: Category) => void;
  onCategorySelect?: (category: Category) => void;
  onDashboard?: () => void;
  onRequesterHome?: () => void;
  onRequesterTasks?: () => void;
  onMyTasks?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onBecomeFixer?: () => void;
  onFixerHome?: () => void;
  onFixerBids?: () => void;
  onFixerProfile?: () => void;
}

const CATEGORIES = CATEGORY_LIST;

const SAMPLE_TASKS = [
  { label: 'IKEA bed frame', category: CATEGORY_METADATA.ASSEMBLY, price: '₪120' },
  { label: 'TV mounting', category: CATEGORY_METADATA.MOUNTING, price: '₪90' },
  { label: 'Office move', category: CATEGORY_METADATA.MOVING, price: '₪350' },
  { label: 'Leaky faucet', category: CATEGORY_METADATA.PLUMBING, price: '₪200' },
];

const STATS = [
  { value: '2,400+', label: 'Tasks posted' },
  { value: '1,800+', label: 'Active fixers' },
  { value: '98%',    label: 'Satisfaction' },
  { value: '4.9★',   label: 'Avg. rating' },
];

const STEPS = [
  { n: '01', icon: 'plus-circle-outline',  title: 'Post your task',  desc: 'Describe the job, set your budget, and pin your location.' },
  { n: '02', icon: 'account-search',       title: 'Pick a fixer',    desc: 'Browse bids from verified fixers in your neighborhood.' },
  { n: '03', icon: 'check-circle-outline', title: 'Job done',        desc: 'Your fixer arrives, completes the work, and you pay.' },
];

const FIXER_BENEFITS = [
  { icon: 'calendar-check',   title: 'Choose your hours',   desc: 'Accept jobs when it suits you.' },
  { icon: 'map-marker-radius', title: 'Work nearby',         desc: 'Only see jobs close to you.' },
  { icon: 'cash-multiple',    title: 'Get paid quickly',    desc: 'Payment released when done.' },
  { icon: 'star-circle',      title: 'Build reputation',    desc: 'Reviews boost your profile.' },
];

function useFloat(delay = 0) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -8,  duration: 1800, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  return anim;
}

export default function LandingScreen({
  isSignedIn = false,
  onLogin,
  onCreateAccount,
  onPostTask,
  onCategoryPress,
  onCategorySelect,
  onDashboard,
  onRequesterHome,
  onRequesterTasks,
  onMyTasks,
  onNotifications,
  onProfile,
  onSettings,
  onBecomeFixer,
  onFixerHome,
  onFixerBids,
  onFixerProfile: _onFixerProfile,
}: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const mid  = width >= 600;
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('MOVING');
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<'how' | 'categories' | 'fixers', number>>({
    how: 0,
    categories: 0,
    fixers: 0,
  });

  const f0 = useFloat(0);
  const f1 = useFloat(400);
  const f2 = useFloat(800);
  const f3 = useFloat(200);
  const floats = [f0, f1, f2, f3];

  const catCols = wide ? 4 : mid ? 2 : 1;
  const catCellW = (width - (wide ? 160 : spacing.xxl * 2) - spacing.md * (catCols - 1)) / catCols;

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setMenuOpen(false);
  };

  const scrollToSection = (section: 'how' | 'categories' | 'fixers') => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionOffsets.current[section] - 76),
      animated: true,
    });
    setMenuOpen(false);
  };

  const runAndClose = (action?: () => void) => {
    setMenuOpen(false);
    action?.();
  };

  const handlePostTask = (category?: Category) => {
    setMenuOpen(false);
    onPostTask(category);
  };

  const handleCategoryPress = (category: Category) => {
    setMenuOpen(false);
    setSelectedCategory(category);
  };

  const handleLogin = () => {
    runAndClose(onLogin ?? (() => onPostTask()));
  };

  const handleCreateAccount = () => {
    runAndClose(onCreateAccount ?? onLogin ?? (() => onPostTask()));
  };

  const handleFixerCta = () => {
    if (isSignedIn) {
      runAndClose(onFixerHome ?? onBecomeFixer ?? onLogin ?? onDashboard ?? (() => onPostTask()));
      return;
    }
    runAndClose(onFixerHome ?? onBecomeFixer ?? onLogin ?? (() => onPostTask()));
  };

  const handleCategoryTask = (category: Category) => {
    setMenuOpen(false);
    (onCategoryPress ?? onCategorySelect ?? onPostTask)(category);
  };

  const handleRequesterHome = () => {
    runAndClose(onRequesterHome ?? onDashboard ?? onLogin ?? (() => onPostTask()));
  };
  const handleRequesterTasks = () => {
    runAndClose(onRequesterTasks ?? onMyTasks ?? onRequesterHome ?? onDashboard ?? onLogin ?? (() => onPostTask()));
  };
  const handleNotifications = () => {
    runAndClose(onNotifications ?? onRequesterHome ?? onDashboard ?? onLogin ?? (() => onPostTask()));
  };
  const handleProfile = () => {
    runAndClose(onProfile ?? onSettings ?? onRequesterHome ?? onDashboard ?? onLogin ?? (() => onPostTask()));
  };
  const handleFixerBids = () => {
    runAndClose(onFixerBids ?? onFixerHome ?? onBecomeFixer ?? onLogin ?? onRequesterHome ?? onDashboard ?? (() => onPostTask()));
  };
  const selectedCategoryMeta = CATEGORY_METADATA[selectedCategory];
  const signedInNavItems = [
    { label: 'Dashboard', icon: 'view-dashboard-outline', onPress: handleRequesterHome },
    { label: 'My Tasks', icon: 'clipboard-list-outline', onPress: handleRequesterTasks },
    { label: 'Find Jobs', icon: 'map-search-outline', onPress: handleFixerCta },
    { label: 'My Bids', icon: 'format-list-bulleted', onPress: handleFixerBids },
    { label: 'Notifications', icon: 'bell-outline', onPress: handleNotifications },
    { label: 'Profile & Settings', icon: 'account-outline', onPress: handleProfile },
  ];
  const signedOutNavItems = [
    { label: 'How it works', icon: 'progress-check', onPress: () => scrollToSection('how') },
    { label: 'Categories', icon: 'shape-outline', onPress: () => scrollToSection('categories') },
    { label: 'For Fixers', icon: 'account-hard-hat-outline', onPress: () => scrollToSection('fixers') },
  ];
  const navItems = isSignedIn ? signedInNavItems : signedOutNavItems;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.nav,
          Platform.OS === 'web' && ({
            position: 'fixed',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          } as object),
        ]}
      >
        <View style={[styles.navInner, wide && styles.navInnerWide]}>
          <Pressable
            style={styles.navBrand}
            onPress={scrollToTop}
            accessibilityRole="button"
            accessibilityLabel="Back to landing top"
          >
            <AppLogo iconOnly />
            <Text style={styles.navWordmark}>FixIt</Text>
          </Pressable>

          {wide && (
            <View style={styles.navLinks}>
              {navItems.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                >
                  <Text style={styles.navLink}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.navActions}>
            {!isSignedIn && wide && (
              <Pressable onPress={handleLogin} style={styles.navLogin}>
                <Text style={styles.navLoginText}>Log In</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => handlePostTask()}
              style={({ pressed }) => [
                styles.navCta,
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text style={styles.navCtaText}>{isSignedIn ? 'Post a Task' : 'Get Started'}</Text>
            </Pressable>
            {!wide && (
              <Pressable
                onPress={() => setMenuOpen((open) => !open)}
                style={styles.menuButton}
                accessibilityRole="button"
                accessibilityLabel={menuOpen ? 'Close landing menu' : 'Open landing menu'}
              >
                <MaterialCommunityIcons
                  name={menuOpen ? 'close' : 'menu'}
                  size={22}
                  color={brandColors.textOnDark}
                />
              </Pressable>
            )}
          </View>
        </View>

        {!wide && menuOpen && (
          <View style={styles.mobileMenu}>
            {navItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name={item.icon as never} size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>{item.label}</Text>
              </Pressable>
            ))}
            {!isSignedIn && (
              <Pressable
                onPress={handleLogin}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name="login" size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>Log In</Text>
              </Pressable>
            )}
            {!isSignedIn && onCreateAccount && (
              <Pressable
                onPress={handleCreateAccount}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>Create Account</Text>
              </Pressable>
            )}
            {!isSignedIn && (
              <Pressable
                onPress={handleFixerCta}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name="account-hard-hat-outline" size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>Become a Fixer</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[brandColors.primary, brandColors.primaryDark]}
        style={[styles.hero, Platform.OS === 'web' && { paddingTop: 88 }]}
      >
        <AppLogo variant="heroSilhouette" style={styles.heroSilhouette} />
        <View style={[styles.heroContent, wide && styles.heroContentWide]}>
          {/* Left column */}
          <View style={[styles.heroLeft, wide && { flex: 1, maxWidth: 540 }]}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="map-marker" size={12} color={brandColors.secondary} />
              <Text style={styles.heroBadgeText}>Available across Israel</Text>
            </View>
            <Text style={styles.heroHeadline}>
              Home help,{'\n'}
              <Text style={{ color: brandColors.secondary }}>without the runaround.</Text>
            </Text>
            <Text style={styles.heroSub}>
              {isSignedIn
                ? 'Post a clear task, compare local bids, and manage the job from your requester workspace.'
                : 'Sign in to post a home task, compare bids from local fixers, and choose who gets the job.'}
            </Text>
            <View style={styles.heroActions}>
              <FButton onPress={() => handlePostTask()} variant="secondary" size="lg" icon="plus">
                Post a Task
              </FButton>
              <Pressable
                onPress={handleFixerCta}
                style={({ pressed }) => [styles.heroGhostBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.heroGhostText}>
                  {isSignedIn ? 'Find Jobs ->' : 'Become a Fixer ->'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Right column — floating task cards */}
          {wide && (
            <View style={styles.heroCards}>
              {SAMPLE_TASKS.map((task, i) => (
                <Animated.View
                  key={task.label}
                  style={[
                    styles.taskCard,
                    i % 2 === 1 && { marginTop: spacing.xxxl },
                    { transform: [{ translateY: floats[i] }] },
                  ]}
                >
                  <View style={[styles.taskCardIcon, { backgroundColor: task.category.soft }]}>
                    <MaterialCommunityIcons name={task.category.icon} size={20} color={task.category.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskCardLabel}>{task.label}</Text>
                    <Text style={styles.taskCardCat}>{task.category.label}</Text>
                  </View>
                  <Text style={[styles.taskCardPrice, { color: task.category.color }]}>{task.price}</Text>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* Wave divider */}
        <View style={styles.heroDivider} />
      </LinearGradient>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <View style={[styles.stats, wide && styles.statsWide]}>
        {STATS.map((s, i) => (
          <React.Fragment key={s.label}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
            {i < STATS.length - 1 && <View style={styles.statDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── How it works ─────────────────────────────────────────── */}
      <View
        style={[styles.section, wide && styles.sectionWide]}
        onLayout={(event) => { sectionOffsets.current.how = event.nativeEvent.layout.y; }}
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionEyebrow}>THE PROCESS</Text>
          <Text style={[typography.h2, { color: brandColors.textPrimary }]}>
            From post to done in minutes
          </Text>
        </View>
        <View style={[styles.steps, wide && styles.stepsWide]}>
          {STEPS.map((step, i) => (
            <View key={step.n} style={[styles.stepCard, wide && { flex: 1 }]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepN}>{step.n}</Text>
              </View>
              <View style={styles.stepIconCircle}>
                <MaterialCommunityIcons name={step.icon as never} size={24} color={brandColors.primary} />
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
              {i < STEPS.length - 1 && wide && (
                <View style={styles.stepArrow}>
                  <MaterialCommunityIcons name="arrow-right" size={20} color={brandColors.outline} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* ── Category grid ────────────────────────────────────────── */}
      <View
        style={[styles.section, wide && styles.sectionWide]}
        onLayout={(event) => { sectionOffsets.current.categories = event.nativeEvent.layout.y; }}
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionEyebrow}>SERVICES</Text>
          <Text style={[typography.h2, { color: brandColors.textPrimary }]}>
            Every home task, covered
          </Text>
        </View>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.label}
              onPress={() => handleCategoryPress(cat.value)}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${cat.label} tasks`}
              style={({ pressed }) => [
                styles.catCell,
                selectedCategory === cat.value && styles.catCellSelected,
                { width: catCellW, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Image source={cat.image} style={styles.catImage} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(15,36,56,0.0)', 'rgba(15,36,56,0.75)']}
                style={styles.catOverlay}
              >
                <View style={[styles.catIconBadge, { backgroundColor: cat.color }]}>
                  <MaterialCommunityIcons name={cat.icon as never} size={14} color="#fff" />
                </View>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catDescription} numberOfLines={2}>{cat.description}</Text>
                <View style={styles.catExamples}>
                  {cat.examples.slice(0, 2).map((example) => (
                    <View key={example} style={styles.catExamplePill}>
                      <Text style={styles.catExampleText} numberOfLines={1}>{example}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.catActionRow}>
                  <Text style={styles.catActionText}>{selectedCategory === cat.value ? 'Selected' : 'Explore'}</Text>
                  <MaterialCommunityIcons name={selectedCategory === cat.value ? 'chevron-down' : 'plus'} size={14} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        <View style={styles.categoryDetailCard}>
          <Image source={selectedCategoryMeta.image} style={styles.categoryDetailImage} resizeMode="cover" />
          <View style={styles.categoryDetailBody}>
            <View style={styles.categoryDetailKicker}>
              <MaterialCommunityIcons name={selectedCategoryMeta.icon as never} size={18} color={selectedCategoryMeta.color} />
              <Text style={[styles.categoryDetailKickerText, { color: selectedCategoryMeta.color }]}>
                {selectedCategoryMeta.label}
              </Text>
            </View>
            <Text style={styles.categoryDetailTitle}>{selectedCategoryMeta.description}</Text>
            <Text style={styles.categoryDetailCopy}>
              Use photos, a clear budget, and a precise address so nearby Fixers can price the job accurately.
            </Text>
            <View style={styles.categoryDetailChips}>
              {selectedCategoryMeta.examples.map((task) => (
                <View key={task} style={[styles.categoryDetailChip, { backgroundColor: selectedCategoryMeta.soft }]}>
                  <Text style={[styles.categoryDetailChipText, { color: selectedCategoryMeta.color }]}>{task}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.categoryDetailPrompt}>
              Start with the category selected, then add the task details that will help Fixers bid.
            </Text>
            <FButton onPress={() => handleCategoryTask(selectedCategoryMeta.value)} icon="plus" fullWidth>
              {`Post a ${selectedCategoryMeta.label} Task`}
            </FButton>
          </View>
        </View>
      </View>

      {/* ── Fixer CTA ────────────────────────────────────────────── */}
      <View
        style={[styles.fixerCta, wide && styles.fixerCtaWide]}
        onLayout={(event) => { sectionOffsets.current.fixers = event.nativeEvent.layout.y; }}
      >
        <LinearGradient
          colors={[brandColors.primary, brandColors.primaryDark]}
          style={[styles.fixerCtaInner, wide && styles.fixerCtaInnerWide]}
        >
          <View style={[styles.fixerCtaLeft, wide && { flex: 1 }]}>
            <Text style={styles.fixerEyebrow}>FOR FIXERS</Text>
            <Text style={styles.fixerHeadline}>
              Earn on your{'\n'}own schedule
            </Text>
            <Text style={styles.fixerSub}>
              Join 1,800+ fixers already earning from tasks near them.
            </Text>
            <FButton onPress={handleFixerCta} variant="secondary" size="lg" icon="account-hard-hat">
              {isSignedIn ? 'Open Fixer Workspace' : 'Join as a Fixer'}
            </FButton>
          </View>

          <View style={[styles.fixerBenefits, wide && { flex: 1, flexDirection: 'row', flexWrap: 'wrap' }]}>
            {FIXER_BENEFITS.map((b) => (
              <View key={b.title} style={[styles.benefitTile, wide && { width: '48%' }]}>
                <MaterialCommunityIcons name={b.icon as never} size={22} color={brandColors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={[styles.footerInner, wide && styles.footerInnerWide]}>
          <View style={styles.footerBrand}>
            <AppLogo iconOnly />
            <Text style={styles.footerWordmark}>FixIt</Text>
            <Text style={styles.footerTagline}>Your neighborhood. Fixed.</Text>
          </View>
          <Text style={styles.footerCopy}>© 2026 FixIt · Tel Aviv, Israel</Text>
        </View>
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
    paddingBottom: 0,
  },

  // ── Nav ────────────────────────────────────────────────────────
  nav: {
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(28, 60, 86, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,252,246,0.08)',
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  navInnerWide: {
    paddingHorizontal: 80,
    paddingVertical: spacing.lg,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navWordmark: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: brandColors.textOnDark,
  },
  navLinks: {
    flexDirection: 'row',
    gap: spacing.xxl,
    flex: 1,
    justifyContent: 'center',
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textOnDarkMuted,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navLogin: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  navLoginText: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.textOnDark,
  },
  navCta: {
    backgroundColor: brandColors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
  },
  navCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.primaryDark,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenu: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(15,36,56,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.12)',
    gap: spacing.xs,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  mobileMenuItemPressed: {
    backgroundColor: 'rgba(255,252,246,0.10)',
  },
  mobileMenuText: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textOnDark,
  },

  // ── Hero ───────────────────────────────────────────────────────
  hero: {
    paddingTop: spacing.huge + spacing.xl,
    paddingBottom: 0,
    paddingHorizontal: spacing.xxl,
    overflow: 'hidden',
  },
  heroSilhouette: {
    position: 'absolute',
    right: -70,
    top: 80,
    width: 340,
    height: 340,
    opacity: 0.06,
  },
  heroContent: {
    gap: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  heroContentWide: {
    flexDirection: 'row',
    paddingHorizontal: 80 - spacing.xxl,
    gap: spacing.huge,
    alignItems: 'center',
    minHeight: 480,
  },
  heroLeft: {
    gap: spacing.xl,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(241,181,69,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.3)',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.secondary,
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1,
    color: brandColors.textOnDark,
  },
  heroSub: {
    fontSize: 16,
    lineHeight: 25,
    color: brandColors.textOnDarkMuted,
    maxWidth: 440,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroGhostBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  heroGhostText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textOnDarkMuted,
  },
  heroDivider: {
    height: 40,
    backgroundColor: brandColors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -4,
  },

  // ── Floating task cards ────────────────────────────────────────
  heroCards: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignContent: 'flex-start',
    paddingBottom: spacing.xxl,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: brandColors.surface,
    padding: spacing.lg,
    borderRadius: radii.xl,
    width: 220,
    ...shadows.md,
  },
  taskCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  taskCardCat: {
    fontSize: 11,
    color: brandColors.textMuted,
    marginTop: 2,
  },
  taskCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 0,
  },

  // ── Stats ──────────────────────────────────────────────────────
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 0,
    backgroundColor: brandColors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
  },
  statsWide: {
    paddingHorizontal: 80,
  },
  statItem: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: brandColors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: brandColors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: brandColors.outlineLight,
    marginVertical: spacing.sm,
    alignSelf: 'stretch',
  },

  // ── Section shell ──────────────────────────────────────────────
  section: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
    gap: spacing.xxxl,
  },
  sectionWide: {
    paddingHorizontal: 80,
  },
  sectionHead: {
    gap: spacing.sm,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: brandColors.secondary,
    textTransform: 'uppercase',
  },

  // ── Steps ──────────────────────────────────────────────────────
  steps: {
    gap: spacing.xl,
  },
  stepsWide: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  stepCard: {
    backgroundColor: brandColors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    ...shadows.sm,
  },
  stepNumber: {
    alignSelf: 'flex-start',
  },
  stepN: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: brandColors.secondary,
  },
  stepIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 21,
    color: brandColors.textMuted,
  },
  stepArrow: {
    position: 'absolute',
    right: -spacing.xl - 2,
    top: '50%' as unknown as number,
    zIndex: 1,
  },

  // ── Category grid ──────────────────────────────────────────────
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  catCell: {
    height: 196,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  catCellSelected: {
    borderWidth: 3,
    borderColor: brandColors.secondary,
    ...shadows.md,
  },
  catImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  catOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
    gap: spacing.xs,
  },
  catIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  catDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.86)',
  },
  catExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  catExamplePill: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  catExampleText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  catActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  catActionText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '800',
  },
  categoryDetailCard: {
    marginTop: spacing.lg,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    backgroundColor: brandColors.surface,
    ...shadows.md,
  },
  categoryDetailImage: {
    width: '100%',
    height: 190,
  },
  categoryDetailBody: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  categoryDetailKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryDetailKickerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  categoryDetailTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    color: brandColors.primary,
  },
  categoryDetailCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: brandColors.textSecondary,
  },
  categoryDetailChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryDetailChip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryDetailChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryDetailPrompt: {
    fontSize: 13,
    lineHeight: 20,
    color: brandColors.textMuted,
    backgroundColor: brandColors.background,
    borderRadius: radii.md,
    padding: spacing.md,
  },

  // ── Fixer CTA ─────────────────────────────────────────────────
  fixerCta: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  fixerCtaWide: {
    paddingHorizontal: 80,
  },
  fixerCtaInner: {
    borderRadius: radii.xxxl,
    padding: spacing.xxxl,
    gap: spacing.xxxl,
    overflow: 'hidden',
  },
  fixerCtaInnerWide: {
    flexDirection: 'row',
    padding: spacing.huge,
    gap: spacing.huge,
    alignItems: 'center',
  },
  fixerCtaLeft: {
    gap: spacing.lg,
  },
  fixerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: brandColors.secondary,
    textTransform: 'uppercase',
  },
  fixerHeadline: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.5,
    color: brandColors.textOnDark,
  },
  fixerSub: {
    fontSize: 15,
    lineHeight: 23,
    color: brandColors.textOnDarkMuted,
  },
  fixerBenefits: {
    gap: spacing.lg,
  },
  benefitTile: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingRight: spacing.md,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textOnDark,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    color: brandColors.textOnDarkMuted,
    lineHeight: 19,
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    backgroundColor: brandColors.primaryDark,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
  },
  footerInner: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  footerInnerWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 80 - spacing.xxl,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerWordmark: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: brandColors.textOnDark,
  },
  footerTagline: {
    fontSize: 13,
    color: brandColors.textOnDarkMuted,
    marginLeft: spacing.sm,
  },
  footerCopy: {
    fontSize: 12,
    color: 'rgba(255,252,246,0.35)',
  },
});
