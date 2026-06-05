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
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { type RootStackParamList } from '../navigation/landingIntent';
import { FButton } from '../components/ui';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

const STORAGE_KEY = 'fixerOnboardingSeen';

const BENEFITS = [
  {
    icon: 'clock-fast' as const,
    title: 'Flexible Hours',
    body: 'Work when you want — accept jobs that fit your schedule.',
  },
  {
    icon: 'map-marker-radius-outline' as const,
    title: 'Find Work Nearby',
    body: 'Browse tasks posted in your area with a live map.',
  },
  {
    icon: 'cash-multiple' as const,
    title: 'Earn More',
    body: 'Set your own price on every bid. No middleman cut.',
  },
  {
    icon: 'star-circle-outline' as const,
    title: 'Build Your Reputation',
    body: 'Collect reviews and grow a profile clients trust.',
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'BecomeFixerOnboarding'>;

export default function BecomeFixerScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 900 && Platform.OS === 'web';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const navigationRef = React.useRef(navigation);
  navigationRef.current = navigation;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((seen) => {
      if (seen === 'true') {
        navigationRef.current.replace('Main', { screen: 'FixerMode', params: { screen: 'FindJobs' } });
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]).start();
      }
    });
  }, [fadeAnim, slideAnim]);

  const markSeenAndNavigate = async (dest: 'profile' | 'jobs') => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    if (dest === 'profile') {
      navigation.replace('Main', { screen: 'FixerMode', params: { screen: 'FixerProfile' } });
    } else {
      goToFixerHome();
    }
  };

  const goToFixerHome = () => {
    navigation.replace('Main', { screen: 'FixerMode', params: { screen: 'FindJobs' } });
  };

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
          <Text style={[typography.h1, styles.heroTitle]}>Become a Fixer</Text>
          <Text style={[typography.body, styles.heroSubtitle]}>
            Earn money on your own terms by helping people with tasks in your area.
          </Text>
        </LinearGradient>

        {/* Benefits grid */}
        <View style={[styles.benefitsGrid, wide && styles.benefitsGridWide]}>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={[styles.benefitCard, wide && styles.benefitCardWide]}>
              <View style={styles.benefitIcon}>
                <MaterialCommunityIcons name={b.icon} size={24} color={brandColors.secondaryDark} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[typography.bodyMedium, styles.benefitTitle]}>{b.title}</Text>
                <Text style={[typography.bodySm, styles.benefitBody]}>{b.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Steps */}
        <View style={[styles.stepsSection, wide && styles.stepsSectionWide]}>
          <Text style={[typography.h3, styles.stepsHeading]}>How to get started</Text>
          <View style={styles.steps}>
            {[
              { n: '1', label: 'Complete your profile', detail: 'Add a bio and your specialisations so requesters know who you are.' },
              { n: '2', label: 'Browse open tasks', detail: 'Find jobs near you on the map or list view.' },
              { n: '3', label: 'Place a bid', detail: 'Name your price and send a short note. The requester picks their favourite.' },
            ].map((step) => (
              <View key={step.n} style={styles.step}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.n}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={[typography.bodyMedium, styles.stepLabel]}>{step.label}</Text>
                  <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{step.detail}</Text>
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
            Set Up My Profile
          </FButton>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
            onPress={() => void markSeenAndNavigate('jobs')}
          >
            <Text style={styles.skipText}>Browse jobs first →</Text>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
