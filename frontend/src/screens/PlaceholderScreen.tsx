import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import AppLogo from '../components/AppLogo';
import { brandColors } from '../theme';

interface Props {
  title: string;
}

export default function PlaceholderScreen({ title }: Props) {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <AppLogo />
          <Text variant="headlineSmall" style={styles.title}>{title}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            This part of the app is being polished next.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.background,
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  content: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  title: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    color: brandColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
});
