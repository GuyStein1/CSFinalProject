import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { glass, glassText, brandColors } from '../theme';

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
      <BlurView intensity={glass.light.blur} tint={glass.light.tint} style={styles.iconShell}>
        <View style={styles.iconShellBorder} />
        <MaterialCommunityIcons name={icon as never} size={36} color={glassText.amber} />
      </BlurView>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.82}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
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
    gap: 12,
  },
  iconShell: {
    width: 88,
    height: 88,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.light.bg,
    marginBottom: 4,
  },
  iconShellBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: glass.light.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: glassText.primary,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: glassText.secondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  button: {
    marginTop: 8,
    backgroundColor: brandColors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
});
