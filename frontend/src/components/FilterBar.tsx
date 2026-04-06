import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Feather from '@expo/vector-icons/Feather';
import { FChip } from './ui';
import type { Category } from '../hooks/useTasks';
import { brandColors, radii, spacing, shadows, typography } from '../theme';

export type PriceRange = 'any' | '0-100' | '100-500' | '500+';
export type ViewMode = 'map' | 'list';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200] as const;

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: 'ASSEMBLY',    label: 'Assembly',    icon: 'tool' },
  { value: 'MOUNTING',    label: 'Mounting',    icon: 'monitor' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'edit-2' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'droplet' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'zap' },
  { value: 'OUTDOORS',    label: 'Outdoors',    icon: 'sun' },
  { value: 'CLEANING',    label: 'Cleaning',    icon: 'wind' },
];

const PRICE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: 'any',     label: 'Any price' },
  { value: '0-100',   label: '₪0–100' },
  { value: '100-500', label: '₪100–500' },
  { value: '500+',    label: '₪500+' },
];

interface FilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  selectedCategories: Category[];
  onToggleCategory: (category: Category) => void;
  priceRange: PriceRange;
  onPriceRangeChange: (range: PriceRange) => void;
}

export default function FilterBar({
  viewMode,
  onViewModeChange,
  radius,
  onRadiusChange,
  selectedCategories,
  onToggleCategory,
  priceRange,
  onPriceRangeChange,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* View toggle — Feather icons in a segmented control shape */}
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => onViewModeChange('map')}
          >
            <Feather
              name="map"
              size={15}
              color={viewMode === 'map' ? brandColors.primary : brandColors.textMuted}
            />
            <Text style={[typography.caption, { color: viewMode === 'map' ? brandColors.primary : brandColors.textMuted, fontWeight: viewMode === 'map' ? '700' : '500' }]}>
              Map
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => onViewModeChange('list')}
          >
            <Feather
              name="list"
              size={15}
              color={viewMode === 'list' ? brandColors.primary : brandColors.textMuted}
            />
            <Text style={[typography.caption, { color: viewMode === 'list' ? brandColors.primary : brandColors.textMuted, fontWeight: viewMode === 'list' ? '700' : '500' }]}>
              List
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {RADIUS_OPTIONS.map((r) => (
          <FChip
            key={`r-${r}`}
            label={`${r} km`}
            selected={radius === r}
            onPress={() => onRadiusChange(r)}
            compact
          />
        ))}

        <View style={styles.divider} />

        {CATEGORY_OPTIONS.map(({ value, label, icon }) => (
          <FChip
            key={value}
            label={label}
            icon={icon}
            selected={selectedCategories.includes(value)}
            onPress={() => onToggleCategory(value)}
            compact
          />
        ))}

        <View style={styles.divider} />

        {PRICE_OPTIONS.map(({ value, label }) => (
          <FChip
            key={value}
            label={label}
            selected={priceRange === value}
            onPress={() => onPriceRangeChange(value)}
            compact
          />
        ))}
      </ScrollView>

      {/* Amber bottom accent bar */}
      <View style={styles.bottomAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: brandColors.surface,
    ...shadows.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Segmented view toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.xs,
  },
  toggleBtnActive: {
    backgroundColor: brandColors.surface,
    shadowColor: brandColors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: brandColors.outlineLight,
    marginHorizontal: spacing.xs,
  },
  // Thin amber line at the bottom of the filter bar
  bottomAccent: {
    height: 2,
    backgroundColor: brandColors.secondary,
    opacity: 0.5,
  },
});
