import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { brandColors, spacing, radii } from '../theme';

const FULL_LOGO_ASPECT_RATIO = 662 / 534;

interface AppLogoProps {
  compact?: boolean;
  onDark?: boolean;
  showTagline?: boolean;
  /** Renders only the icon shell — no wordmark or tagline */
  iconOnly?: boolean;
}

export default function AppLogo({
  compact = false,
  onDark = false,
  showTagline = !compact,
  iconOnly = false,
}: AppLogoProps) {
  if (!compact && !iconOnly) {
    return (
      <Image
        source={require('../../assets/fixit-logo.png')}
        style={styles.fullLogo}
        resizeMode="contain"
      />
    );
  }

  const wordmarkColor = onDark ? brandColors.textOnDark : brandColors.primary;
  const taglineColor = onDark ? brandColors.textOnDarkMuted : brandColors.textMuted;

  /**
   * Geometric brand mark — a slightly rotated amber square with a bold "F" inside.
   * Counter-rotating the text keeps it upright while the badge tilts.
   * No images → no tinting issues, works on every platform and background.
   */
  const TILT = 13;
  const iconShell = (
    <View style={styles.markOuter}>
      {/* Rotated amber badge */}
      <View style={[styles.markBadge, { transform: [{ rotate: `${TILT}deg` }] }]} />
      {/* Counter-rotated letter stays upright */}
      <Text style={[styles.markLetter, { transform: [{ rotate: `-${TILT}deg` }] }]}>
        F
      </Text>
    </View>
  );

  if (iconOnly) return iconShell;

  return (
    <View style={styles.row}>
      {iconShell}
      <View>
        <Text style={[styles.wordmark, { color: wordmarkColor }]}>FIXIT</Text>
        {showTagline && (
          <Text style={[styles.tagline, { color: taglineColor }]}>YOUR HOME HERO</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  fullLogo: {
    width: 188,
    aspectRatio: FULL_LOGO_ASPECT_RATIO,
  },
  // Outer container holds the stacked badge + letter
  markOuter: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The badge shape itself — sits behind the letter
  markBadge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: brandColors.secondary,
  },
  // Bold "F" on top, counter-rotated to stay upright
  markLetter: {
    fontSize: 15,
    fontWeight: '900',
    color: brandColors.primaryDark,
    lineHeight: 18,
    letterSpacing: -0.5,
  },
  wordmark: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 20,
  },
  tagline: {
    marginTop: 1,
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
});
