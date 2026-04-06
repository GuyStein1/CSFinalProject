import React, { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import Feather from '@expo/vector-icons/Feather';
import { FChip } from './ui';
import type { Category } from '../hooks/useTasks';
import { brandColors, radii, spacing, shadows, typography } from '../theme';

export type ViewMode = 'map' | 'list';

// Icons must be valid MaterialCommunityIcons names (used by FChip internally)
const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: 'ASSEMBLY',    label: 'Assembly',    icon: 'wrench' },
  { value: 'MOUNTING',    label: 'Mounting',    icon: 'monitor' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'pencil' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt' },
  { value: 'OUTDOORS',    label: 'Outdoors',    icon: 'weather-sunny' },
  { value: 'CLEANING',    label: 'Cleaning',    icon: 'weather-windy' },
];

// --- Distance slider ---
const DISTANCE_MIN = 1;
const DISTANCE_MAX = 80;

// --- Price slider ---
const PRICE_MIN = 0;
const PRICE_MAX = 5000; // 5000 represents "5000+"

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;

interface FilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  selectedCategories: Category[];
  onToggleCategory: (category: Category) => void;
  priceMin: number;
  priceMax: number;
  onPriceChange: (min: number, max: number) => void;
}

// --- Single-thumb slider for distance ---
function DistanceSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<View>(null);
  const trackLayout = useRef({ x: 0, width: 0 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fromFraction = (f: number) => Math.round(Math.max(DISTANCE_MIN, Math.min(DISTANCE_MAX, DISTANCE_MIN + f * (DISTANCE_MAX - DISTANCE_MIN))));

  const handleLayout = (e: LayoutChangeEvent) => {
    trackLayout.current.width = e.nativeEvent.layout.width;
    trackRef.current?.measureInWindow((x) => {
      trackLayout.current.x = x;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { x, width } = trackLayout.current;
        if (width === 0) return;
        const f = Math.max(0, Math.min(1, (e.nativeEvent.pageX - x) / width));
        onChangeRef.current(fromFraction(f));
      },
      onPanResponderMove: (e) => {
        const { x, width } = trackLayout.current;
        if (width === 0) return;
        const f = Math.max(0, Math.min(1, (e.nativeEvent.pageX - x) / width));
        onChangeRef.current(fromFraction(f));
      },
    }),
  ).current;

  const fraction = (value - DISTANCE_MIN) / (DISTANCE_MAX - DISTANCE_MIN);

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Feather name="navigation" size={13} color={brandColors.textMuted} />
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>Distance</Text>
        <Text style={[typography.label, { color: brandColors.primary, marginLeft: 'auto' }]}>
          {value} km
        </Text>
      </View>
      <View
        ref={trackRef}
        style={sliderStyles.trackContainer}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={sliderStyles.track} />
        <View style={[sliderStyles.trackFilled, { width: `${fraction * 100}%` }]} />
        <View style={[sliderStyles.thumbWrapper, { left: `${fraction * 100}%`, marginLeft: -THUMB_SIZE / 2 }]}>
          <View style={sliderStyles.thumbBubble}>
            <Text style={sliderStyles.thumbBubbleText}>{value}</Text>
          </View>
          <View style={sliderStyles.thumb} />
        </View>
      </View>
    </View>
  );
}

// --- Dual-thumb slider for price range ---
function PriceRangeSlider({
  minValue,
  maxValue,
  onChange,
}: {
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const trackLayout = useRef({ x: 0, width: 0 });
  const dragging = useRef<'min' | 'max' | null>(null);
  const valuesRef = useRef({ min: minValue, max: maxValue });
  valuesRef.current = { min: minValue, max: maxValue };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const toFrac = (v: number) => (v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN);
  const fromFrac = (f: number) => {
    const raw = PRICE_MIN + f * (PRICE_MAX - PRICE_MIN);
    if (raw <= 100) return Math.round(raw / 10) * 10;
    if (raw <= 500) return Math.round(raw / 25) * 25;
    if (raw <= 2000) return Math.round(raw / 50) * 50;
    return Math.round(raw / 100) * 100;
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    trackLayout.current.width = e.nativeEvent.layout.width;
    trackRef.current?.measureInWindow((x) => {
      trackLayout.current.x = x;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { x, width } = trackLayout.current;
        if (width === 0) return;
        const f = Math.max(0, Math.min(1, (e.nativeEvent.pageX - x) / width));
        const { min, max } = valuesRef.current;
        const minF = toFrac(min);
        const maxF = toFrac(max);
        dragging.current = Math.abs(f - minF) <= Math.abs(f - maxF) ? 'min' : 'max';
        const val = fromFrac(f);
        if (dragging.current === 'min') {
          onChangeRef.current(Math.min(val, max), max);
        } else {
          onChangeRef.current(min, Math.max(val, min));
        }
      },
      onPanResponderMove: (e) => {
        const { x, width } = trackLayout.current;
        if (width === 0) return;
        const f = Math.max(0, Math.min(1, (e.nativeEvent.pageX - x) / width));
        const val = fromFrac(f);
        const { min, max } = valuesRef.current;
        if (dragging.current === 'min') {
          const clamped = Math.min(val, max);
          if (clamped !== min) onChangeRef.current(clamped, max);
        } else {
          const clamped = Math.max(val, min);
          if (clamped !== max) onChangeRef.current(min, clamped);
        }
      },
    }),
  ).current;

  const minF = toFrac(minValue);
  const maxF = toFrac(maxValue);

  const formatPrice = (v: number) => (v >= PRICE_MAX ? '5000+' : `${v}`);

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Feather name="dollar-sign" size={13} color={brandColors.textMuted} />
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>Price</Text>
        <Text style={[typography.label, { color: brandColors.primary, marginLeft: 'auto' }]}>
          {minValue === PRICE_MIN && maxValue >= PRICE_MAX
            ? 'Any price'
            : `₪${formatPrice(minValue)} – ₪${formatPrice(maxValue)}`}
        </Text>
      </View>
      <View
        ref={trackRef}
        style={sliderStyles.trackContainer}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={sliderStyles.track} />
        <View
          style={[
            sliderStyles.trackFilled,
            { left: `${minF * 100}%`, width: `${(maxF - minF) * 100}%` },
          ]}
        />
        <View style={[sliderStyles.thumbWrapper, { left: `${minF * 100}%`, marginLeft: -THUMB_SIZE / 2 }]}>
          <View style={sliderStyles.thumbBubble}>
            <Text style={sliderStyles.thumbBubbleText}>{formatPrice(minValue)}</Text>
          </View>
          <View style={sliderStyles.thumb} />
        </View>
        <View style={[sliderStyles.thumbWrapper, { left: `${maxF * 100}%`, marginLeft: -THUMB_SIZE / 2 }]}>
          <View style={sliderStyles.thumbBubble}>
            <Text style={sliderStyles.thumbBubbleText}>{formatPrice(maxValue)}</Text>
          </View>
          <View style={sliderStyles.thumb} />
        </View>
      </View>
    </View>
  );
}

export default function FilterBar({
  viewMode,
  onViewModeChange,
  radius,
  onRadiusChange,
  selectedCategories,
  onToggleCategory,
  priceMin,
  priceMax,
  onPriceChange,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {/* Top row: view toggle + category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* View toggle */}
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

        {/* Expand/collapse button for sliders */}
        <Pressable
          style={[styles.filterToggle, expanded && styles.filterToggleActive]}
          onPress={() => setExpanded((p) => !p)}
        >
          <Feather name="sliders" size={14} color={expanded ? brandColors.primary : brandColors.textMuted} />
          <Text style={[typography.caption, { color: expanded ? brandColors.primary : brandColors.textMuted }]}>
            {radius} km · ₪{priceMin === 0 && priceMax >= PRICE_MAX ? 'Any' : `${priceMin}–${priceMax >= PRICE_MAX ? '5000+' : priceMax}`}
          </Text>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={brandColors.textMuted} />
        </Pressable>

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
      </ScrollView>

      {/* Expandable slider panel */}
      {expanded && (
        <View style={styles.sliderPanel}>
          <DistanceSlider value={radius} onChange={onRadiusChange} />
          <PriceRangeSlider minValue={priceMin} maxValue={priceMax} onChange={onPriceChange} />
        </View>
      )}

      {/* Amber bottom accent bar */}
      <View style={styles.bottomAccent} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trackContainer: {
    height: THUMB_SIZE + 26,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: brandColors.surfaceAlt,
    marginBottom: THUMB_SIZE / 2 - TRACK_HEIGHT / 2,
  },
  trackFilled: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: brandColors.secondary,
    bottom: THUMB_SIZE / 2 - TRACK_HEIGHT / 2,
  },
  thumbWrapper: {
    position: 'absolute',
    bottom: 0,
    width: THUMB_SIZE,
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: brandColors.surface,
    borderWidth: 2.5,
    borderColor: brandColors.primary,
    ...shadows.sm,
  },
  thumbBubble: {
    backgroundColor: brandColors.primary,
    borderRadius: radii.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  thumbBubbleText: {
    color: brandColors.textOnDark,
    fontSize: 10,
    fontWeight: '700',
  },
});

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
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    backgroundColor: brandColors.surfaceAlt,
  },
  filterToggleActive: {
    backgroundColor: brandColors.infoSoft,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: brandColors.outlineLight,
    marginHorizontal: spacing.xs,
  },
  sliderPanel: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brandColors.outlineLight,
  },
  bottomAccent: {
    height: 2,
    backgroundColor: brandColors.secondary,
    opacity: 0.5,
  },
});
