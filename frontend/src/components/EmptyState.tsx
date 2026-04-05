import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon, useTheme } from 'react-native-paper';
import { brandColors } from '../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconShell}>
        <Icon source={icon} size={40} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {message && (
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button} buttonColor={theme.colors.primary}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconShell: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    color: brandColors.textMuted,
    maxWidth: 320,
  },
  button: {
    marginTop: 24,
    borderRadius: 999,
  },
});
