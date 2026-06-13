import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { FButton } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

export interface TutorialProps {
  onComplete: () => void;
}

// ─── Requester Tutorial ──────────────────────────────────────────────────────

const STEP_ICONS = ['clipboard-edit-outline', 'scale-balance', 'check-decagram'] as const;

export default function RequesterTutorialScreen({ onComplete }: TutorialProps) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const wide = width >= 900 && Platform.OS === 'web';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start(() => {
      // Stagger the steps in
      Animated.stagger(
        180,
        stepAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }),
        ),
      ).start();
    });
  }, [fadeAnim, stepAnims]);

  const steps = [
    { label: t('tutorial.requester.step1.label'), detail: t('tutorial.requester.step1.detail') },
    { label: t('tutorial.requester.step2.label'), detail: t('tutorial.requester.step2.detail') },
    { label: t('tutorial.requester.step3.label'), detail: t('tutorial.requester.step3.detail') },
  ];

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' as const : 'left' as const;
  const rtlText = isRTL ? { writingDirection: 'rtl' as const } : {};

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[brandColors.primary, brandColors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, wide && styles.heroWide]}
        >
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={36} color="#fff" />
          </View>
          <Text style={[styles.eyebrow, rtlText]}>{t('tutorial.requester.kicker')}</Text>
          <Text style={[typography.h1, styles.heroTitle, rtlText]}>{t('tutorial.requester.title')}</Text>
          <Text style={[typography.body, styles.heroSubtitle, rtlText]}>
            {t('tutorial.requester.subtitle')}
          </Text>
        </LinearGradient>

        {/* Steps */}
        <View style={[styles.stepsSection, wide && styles.stepsSectionWide]}>
          {steps.map((step, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.stepCard,
                {
                  flexDirection: rowDirection,
                  opacity: stepAnims[idx],
                  transform: [
                    {
                      translateY: stepAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Number badge */}
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{String(idx + 1).padStart(2, '0')}</Text>
              </View>

              {/* Content */}
              <View style={styles.stepContent}>
                <View style={[styles.stepLabelRow, { flexDirection: rowDirection }]}>
                  <MaterialCommunityIcons
                    name={STEP_ICONS[idx] as never}
                    size={20}
                    color={brandColors.primary}
                  />
                  <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign }, rtlText]}>
                    {step.label}
                  </Text>
                </View>
                <Text style={[typography.body, { color: brandColors.textSecondary, textAlign }, rtlText]}>
                  {step.detail}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Connecting line between steps — visual flair */}
        {/* CTA section */}
        <View style={[styles.ctaSection, wide && styles.ctaSectionWide]}>
          <FButton variant="primary" size="lg" onPress={onComplete}>
            {t('tutorial.getStarted')}
          </FButton>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scroll: {
    paddingBottom: spacing.xxxl,
  },
  scrollWide: {
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl + 20,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  heroWide: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    marginTop: spacing.xxl,
    borderRadius: radii.xl,
    ...shadows.md,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 380,
  },
  stepsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  stepsSectionWide: {
    maxWidth: 600,
    width: '100%',
  },
  stepCard: {
    backgroundColor: brandColors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    ...shadows.sm,
  },
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 18,
    fontWeight: '800',
    color: brandColors.primary,
  },
  stepContent: {
    flex: 1,
    gap: spacing.xs,
  },
  stepLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  ctaSectionWide: {
    maxWidth: 400,
    width: '100%',
  },
});
