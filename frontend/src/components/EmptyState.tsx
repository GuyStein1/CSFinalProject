import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FButton } from './ui';
import { brandColors, spacing, radii, typography } from '../theme';

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
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon as never} size={36} color={brandColors.primaryMuted} />
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
