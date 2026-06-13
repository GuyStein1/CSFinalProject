import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { type RootStackParamList } from '../navigation/landingIntent';
import { FButton } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { brandColors, radii, shadows, spacing, typography } from '../theme';
import { auth } from '../config/firebase';
import api from '../api/axiosInstance';

const getOnboardingKey = () => `fixerOnboardingSeen_${auth.currentUser?.uid ?? 'anon'}`;

type BenefitKey = 'flexibleHours' | 'findWork' | 'earnMore' | 'reputation';

const BENEFIT_ICONS: Record<BenefitKey, string> = {
  flexibleHours: 'clock-fast',
  findWork: 'map-marker-radius-outline',
  earnMore: 'cash-multiple',
  reputation: 'star-circle-outline',
};

const STEP_KEYS = ['profile', 'browse', 'bid'] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'BecomeFixerOnboarding'>;

export default function BecomeFixerScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const wide = width >= 900 && Platform.OS === 'web';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const navigationRef = React.useRef(navigation);
  navigationRef.current = navigation;

  useEffect(() => {
    AsyncStorage.getItem(getOnboardingKey()).then((seen) => {
      if (seen === 'true') {
        const dest = route.params?.returnScreen ?? 'FindJobs';
        navigationRef.current.replace('Main', { screen: 'FixerMode', params: { screen: dest } });
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]).start();
      }
    });
  }, [fadeAnim, slideAnim]);

  const markSeenAndNavigate = async (dest: 'profile' | 'jobs') => {
    await api.put('/api/users/me', { is_fixer: true });
    await AsyncStorage.setItem(getOnboardingKey(), 'true');
    if (dest === 'profile') {
      navigation.replace('Main', { screen: 'FixerMode', params: { screen: 'FixerProfile' } });
    } else {
      navigation.replace('Main', { screen: 'FixerMode', params: { screen: 'FindJobs' } });
    }
  };

  const rowDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#D49A2A', '#F1B545']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, wide && styles.heroWide]}
        >
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="wrench" size={40} color="#fff" />
          </View>
          <Text style={[typography.h1, styles.heroTitle]}>{t('becomeFixer.hero.title')}</Text>
          <Text style={[typography.body, styles.heroSubtitle]}>{t('becomeFixer.hero.subtitle')}</Text>
        </LinearGradient>

        {/* Benefits grid */}
        <View style={[styles.benefitsGrid, wide && styles.benefitsGridWide]}>
          {(Object.keys(BENEFIT_ICONS) as BenefitKey[]).map((key) => (
            <View key={key} style={[styles.benefitCard, { flexDirection: rowDirection }, wide && styles.benefitCardWide]}>
              <View style={styles.benefitIcon}>
                <MaterialCommunityIcons name={BENEFIT_ICONS[key] as never} size={24} color={brandColors.secondaryDark} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[typography.bodyMedium, styles.benefitTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t(`becomeFixer.benefits.${key}.title`)}
                </Text>
                <Text style={[typography.bodySm, styles.benefitBody, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t(`becomeFixer.benefits.${key}.body`)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Steps */}
        <View style={[styles.stepsSection, wide && styles.stepsSectionWide]}>
          <Text style={[typography.h3, styles.stepsHeading, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('becomeFixer.steps.heading')}
          </Text>
          <View style={styles.steps}>
            {STEP_KEYS.map((key, idx) => (
              <View key={key} style={[styles.step, { flexDirection: rowDirection }]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={[typography.bodyMedium, styles.stepLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t(`becomeFixer.steps.${key}.label`)}
                  </Text>
                  <Text style={[typography.bodySm, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t(`becomeFixer.steps.${key}.detail`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View style={[styles.ctaSection, wide && styles.ctaSectionWide]}>
          <FButton
            variant="primary"
            size="lg"
            onPress={() => void markSeenAndNavigate('profile')}
          >
            {t('becomeFixer.cta.setupProfile')}
          </FButton>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
            onPress={() => void markSeenAndNavigate('jobs')}
          >
            <Text style={styles.skipText}>
              {isRTL ? `← ${t('becomeFixer.cta.browseFirst')}` : `${t('becomeFixer.cta.browseFirst')} →`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

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
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    maxWidth: 420,
  },
  benefitsGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  benefitsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 720,
    width: '100%',
  },
  benefitCard: {
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: brandColors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    ...shadows.sm,
  },
  benefitCardWide: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: brandColors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    gap: 3,
  },
  benefitTitle: {
    color: brandColors.textPrimary,
  },
  benefitBody: {
    color: brandColors.textMuted,
  },
  stepsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  stepsSectionWide: {
    maxWidth: 720,
    width: '100%',
  },
  stepsHeading: {
    color: brandColors.textPrimary,
  },
  steps: {
    gap: spacing.md,
  },
  step: {
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brandColors.secondaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepLabel: {
    color: brandColors.textPrimary,
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
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    color: brandColors.primaryMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
