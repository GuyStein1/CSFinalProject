import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { brandColors, radii, spacing, typography } from '../../theme';

interface FChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
  compact?: boolean;
}

export default function FChip({
  label,
  selected = false,
  onPress,
  icon,
  style,
  compact = false,
}: FChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        selected ? styles.selected : styles.unselected,
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as never}
          size={compact ? 14 : 16}
          color={selected ? brandColors.primary : brandColors.textMuted}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          compact ? typography.caption : typography.label,
          { color: selected ? brandColors.primary : brandColors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  compact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  selected: {
    backgroundColor: brandColors.infoSoft,
    borderColor: brandColors.primaryMuted,
  },
  unselected: {
    backgroundColor: brandColors.surfaceAlt,
    borderColor: 'transparent',
  },
  icon: {
    marginRight: spacing.xs + 2,
  },
});
