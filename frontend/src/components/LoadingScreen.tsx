import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import AppLogo from './AppLogo';
import { brandColors } from '../theme';

interface LoadingScreenProps {
  label?: string;
}

export default function LoadingScreen({ label = 'Loading your workspace...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <AppLogo />
      <ActivityIndicator size="large" color={brandColors.primary} style={styles.spinner} />
      <Text variant="bodyMedium" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.background,
    padding: 24,
  },
  spinner: {
    marginTop: 8,
  },
  label: {
    marginTop: 16,
    color: brandColors.textMuted,
    textAlign: 'center',
  },
});
