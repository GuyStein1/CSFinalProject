import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';

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
      <Icon source={icon} size={64} color="#9E9E9E" />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {message && (
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
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
  title: {
    marginTop: 16,
    textAlign: 'center',
    color: '#424242',
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    color: '#757575',
  },
  button: {
    marginTop: 24,
  },
});
