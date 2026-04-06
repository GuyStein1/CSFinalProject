import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FButton } from './ui';
import { brandColors, radii, spacing, typography } from '../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {/* Mascot watermark — sits behind everything */}
      <Image
        source={require('../../assets/logo-without-text.png')}
        style={styles.watermark}
        resizeMode="contain"
      />

      {/* Diamond icon container */}
      <View style={styles.diamondOuter}>
        <View style={styles.diamondInner}>
          <MaterialCommunityIcons name={icon as never} size={30} color={brandColors.primary} />
        </View>
      </View>

      <Text style={[typography.h2, styles.title]}>{title}</Text>
      {message && (
        <Text style={[typography.body, styles.message]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <FButton onPress={onAction} size="md" style={styles.button}>
          {actionLabel}
        </FButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  watermark: {
    position: 'absolute',
    width: 300,
    height: 300,
    opacity: 0.04,
    alignSelf: 'center',
  },
  // Outer rotated square = diamond shape
  diamondOuter: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: brandColors.infoSoft,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl + 8,
    marginTop: spacing.md,
  },
  // Counter-rotate so the icon stays upright
  diamondInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    color: brandColors.textPrimary,
  },
  message: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: brandColors.textMuted,
    maxWidth: 300,
  },
  button: {
    marginTop: spacing.xxl,
  },
});
