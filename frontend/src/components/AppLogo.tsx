import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
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

  // Use the actual mascot image as the brand mark instead of a generic icon
  const whiteTint = Platform.OS === 'web'
    ? ({ filter: 'brightness(0) invert(1)' } as object)
    : { tintColor: '#FFFFFF' };

  const iconShell = (
    <View
      style={[
        styles.markShell,
        onDark ? styles.markShellDark : styles.markShellLight,
      ]}
    >
      <Image
        source={require('../../assets/logo-without-text.png')}
        style={[styles.markImage, onDark && whiteTint]}
        resizeMode="contain"
      />
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
  markShell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  markShellLight: {
    backgroundColor: brandColors.surfaceAlt,
    borderColor: brandColors.outlineLight,
  },
  markShellDark: {
    backgroundColor: 'rgba(255, 252, 246, 0.12)',
    borderColor: 'rgba(255, 252, 246, 0.16)',
  },
  markImage: {
    width: 32,
    height: 32,
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
