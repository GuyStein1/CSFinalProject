import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { brandColors, spacing, typography } from '../theme';

interface LoadingScreenProps {
  label?: string;
}

const WHITE_TINT = Platform.OS === 'web'
  ? ({ filter: 'brightness(0) invert(1)' } as object)
  : { tintColor: '#FFFFFF' };

function PulsingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation;
    const timer = setTimeout(() => {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(380),
        ])
      );
      anim.start();
    }, delay);

    return () => {
      clearTimeout(timer);
      anim?.stop();
    };
  }, []);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

export default function LoadingScreen({ label = 'Loading your workspace...' }: LoadingScreenProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <LinearGradient
      colors={['#050D18', '#0C1E33', '#132D4A', '#1A3D63']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.container}
    >
      {/* Decorative depth orbs */}
      <View style={[styles.orb, styles.orbTopLeft]} />
      <View style={[styles.orb, styles.orbBottomRight]} />

      <Animated.View style={[styles.inner, { opacity: fadeIn }]}>
        {/* Pulsing mascot mark */}
        <Animated.Image
          source={require('../../assets/logo-without-text.png')}
          style={[styles.mascot, WHITE_TINT, { transform: [{ scale }] }]}
          resizeMode="contain"
        />

        {/* Staggered amber dots */}
        <View style={styles.dotsRow}>
          <PulsingDot delay={0} />
          <PulsingDot delay={190} />
          <PulsingDot delay={380} />
        </View>

        {/* Label */}
        <Text style={[typography.bodySm, styles.label]}>{label}</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopLeft: {
    width: 320,
    height: 320,
    top: -130,
    left: -100,
    backgroundColor: 'rgba(42, 100, 160, 0.28)',
  },
  orbBottomRight: {
    width: 240,
    height: 240,
    bottom: -90,
    right: -80,
    backgroundColor: 'rgba(26, 61, 99, 0.4)',
  },
  inner: {
    alignItems: 'center',
    gap: spacing.xxl,
  },
  mascot: {
    width: 148,
    height: 148,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: brandColors.secondary,
  },
  label: {
    color: 'rgba(255, 252, 246, 0.5)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
