import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import AppLogo from './AppLogo';
import { glass, glassText } from '../theme';

interface LoadingScreenProps {
  label?: string;
}

export default function LoadingScreen({ label = 'Loading your workspace...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <BlurView intensity={glass.medium.blur} tint={glass.medium.tint} style={styles.card}>
        <View style={styles.cardBorder} />
        <AppLogo />
        <ActivityIndicator size="large" color={glassText.amber} style={styles.spinner} />
        <Text style={styles.label}>{label}</Text>
      </BlurView>
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
  card: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: glass.medium.bg,
    gap: 16,
    minWidth: 260,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: glass.medium.border,
  },
  spinner: {
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: glassText.secondary,
    textAlign: 'center',
  },
});
