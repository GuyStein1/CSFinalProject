import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { brandColors } from '../theme';

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

  const wordmarkColor = onDark ? '#FFFCF6' : brandColors.primary;
  const taglineColor = onDark ? 'rgba(255, 252, 246, 0.78)' : brandColors.textMuted;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.markShell,
          compact && styles.markShellCompact,
          onDark ? styles.markShellDark : styles.markShellLight,
        ]}
      >
        <View style={[styles.accent, compact && styles.accentCompact]} />
        <MaterialCommunityIcons
          name="hammer-wrench"
          size={compact ? 22 : 28}
          color={wordmarkColor}
        />
      </View>

      <View>
        <Text style={[styles.wordmark, compact && styles.wordmarkCompact, { color: wordmarkColor }]}>
          FIXIT
        </Text>
        {showTagline && (
          <Text style={[styles.tagline, compact && styles.taglineCompact, { color: taglineColor }]}>
            YOUR HOME HERO
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullLogo: {
    width: 150,
    height: 150,
  },
  markShell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  markShellCompact: {
    width: 38,
    height: 38,
    borderRadius: 14,
  },
  markShellLight: {
    backgroundColor: brandColors.surfaceAlt,
    borderColor: brandColors.outline,
  },
  markShellDark: {
    backgroundColor: 'rgba(255, 252, 246, 0.14)',
    borderColor: 'rgba(255, 252, 246, 0.18)',
  },
  accent: {
    position: 'absolute',
    top: 5,
    left: 6,
    width: 14,
    height: 10,
    borderRadius: 10,
    backgroundColor: brandColors.secondary,
  },
  accentCompact: {
    top: 4,
    left: 5,
    width: 11,
    height: 8,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 24,
  },
  wordmarkCompact: {
    fontSize: 18,
    lineHeight: 20,
  },
  tagline: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.4,
  },
  taglineCompact: {
    fontSize: 8,
    letterSpacing: 1.8,
  },
});
