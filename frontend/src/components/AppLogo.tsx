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
   * Geometric brand mark — the mascot image clipped inside a tilted amber-bordered badge.
   * overflow:hidden on the rotated badge clips the image to that diamond/sticker shape.
   * The image tilts with the badge, giving a stamp/sticker feel.
   */
  const TILT = 13;
  const iconShell = (
    <View style={styles.markOuter}>
      <View style={[styles.markBadge, { transform: [{ rotate: `${TILT}deg` }] }]}>
        <Image
          source={require('../../assets/logo-without-text.png')}
          style={styles.markImage}
          resizeMode="cover"
        />
      </View>
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
    width: 220,
    aspectRatio: FULL_LOGO_ASPECT_RATIO,
    alignSelf: 'center',
  },
  // Outer container — sized to contain the badge even when rotated
  markOuter: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tilted badge — amber border frames the mascot, overflow clips it to shape
  markBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.xs,
    borderWidth: 2,
    borderColor: brandColors.secondary,
    overflow: 'hidden',
    backgroundColor: '#FFFCF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image smaller than the badge so the full mascot (hammer included) fits
  markImage: {
    width: 26,
    height: 26,
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
