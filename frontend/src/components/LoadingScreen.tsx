import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { brandColors, spacing, typography } from '../theme';

interface LoadingScreenProps {
  label?: string;
}

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
      duration: 700,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1100,
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
      {/* Depth orbs */}
      <View style={[styles.orb, styles.orbTopLeft]} />
      <View style={[styles.orb, styles.orbBottomRight]} />

      <Animated.View style={[styles.inner, { opacity: fadeIn }]}>
        {/*
         * Circular "coin" — the logo's light background becomes the coin surface.
         * No tinting needed; the white circle contains the logo naturally.
         */}
        <Animated.View style={[styles.coin, { transform: [{ scale }] }]}>
          <View style={styles.coinRing} />
          <Image
            source={require('../../assets/fixit-logo.png')}
            style={styles.coinLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Staggered amber dots */}
        <View style={styles.dotsRow}>
          <PulsingDot delay={0} />
          <PulsingDot delay={190} />
          <PulsingDot delay={380} />
        </View>

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
  // White circular "coin/medallion" that contains the logo
  coin: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#FFFCF6',
    alignItems: 'center',
    justifyContent: 'center',
    // Ring shadow for depth
    shadowColor: brandColors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  // Amber ring accent around the coin
  coinRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: brandColors.secondary,
    opacity: 0.6,
  },
  coinLogo: {
    width: 104,
    height: 84,
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
