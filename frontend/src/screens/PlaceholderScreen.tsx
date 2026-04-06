import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLogo from '../components/AppLogo';
import { FCard } from '../components/ui';
import { brandColors, spacing, typography } from '../theme';

interface Props {
  title: string;
}

export default function PlaceholderScreen({ title }: Props) {
  return (
    <View style={styles.container}>
      <FCard style={styles.card} shadow="md">
        <View style={styles.content}>
          <AppLogo />
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="hammer-wrench" size={28} color={brandColors.primaryMuted} />
          </View>
          <Text style={[typography.h2, styles.title]}>{title}</Text>
          <Text style={[typography.body, styles.subtitle]}>
            This part of the app is being polished next.
          </Text>
        </View>
      </FCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.background,
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: brandColors.textPrimary,
  },
  subtitle: {
    color: brandColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
});
