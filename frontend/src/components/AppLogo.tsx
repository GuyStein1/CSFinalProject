import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { brandColors, spacing, radii } from '../theme';

const FULL_LOGO_ASPECT_RATIO = 662 / 534;

interface AppLogoProps {
  compact?: boolean;
  onDark?: boolean;
  showTagline?: boolean;
}

export default function AppLogo({
  compact = false,
  onDark = false,
  showTagline = !compact,
}: AppLogoProps) {
  if (!compact) {
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

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.markShell,
          onDark ? styles.markShellDark : styles.markShellLight,
        ]}
      >
        <View style={styles.accent} />
        <MaterialCommunityIcons
          name="hammer-wrench"
          size={20}
          color={wordmarkColor}
        />
      </View>

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
  accent: {
    position: 'absolute',
    top: 4,
    left: 5,
    width: 10,
    height: 7,
    borderRadius: 10,
    backgroundColor: brandColors.secondary,
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
