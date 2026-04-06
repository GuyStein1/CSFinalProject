import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { brandColors, spacing, typography } from '../../theme';

interface FSectionHeaderProps {
  title: string;
  accentColor?: string;
  count?: number;
  muted?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function FSectionHeader({
  title,
  accentColor,
  count,
  muted = false,
  actionLabel,
  onAction,
  style,
}: FSectionHeaderProps) {
  const accent = accentColor ?? (muted ? brandColors.outline : brandColors.secondary);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <Text
          style={[
            typography.h3,
            { color: muted ? brandColors.textMuted : brandColors.textPrimary },
          ]}
        >
          {title}
        </Text>
        {count != null && (
          <View
            style={[
              styles.badge,
              { backgroundColor: muted ? brandColors.surfaceAlt : brandColors.secondary },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: muted ? brandColors.textMuted : brandColors.textPrimary },
              ]}
            >
              {count}
            </Text>
          </View>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[typography.label, styles.actionText]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: 999,
  },
  actionText: {
    color: brandColors.primaryMuted,
  },
});
