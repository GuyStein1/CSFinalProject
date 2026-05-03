import React from 'react';
import {
  Image,
  type ImageStyle,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { brandColors, spacing } from '../theme';

const MARK_ASPECT_RATIO = 436 / 291;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const transparentMark = require('../../assets/fixit-logo-mark-transparent.png') as number;

type AppLogoVariant = 'mark' | 'lockup' | 'wordmark' | 'heroSilhouette';

interface AppLogoProps {
  compact?: boolean;
  onDark?: boolean;
  showTagline?: boolean;
  /** Renders only the icon shell — no wordmark or tagline */
  iconOnly?: boolean;
  variant?: AppLogoVariant;
  style?: StyleProp<ViewStyle | ImageStyle>;
}

export default function AppLogo({
  compact = false,
  onDark = false,
  showTagline = !compact,
  iconOnly = false,
  variant,
  style,
}: AppLogoProps) {
  const resolvedVariant: AppLogoVariant = iconOnly ? 'mark' : variant ?? 'lockup';
  const wordmarkColor = onDark ? brandColors.textOnDark : brandColors.primary;
  const taglineColor = onDark ? brandColors.textOnDarkMuted : brandColors.textMuted;
  const rootStyle = style as StyleProp<ViewStyle>;
  const imageStyle = style as StyleProp<ImageStyle>;

  const wordmark = (
    <View style={[styles.textStack, !compact && styles.textStackCentered]}>
      <Text style={[compact ? styles.wordmarkCompact : styles.wordmark, { color: wordmarkColor }]}>
        Fix<Text style={{ color: brandColors.secondary }}>i</Text>t
      </Text>
      {showTagline && (
        <Text style={[compact ? styles.taglineCompact : styles.tagline, { color: taglineColor }]}>
          YOUR NEIGHBORHOOD. FIXED.
        </Text>
      )}
    </View>
  );

  if (resolvedVariant === 'heroSilhouette') {
    return (
      <Image
        source={transparentMark}
        style={[styles.heroSilhouette, imageStyle]}
        resizeMode="contain"
      />
    );
  }

  if (resolvedVariant === 'wordmark') {
    return <View style={rootStyle}>{wordmark}</View>;
  }

  if (resolvedVariant === 'mark') {
    return (
      <Image
        source={transparentMark}
        style={[styles.mark, compact || iconOnly ? styles.markCompact : styles.markStandalone, imageStyle]}
        resizeMode="contain"
      />
    );
  }

  if (!compact) {
    return (
      <View style={[styles.verticalLockup, rootStyle]}>
        <Image source={transparentMark} style={styles.markLarge} resizeMode="contain" />
        {wordmark}
      </View>
    );
  }

  return (
    <View style={[styles.row, rootStyle]}>
      <Image source={transparentMark} style={styles.markCompact} resizeMode="contain" />
      {wordmark}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  verticalLockup: {
    width: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    alignSelf: 'center',
  },
  markCompact: {
    width: 44,
    aspectRatio: MARK_ASPECT_RATIO,
  },
  markStandalone: {
    width: 96,
    aspectRatio: MARK_ASPECT_RATIO,
  },
  markLarge: {
    width: 154,
    aspectRatio: MARK_ASPECT_RATIO,
    marginBottom: spacing.sm,
  },
  textStack: {
    justifyContent: 'center',
  },
  textStackCentered: {
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 36,
  },
  wordmarkCompact: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  tagline: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  taglineCompact: {
    marginTop: 1,
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  heroSilhouette: {
    width: 460,
    aspectRatio: MARK_ASPECT_RATIO,
    opacity: 0.08,
  },
});
