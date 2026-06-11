import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { brandColors, heroGradient, spacing, typography } from '../theme';

interface LoadingScreenProps {
  label?: string;
  /** Delay (ms) before the loader becomes visible. Avoids a flash on fast loads. */
  delayMs?: number;
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

export default function LoadingScreen({ label = 'Loading your workspace...', delayMs = 250 }: LoadingScreenProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  // Only reveal the loader if loading actually takes a moment. Quick loads
  // resolve before this flips, so the screen never flashes on transitions.
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [visible, delayMs]);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 320,
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
  }, [visible]);

  // Render nothing during the grace period — prevents the loader flashing in
  // and out on fast transitions (which looked like a glitch).
  if (!visible) return null;

  return (
    <LinearGradient
      colors={heroGradient.colors}
      locations={heroGradient.locations}
      start={heroGradient.start}
      end={heroGradient.end}
      style={styles.container}
    >
      <Animated.View style={[styles.inner, { opacity: fadeIn }]}>
        {/*
         * Circular "coin" — the logo's light background becomes the coin surface.
         * No tinting needed; the white circle contains the logo naturally.
         */}
        <Animated.View style={[styles.coin, { transform: [{ scale }] }]}>
          <View style={styles.coinRing} />
          <Image
            source={require('../../assets/fixit-logo-mark-transparent.png')}
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
    // Soft drop shadow for depth against the light background
    shadowColor: brandColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
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
    width: 108,
    height: 72,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: brandColors.secondaryDark,
  },
  label: {
    color: brandColors.textMuted,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
