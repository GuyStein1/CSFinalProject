import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendEmailVerification } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../config/firebase';
import { FButton } from '../components/ui';
import { brandColors, heroGradientRequester, spacing, radii, shadows, typography } from '../theme';
import {
  CATEGORY_LIST,
  getCategoryLabel,
  type Category,
} from '../utils/categoryMetadata';
import { CATEGORY_METADATA } from '../constants/categories';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

const WORKSPACE_STEPS = [
  { icon: 'clipboard-edit-outline', key: 'post' },
  { icon: 'hand-extended-outline', key: 'compare' },
  { icon: 'check-decagram-outline', key: 'finish' },
] as const;

export default function RequesterDashboard({ navigation }: Props) {
  const [emailVerified, setEmailVerified] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const wide = width >= 900;
  const tablet = width >= 680;
  const horizontalPadding = wide ? spacing.xxxl : spacing.lg;

  const user = auth.currentUser;
  const firstName = user?.displayName?.split(' ')[0] ?? null;
  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t('dashboard.greeting.morning')
    : hour < 17
      ? t('dashboard.greeting.afternoon')
      : t('dashboard.greeting.evening');

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
      <LinearGradient
        colors={heroGradientRequester.colors}
        locations={heroGradientRequester.locations}
        start={heroGradientRequester.start}
        end={heroGradientRequester.end}
        style={styles.hero}
      >
        <View style={[styles.heroInner, wide && styles.heroInnerWide, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
            <View style={styles.workspacePill}>
              <View style={styles.liveDot} />
              <Text style={styles.workspacePillText}>{t('dashboard.hero.workspace')}</Text>
            </View>

            <Text style={[styles.greeting, { textAlign: isRTL ? 'right' : 'left' }]}>
              {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
            </Text>
            <Text style={[styles.heroSub, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('dashboard.hero.sub')}
            </Text>

            <View style={[styles.heroActions, !tablet && styles.heroActionsStacked]}>
              <FButton
                onPress={() => navigateToCreate()}
                variant="secondary"
                size="lg"
                icon="plus"
                style={!tablet ? styles.fullWidthButton : undefined}
              >
                {t('dashboard.hero.postTask')}
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
                  color={brandColors.primary}
                />
                <Text style={styles.heroGhostText}>{t('dashboard.hero.myTasks')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.heroPanel, wide && styles.heroPanelWide]}>
            <Text style={[styles.panelEyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.panel.eyebrow')}</Text>
            <Text style={[styles.panelTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.panel.title')}</Text>
            <View style={styles.panelDivider} />
            <View style={styles.panelRow}>
              <View style={styles.panelIconShell}>
                <MaterialCommunityIcons name="camera-plus-outline" size={19} color={brandColors.secondaryDark} />
              </View>
              <View style={styles.panelText}>
                <Text style={[styles.panelRowTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.panel.photosTitle')}</Text>
                <Text style={[styles.panelRowCopy, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.panel.photosCopy')}</Text>
              </View>
            </View>
            <View style={styles.panelRow}>
              <View style={styles.panelIconShell}>
                <MaterialCommunityIcons name="shield-check-outline" size={19} color={brandColors.secondaryDark} />
              </View>
              <View style={styles.panelText}>
                <Text style={[styles.panelRowTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.panel.historyTitle')}</Text>
                <Text style={[styles.panelRowCopy, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.panel.historyCopy')}</Text>
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
              <Text style={[typography.label, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.verify.title')}</Text>
              <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                {verificationSent ? t('dashboard.verify.sent') : t('dashboard.verify.pending')}
              </Text>
            </View>
            {!verificationSent && (
              <Pressable
                onPress={() => void handleResendVerification()}
                accessibilityRole="button"
                accessibilityLabel="Resend verification email"
                style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[typography.caption, styles.verifyBtnText]}>{t('dashboard.verify.resend')}</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.section.services')}</Text>
              <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.section.servicesTitle')}</Text>
            </View>
          </View>

          <FlatList
            data={CATEGORY_LIST}
            keyExtractor={(item) => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryCarousel}
            renderItem={({ item: category }) => (
              <Pressable
                onPress={() => navigateToCreate(category.value)}
                accessibilityRole="button"
                accessibilityLabel={`Post a ${getCategoryLabel(category.value, t)} task`}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                {category.value === 'OTHER' ? (
                  <LinearGradient
                    colors={[brandColors.primaryLight, brandColors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryOtherTile}
                  >
                    <MaterialCommunityIcons name="tools" size={46} color={brandColors.secondary} />
                  </LinearGradient>
                ) : (
                  <Image
                    source={CATEGORY_METADATA[category.value as keyof typeof CATEGORY_METADATA].image}
                    style={styles.categoryImage}
                  />
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)']}
                  style={styles.categoryOverlay}
                />
                <View style={styles.categoryCardContent}>
                  <Text style={styles.categoryCardLabel} numberOfLines={1}>
                    {getCategoryLabel(category.value, t)}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.section.flow')}</Text>
              <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>{t('dashboard.section.flowTitle')}</Text>
            </View>
          </View>

          <View style={[styles.stepGrid, wide && styles.stepGridWide]}>
            {WORKSPACE_STEPS.map((step, index) => (
              <View key={step.key} style={[styles.stepItem, wide && styles.stepItemWide]}>
                <View style={styles.stepTopRow}>
                  <View style={styles.stepIcon}>
                    <MaterialCommunityIcons name={step.icon as never} size={20} color={brandColors.primary} />
                  </View>
                  <Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>{t(`dashboard.steps.${step.key}.title`)}</Text>
                <Text style={[typography.bodySm, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>{t(`dashboard.steps.${step.key}.copy`)}</Text>
              </View>
            ))}
          </View>
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
    paddingBottom: 88,
  },
  hero: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
  },
  heroInner: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    gap: spacing.xxl,
  },
  heroInnerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: brandColors.success,
  },
  workspacePillText: {
    ...typography.eyebrow,
    color: brandColors.textSecondary,
  },
  greeting: {
    ...typography.hero,
    color: brandColors.textPrimary,
    maxWidth: 640,
  },
  heroSub: {
    ...typography.body,
    color: brandColors.textSecondary,
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
    borderColor: 'rgba(28,60,86,0.25)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroGhostText: {
    ...typography.button,
    color: brandColors.textPrimary,
  },
  heroPanel: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    gap: spacing.md,
  },
  heroPanelWide: {
    width: 350,
    flexShrink: 0,
  },
  panelEyebrow: {
    ...typography.eyebrow,
    color: brandColors.secondaryDark,
  },
  panelTitle: {
    ...typography.h2,
    color: brandColors.textPrimary,
  },
  panelDivider: {
    height: 1,
    backgroundColor: brandColors.outlineLight,
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
    backgroundColor: 'rgba(241,181,69,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelText: {
    flex: 1,
    gap: 2,
  },
  panelRowTitle: {
    ...typography.label,
    color: brandColors.textPrimary,
  },
  panelRowCopy: {
    ...typography.caption,
    color: brandColors.textSecondary,
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
    marginTop: spacing.lg,
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
  categoryCarousel: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  categoryCard: {
    width: 140,
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryOtherTile: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  categoryCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  categoryCardLabel: {
    color: brandColors.white,
    fontWeight: '700',
    fontSize: 14,
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
