import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';
import type { Category } from '../hooks/useTasks';
import { brandColors } from '../theme';

export type PriceRange = 'any' | '0-100' | '100-500' | '500+';
export type ViewMode = 'map' | 'list';

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt' },
  { value: 'PLUMBING', label: 'Plumbing', icon: 'water' },
  { value: 'CARPENTRY', label: 'Carpentry', icon: 'hammer' },
  { value: 'PAINTING', label: 'Painting', icon: 'format-paint' },
  { value: 'MOVING', label: 'Moving', icon: 'truck' },
  { value: 'GENERAL', label: 'General', icon: 'wrench' },
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
        <Chip
          icon="map"
          selected={viewMode === 'map'}
          onPress={() => onViewModeChange('map')}
          showSelectedCheck={false}
          compact
          style={styles.chip}
        >
          Map
        </Chip>
        <Chip
          icon="format-list-bulleted"
          selected={viewMode === 'list'}
          onPress={() => onViewModeChange('list')}
          showSelectedCheck={false}
          compact
          style={styles.chip}
        >
          List
        </Chip>

        <View style={styles.divider} />

        {RADIUS_OPTIONS.map((r) => (
          <Chip
            key={`r-${r}`}
            selected={radius === r}
            onPress={() => onRadiusChange(r)}
            showSelectedCheck={false}
            compact
            style={styles.chip}
          >
            {r} km
          </Chip>
        ))}

        <View style={styles.divider} />

        {CATEGORY_OPTIONS.map(({ value, label, icon }) => (
          <Chip
            key={value}
            icon={icon}
            selected={selectedCategories.includes(value)}
            onPress={() => onToggleCategory(value)}
            showSelectedCheck={false}
            compact
            style={styles.chip}
          >
            {label}
          </Chip>
        ))}

        <View style={styles.divider} />

        {PRICE_OPTIONS.map(({ value, label }) => (
          <Chip
            key={value}
            selected={priceRange === value}
            onPress={() => onPriceRangeChange(value)}
            showSelectedCheck={false}
            compact
            style={styles.chip}
          >
            {label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: brandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outline,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    backgroundColor: brandColors.surfaceAlt,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: brandColors.outline,
    marginHorizontal: 4,
  },
});
