import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import AppLogo from '../components/AppLogo';
import { FButton } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import { CATEGORY_LIST, type Category } from '../constants/categories';
import { useLanguage } from '../context/LanguageContext';

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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WORKER_IMAGE = require('../../assets/landing-worker-cut.png') as number;

const SPEED_LINES = [
  { top: '18%', left: '58%', width: 130 },
  { top: '28%', left: '64%', width: 190 },
  { top: '42%', left: '60%', width: 150 },
  { top: '57%', left: '67%', width: 210 },
  { top: '69%', left: '56%', width: 120 },
  { top: '78%', left: '62%', width: 170 },
] as const;

const SPARKS = [
  { left: '45%', top: '68%' },
  { left: '50%', top: '74%' },
  { left: '55%', top: '70%' },
  { left: '60%', top: '77%' },
  { left: '52%', top: '82%' },
] as const;

const TICKS = Array.from({ length: 8 }, (_, index) => index);

const STATS = [
  { value: '2,400+', labelKey: 'landing.stats.tasksPosted' },
  { value: '1,800+', labelKey: 'landing.stats.activeFixers' },
  { value: '98%',    labelKey: 'landing.stats.satisfaction' },
  { value: '4.9★',   labelKey: 'landing.stats.avgRating' },
];

const STEPS = [
  { n: '01', icon: 'plus-circle-outline',  titleKey: 'landing.steps.post.title',  descKey: 'landing.steps.post.desc' },
  { n: '02', icon: 'account-search',       titleKey: 'landing.steps.pick.title',  descKey: 'landing.steps.pick.desc' },
  { n: '03', icon: 'check-circle-outline', titleKey: 'landing.steps.done.title',  descKey: 'landing.steps.done.desc' },
];

const FIXER_BENEFITS = [
  { icon: 'calendar-check',    titleKey: 'landing.fixer.benefits.hours.title',      descKey: 'landing.fixer.benefits.hours.desc' },
  { icon: 'map-marker-radius', titleKey: 'landing.fixer.benefits.nearby.title',     descKey: 'landing.fixer.benefits.nearby.desc' },
  { icon: 'cash-multiple',     titleKey: 'landing.fixer.benefits.paid.title',       descKey: 'landing.fixer.benefits.paid.desc' },
  { icon: 'star-circle',       titleKey: 'landing.fixer.benefits.reputation.title', descKey: 'landing.fixer.benefits.reputation.desc' },
];

function useLoopProgress(duration: number) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);
  return anim;
}

function WorkerHeroAnimation() {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [launched, setLaunched] = useState(false);
  const isBoosted = hovered || launched;
  const bob = useRef(new Animated.Value(0)).current;
  const pow = useRef(new Animated.Value(0)).current;
  const launchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineProgress = useLoopProgress(isBoosted ? 560 : 1500);
  const tickProgress = useLoopProgress(isBoosted ? 520 : 1400);
  const sparkProgress = useLoopProgress(720);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: isBoosted ? 280 : 560,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: isBoosted ? 280 : 560,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, isBoosted]);

  useEffect(() => () => {
    if (launchTimeout.current) clearTimeout(launchTimeout.current);
  }, []);

  const triggerLaunch = () => {
    if (launchTimeout.current) clearTimeout(launchTimeout.current);
    setLaunched(true);
    pow.setValue(0);
    Animated.sequence([
      Animated.timing(pow, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.timing(pow, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
    launchTimeout.current = setTimeout(() => setLaunched(false), 900);
  };

  const bobTranslateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isBoosted ? -14 : -8],
  });
  const bobRotate = bob.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1.2deg', '1.4deg'],
  });
  const workerTranslateX = launched ? -16 : isBoosted ? 18 : 0;
  const shadowScale = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });
  const lineTranslateX = lineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [130, -360],
  });
  const lineOpacity = lineProgress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, isBoosted ? 0.95 : 0.38, 0],
  });
  const tickTranslateX = tickProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [360, -520],
  });
  const sparkTranslateX = sparkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });
  const sparkTranslateY = sparkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const sparkScale = sparkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const powScale = pow.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.45, 1.12, 1.3],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Animated FixIt worker"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={triggerLaunch}
      style={({ pressed }) => [
        styles.workerStage,
        isBoosted && styles.workerStageBoosted,
        pressed && styles.workerStagePressed,
      ]}
    >
      <View style={[styles.workerFrameCorner, styles.workerFrameCornerTopLeft]} />
      <View style={[styles.workerFrameCorner, styles.workerFrameCornerTopRight]} />
      <View style={[styles.workerFrameCorner, styles.workerFrameCornerBottomLeft]} />
      <View style={[styles.workerFrameCorner, styles.workerFrameCornerBottomRight]} />

      <Text style={styles.workerLabel}>{t('landing.hero.fixerOnDuty')}</Text>

      <View style={styles.workerScene}>
        <View style={styles.workerGround} />
        <Animated.View style={styles.workerTicks}>
          {TICKS.map((tick) => (
            <Animated.View
              key={tick}
              style={[
                styles.workerTick,
                {
                  left: `${8 + tick * 13}%`,
                  transform: [{ translateX: tickTranslateX }],
                  opacity: isBoosted ? 0.7 : 0.42,
                },
              ]}
            />
          ))}
        </Animated.View>

        <View style={styles.workerLines} pointerEvents="none">
          {SPEED_LINES.map((line, index) => (
            <Animated.View
              key={`${line.top}-${line.left}`}
              style={[
                styles.workerSpeedLine,
                {
                  top: line.top,
                  left: line.left,
                  width: line.width,
                  opacity: lineOpacity,
                  transform: [
                    { translateX: lineTranslateX },
                    { scaleX: index % 2 === 0 ? 1 : 0.8 },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.workerFloorShadow,
            {
              opacity: isBoosted ? 0.62 : 0.44,
              transform: [{ scaleX: shadowScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.workerWrap,
            {
              transform: [
                { translateX: workerTranslateX },
                { translateY: bobTranslateY },
                { rotate: bobRotate },
                { scale: isBoosted ? 1.03 : 1 },
              ],
            },
          ]}
        >
          <Image source={WORKER_IMAGE} style={styles.workerImage} resizeMode="contain" />
        </Animated.View>

        {isBoosted && (
          <View style={styles.workerSparks} pointerEvents="none">
            {SPARKS.map((spark) => (
              <Animated.View
                key={`${spark.left}-${spark.top}`}
                style={[
                  styles.workerSpark,
                  {
                    left: spark.left,
                    top: spark.top,
                    transform: [
                      { translateX: sparkTranslateX },
                      { translateY: sparkTranslateY },
                      { scale: sparkScale },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.workerPow,
            {
              opacity: pow,
              transform: [{ scale: powScale }, { rotate: '-10deg' }],
            },
          ]}
        >
          <Text style={styles.workerPowText}>GO!</Text>
        </Animated.View>
      </View>

      <View style={styles.workerSpeedRow}>
        <Text style={styles.workerSpeedText}>{isBoosted ? '48 mph' : '02 mph'}</Text>
        <View style={styles.workerSpeedTrack}>
          <View style={[styles.workerSpeedFill, { width: isBoosted ? '92%' : '20%' }]} />
        </View>
        <Text style={styles.workerSpeedText}>MAX</Text>
      </View>
    </Pressable>
  );
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
  onBecomeFixer,
  onFixerHome,
}: Props) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const mid  = width >= 600;
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<'how' | 'categories' | 'fixers', number>>({
    how: 0,
    categories: 0,
    fixers: 0,
  });

  const catCols = wide ? (width >= 1120 ? 4 : 3) : mid ? 2 : 1;
  const categoryGridWidth = width - (wide ? 160 : spacing.xxl * 2);
  const catCellW = (categoryGridWidth - spacing.md * (catCols - 1)) / catCols;
  const expandedCatSpan = Math.min(2, catCols);
  const expandedCatCellW = catCellW * expandedCatSpan + spacing.md * (expandedCatSpan - 1);

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
  const handlePostTaskCta = (category?: Category) => {
    handlePostTask(category);
  };

  const handleCategoryPress = (category: Category) => {
    setMenuOpen(false);
    setSelectedCategory((current) => (current === category ? null : category));
  };

  const handleLogin = () => {
    runAndClose(onLogin ?? (() => onPostTask()));
  };

  const handleCreateAccount = () => {
    runAndClose(onCreateAccount ?? onLogin ?? (() => onPostTask()));
  };

  const hasDedicatedFixerOnboarding = !isSignedIn && Boolean(onBecomeFixer && !onFixerHome);
  const handleFixerCta = () => {
    if (isSignedIn) {
      runAndClose(onFixerHome ?? onBecomeFixer ?? onDashboard ?? onLogin ?? (() => onPostTask()));
      return;
    }
    if (hasDedicatedFixerOnboarding && onBecomeFixer) {
      runAndClose(onBecomeFixer);
      return;
    }
    runAndClose(onFixerHome ?? onBecomeFixer ?? onLogin ?? onCreateAccount ?? (() => onPostTask()));
  };

  const handleCategoryTask = (category: Category) => {
    if (!isSignedIn) {
      setMenuOpen(false);
      (onCategoryPress ?? onCategorySelect ?? onPostTask)(category);
      return;
    }
    setMenuOpen(false);
    (onCategoryPress ?? onCategorySelect ?? onPostTask)(category);
  };

  const handleRequesterHome = () => {
    runAndClose(onRequesterHome ?? onDashboard ?? onLogin ?? (() => onPostTask()));
  };

  const publicNavItems = [
    { label: t('landing.nav.howItWorks'), icon: 'progress-check', onPress: () => scrollToSection('how') },
    { label: t('landing.nav.categories'), icon: 'shape-outline', onPress: () => scrollToSection('categories') },
    { label: t('landing.nav.forFixers'), icon: 'account-hard-hat-outline', onPress: () => scrollToSection('fixers') },
  ];
  const signedInDashboardItems = [
    { label: t('landing.nav.requesterDashboard'), shortLabel: t('landing.nav.dashboard'), icon: 'view-dashboard-outline', onPress: handleRequesterHome },
    { label: t('landing.nav.findJobs'), shortLabel: t('landing.nav.fixer'), icon: 'account-hard-hat-outline', onPress: handleFixerCta },
  ];
  const compactDashboardLabels = wide && width < 1040;
  const postTaskCtaLabel = isSignedIn ? t('landing.nav.postTask') : t('landing.nav.signInToPost');
  const fixerCtaLabel = isSignedIn ? t('landing.nav.openFixerWorkspace') : hasDedicatedFixerOnboarding ? t('landing.nav.joinAsFixer') : t('landing.nav.signInToFind');

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
              {publicNavItems.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                >
                  <Text style={styles.navLink}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.navActions}>
            <View style={styles.langSwitcher}>
              {(['en', 'he'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => void changeLanguage(lang)}
                  accessibilityRole="button"
                  style={[styles.langToggle, language === lang && styles.langToggleActive]}
                >
                  <Text style={[styles.langToggleText, language === lang && styles.langToggleTextActive]}>
                    {lang === 'en' ? 'EN' : 'עב'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isSignedIn && wide ? (
              <View style={styles.navDashboardActions}>
                {signedInDashboardItems.map((item, index) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      styles.navDashboardButton,
                      index === 0 ? styles.navDashboardPrimary : styles.navDashboardSecondary,
                      { opacity: pressed ? 0.82 : 1 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as never}
                      size={16}
                      color={index === 0 ? brandColors.primaryDark : brandColors.textOnDark}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.navDashboardText,
                        index === 0 ? styles.navDashboardPrimaryText : styles.navDashboardSecondaryText,
                      ]}
                    >
                      {compactDashboardLabels ? item.shortLabel : item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                {!isSignedIn && wide && (
                  <Pressable
                    onPress={handleLogin}
                    style={styles.navLogin}
                    accessibilityRole="button"
                    accessibilityLabel={t('landing.nav.login')}
                  >
                    <Text style={styles.navLoginText}>{t('landing.nav.login')}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={isSignedIn ? handleRequesterHome : () => handlePostTaskCta()}
                  accessibilityRole="button"
                  accessibilityLabel={isSignedIn ? 'Requester Dashboard' : postTaskCtaLabel}
                  style={({ pressed }) => [
                    styles.navCta,
                    { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <Text style={styles.navCtaText} numberOfLines={1}>
                    {isSignedIn ? 'Requester Dashboard' : postTaskCtaLabel}
                  </Text>
                </Pressable>
              </>
            )}
            {!wide && (
              <Pressable
                onPress={() => setMenuOpen((open) => !open)}
                style={styles.menuButton}
                accessibilityRole="button"
                accessibilityLabel={menuOpen ? 'Close landing menu' : 'Open landing menu'}
                accessibilityState={{ expanded: menuOpen }}
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
            {publicNavItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name={item.icon as never} size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>{item.label}</Text>
              </Pressable>
            ))}
            {isSignedIn && signedInDashboardItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name={item.icon as never} size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>{item.label}</Text>
              </Pressable>
            ))}
            {!isSignedIn && (
              <Pressable
                onPress={handleLogin}
                accessibilityRole="button"
                accessibilityLabel={t('landing.nav.login')}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name="login" size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>{t('landing.nav.login')}</Text>
              </Pressable>
            )}
            {!isSignedIn && onCreateAccount && (
              <Pressable
                onPress={handleCreateAccount}
                accessibilityRole="button"
                accessibilityLabel={t('landing.nav.createAccount')}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>{t('landing.nav.createAccount')}</Text>
              </Pressable>
            )}
            {!isSignedIn && (
              <Pressable
                onPress={handleFixerCta}
                accessibilityRole="button"
                accessibilityLabel={fixerCtaLabel}
                style={({ pressed }) => [styles.mobileMenuItem, pressed && styles.mobileMenuItemPressed]}
              >
                <MaterialCommunityIcons name="account-hard-hat-outline" size={18} color={brandColors.textOnDark} />
                <Text style={styles.mobileMenuText}>{fixerCtaLabel}</Text>
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
              <Text style={styles.heroBadgeText}>{t('landing.hero.available')}</Text>
            </View>
            <Text style={styles.heroHeadline}>
              {t('landing.hero.headline1')}{'\n'}
              <Text style={styles.heroHeadlineAccent}>{t('landing.hero.headline2')}</Text>
            </Text>
            <Text style={styles.heroSub}>
              {t('landing.hero.body')}
            </Text>
            <View style={styles.heroActions}>
              <FButton onPress={() => handlePostTaskCta()} variant="secondary" size="lg" icon={isSignedIn ? 'plus' : 'login'}>
                {postTaskCtaLabel}
              </FButton>
              <Pressable
                onPress={handleFixerCta}
                accessibilityRole="button"
                accessibilityLabel={fixerCtaLabel}
                style={({ pressed }) => [styles.heroGhostBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <MaterialCommunityIcons
                  name={isSignedIn ? 'account-hard-hat-outline' : 'account-plus-outline'}
                  size={18}
                  color={brandColors.textOnDarkMuted}
                />
                <Text style={styles.heroGhostText}>
                  {fixerCtaLabel}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Right column — animated worker scene */}
          {wide && (
            <WorkerHeroAnimation />
          )}
        </View>

        {/* Wave divider */}
        <View style={styles.heroDivider} />
      </LinearGradient>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <View style={[styles.stats, wide && styles.statsWide]}>
        {STATS.map((s, i) => (
          <React.Fragment key={s.labelKey}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{t(s.labelKey)}</Text>
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
          <Text style={styles.sectionEyebrow}>{t('landing.sections.process')}</Text>
          <Text style={[typography.h2, { color: brandColors.textPrimary }]}>
            {t('landing.sections.processTitle')}
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
              <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
              <Text style={styles.stepDesc}>{t(step.descKey)}</Text>
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
          <Text style={styles.sectionEyebrow}>{t('landing.sections.services')}</Text>
          <Text style={[typography.h2, { color: brandColors.textPrimary }]}>
            {t('landing.sections.servicesTitle')}
          </Text>
        </View>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const selected = selectedCategory === cat.value;
            return (
              <View
                key={cat.label}
                style={[
                  styles.catCell,
                  selected && styles.catCellSelected,
                  selected && styles.catCellExpanded,
                  { width: selected ? expandedCatCellW : catCellW },
                ]}
              >
                <Image source={cat.image} style={styles.catImage} resizeMode="cover" />
                <LinearGradient
                  colors={selected
                    ? ['rgba(15,36,56,0.22)', 'rgba(15,36,56,0.96)']
                    : ['rgba(15,36,56,0.0)', 'rgba(15,36,56,0.75)']}
                  style={[styles.catOverlay, selected && styles.catOverlayExpanded]}
                >
                  <Pressable
                    onPress={() => handleCategoryPress(cat.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={selected ? `Collapse ${cat.label} tasks` : `Expand ${cat.label} tasks`}
                    style={({ pressed }) => [
                      styles.catSummaryPressable,
                      selected && styles.catSummaryPressableExpanded,
                      { opacity: pressed ? 0.86 : 1 },
                    ]}
                  >
                    <View style={[styles.catIconBadge, { backgroundColor: cat.color }]}>
                      <MaterialCommunityIcons name={cat.icon as never} size={14} color={brandColors.textOnDark} />
                    </View>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                    <Text style={styles.catDescription} numberOfLines={selected ? 3 : 2}>{cat.description}</Text>
                    <View style={styles.catExamples}>
                      {cat.examples.slice(0, selected ? 3 : 2).map((example) => (
                        <View key={example} style={styles.catExamplePill}>
                          <Text style={styles.catExampleText} numberOfLines={1}>{example}</Text>
                        </View>
                      ))}
                    </View>
                  </Pressable>

                  {selected && (
                    <View style={styles.catInlineDetail}>
                      <Text style={styles.catInlineCopy} numberOfLines={3}>
                        {cat.detailCopy}
                      </Text>
                      <View style={styles.catInlineChips}>
                        {cat.commonTasks.slice(0, 4).map((task) => (
                          <View key={task} style={styles.catInlineChip}>
                            <Text style={styles.catInlineChipText} numberOfLines={1}>{task}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.catInlinePrompt} numberOfLines={3}>
                        {cat.starterPrompt}
                      </Text>
                      <FButton onPress={() => handleCategoryTask(cat.value)} icon={isSignedIn ? 'plus' : 'login'} fullWidth>
                        {isSignedIn ? t('landing.categories.postIn', { label: cat.label }) : postTaskCtaLabel}
                      </FButton>
                    </View>
                  )}
                </LinearGradient>
              </View>
            );
          })}
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
            <Text style={styles.fixerEyebrow}>{t('landing.fixer.eyebrow')}</Text>
            <Text style={styles.fixerHeadline}>
              {t('landing.fixer.headline')}
            </Text>
            <Text style={styles.fixerSub}>
              {t('landing.fixer.sub')}
            </Text>
            <FButton onPress={handleFixerCta} variant="secondary" size="lg" icon="account-hard-hat">
              {fixerCtaLabel}
            </FButton>
          </View>

          <View style={[styles.fixerBenefits, wide && { flex: 1, flexDirection: 'row', flexWrap: 'wrap' }]}>
            {FIXER_BENEFITS.map((b) => (
              <View key={b.titleKey} style={[styles.benefitTile, wide && { width: '48%' }]}>
                <MaterialCommunityIcons name={b.icon as never} size={22} color={brandColors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{t(b.titleKey)}</Text>
                  <Text style={styles.benefitDesc}>{t(b.descKey)}</Text>
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
            <Text style={styles.footerTagline}>{t('landing.footer.tagline')}</Text>
          </View>
          <Text style={styles.footerCopy}>{t('landing.footer.copyright')}</Text>
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
    letterSpacing: 0,
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
  langSwitcher: {
    flexDirection: 'row',
    gap: 4,
  },
  langToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.22)',
  },
  langToggleActive: {
    backgroundColor: 'rgba(255,252,246,0.18)',
    borderColor: 'rgba(255,252,246,0.60)',
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: brandColors.textOnDarkMuted,
    letterSpacing: 0.5,
  },
  langToggleTextActive: {
    color: brandColors.textOnDark,
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
    maxWidth: 180,
  },
  navCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.primaryDark,
  },
  navDashboardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  navDashboardButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  navDashboardPrimary: {
    backgroundColor: brandColors.secondary,
    borderColor: brandColors.secondary,
  },
  navDashboardSecondary: {
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderColor: 'rgba(255,252,246,0.20)',
  },
  navDashboardText: {
    fontSize: 13,
    fontWeight: '800',
    maxWidth: 140,
  },
  navDashboardPrimaryText: {
    color: brandColors.primaryDark,
  },
  navDashboardSecondaryText: {
    color: brandColors.textOnDark,
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
    gap: spacing.xxl,
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
    letterSpacing: 0,
    color: brandColors.textOnDark,
  },
  heroHeadlineAccent: {
    color: brandColors.secondary,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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

  // ── Animated worker scene ──────────────────────────────────────
  workerStage: {
    flex: 1,
    flexShrink: 1,
    minWidth: 320,
    maxWidth: 540,
    aspectRatio: 1.42,
    borderRadius: radii.xxxl,
    backgroundColor: '#F6EFDF',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.34)',
    overflow: 'hidden',
    ...shadows.lg,
  },
  workerStageBoosted: {
    borderColor: 'rgba(241,181,69,0.72)',
  },
  workerStagePressed: {
    transform: [{ scale: 0.992 }],
  },
  workerFrameCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: 'rgba(15,36,56,0.30)',
    zIndex: 5,
  },
  workerFrameCornerTopLeft: {
    top: 18,
    left: 18,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
  },
  workerFrameCornerTopRight: {
    top: 18,
    right: 18,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
  },
  workerFrameCornerBottomLeft: {
    bottom: 18,
    left: 18,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  workerFrameCornerBottomRight: {
    bottom: 18,
    right: 18,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  workerLabel: {
    position: 'absolute',
    top: spacing.xl,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: 'rgba(20,33,61,0.54)',
    zIndex: 4,
  },
  workerScene: {
    flex: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    overflow: 'hidden',
  },
  workerGround: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    bottom: '22%',
    height: 1,
    backgroundColor: 'rgba(20,33,61,0.20)',
  },
  workerTicks: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    bottom: '19%',
    height: 24,
    overflow: 'hidden',
  },
  workerTick: {
    position: 'absolute',
    bottom: 3,
    width: 28,
    height: 1,
    backgroundColor: 'rgba(20,33,61,0.24)',
  },
  workerLines: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  workerSpeedLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: brandColors.secondary,
  },
  workerFloorShadow: {
    position: 'absolute',
    left: '28%',
    bottom: '18%',
    width: '44%',
    height: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(20,33,61,0.28)',
  },
  workerWrap: {
    position: 'absolute',
    left: '9%',
    top: '12%',
    width: '82%',
    height: '74%',
    zIndex: 3,
  },
  workerImage: {
    width: '100%',
    height: '100%',
  },
  workerSparks: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  workerSpark: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: brandColors.secondary,
  },
  workerPow: {
    position: 'absolute',
    top: '18%',
    right: '15%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: brandColors.secondary,
    borderWidth: 2,
    borderColor: brandColors.primaryDark,
    zIndex: 6,
  },
  workerPowText: {
    color: brandColors.primaryDark,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  workerSpeedRow: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workerSpeedText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '800',
    color: 'rgba(20,33,61,0.48)',
  },
  workerSpeedTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(20,33,61,0.12)',
    overflow: 'hidden',
  },
  workerSpeedFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: brandColors.secondary,
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
    letterSpacing: 0,
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
    alignItems: 'flex-start',
  },
  catCell: {
    height: 196,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  catCellExpanded: {
    height: 430,
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
  catOverlayExpanded: {
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  catSummaryPressable: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  catSummaryPressableExpanded: {
    flex: 0,
    minHeight: 132,
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
    color: brandColors.textOnDark,
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
  catInlineDetail: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
    paddingTop: spacing.md,
  },
  catInlineCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
  },
  catInlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  catInlineChip: {
    maxWidth: '100%',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  catInlineChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.textOnDark,
  },
  catInlinePrompt: {
    fontSize: 12,
    lineHeight: 18,
    color: brandColors.textOnDarkMuted,
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
    letterSpacing: 0,
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
    letterSpacing: 0,
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
