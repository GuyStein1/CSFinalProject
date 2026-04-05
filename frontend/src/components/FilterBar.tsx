import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FChip } from './ui';
import type { Category } from '../hooks/useTasks';
import { brandColors, spacing, shadows } from '../theme';

export type PriceRange = 'any' | '0-100' | '100-500' | '500+';
export type ViewMode = 'map' | 'list';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200] as const;

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: 'ASSEMBLY',    label: 'Assembly',    icon: 'hammer-screwdriver' },
  { value: 'MOUNTING',    label: 'Mounting',    icon: 'television' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck-delivery' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'brush' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water-pump' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt' },
  { value: 'OUTDOORS',    label: 'Outdoors',    icon: 'tree-outline' },
  { value: 'CLEANING',    label: 'Cleaning',    icon: 'broom' },
];

const PRICE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: 'any', label: 'Any price' },
  { value: '0-100', label: '₪0–100' },
  { value: '100-500', label: '₪100–500' },
  { value: '500+', label: '₪500+' },
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
        <FChip
          label="Map"
          icon="map"
          selected={viewMode === 'map'}
          onPress={() => onViewModeChange('map')}
          compact
        />
        <FChip
          label="List"
          icon="format-list-bulleted"
          selected={viewMode === 'list'}
          onPress={() => onViewModeChange('list')}
          compact
        />

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
  divider: {
    width: 1,
    height: 22,
    backgroundColor: brandColors.outlineLight,
    marginHorizontal: spacing.xs,
  },
});
