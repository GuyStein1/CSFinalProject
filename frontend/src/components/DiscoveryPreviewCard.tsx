import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FButton } from './ui';
import type { DiscoveryTask } from '../hooks/useTasks';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  ELECTRICITY: { label: 'Electricity', color: '#F0B429' },
  PLUMBING:    { label: 'Plumbing',    color: '#4A90D9' },
  CARPENTRY:   { label: 'Carpentry',   color: '#A07553' },
  PAINTING:    { label: 'Painting',    color: '#8B6DAF' },
  MOVING:      { label: 'Moving',      color: '#4CAF7D' },
  GENERAL:     { label: 'General',     color: '#7A8B96' },
};

interface DiscoveryPreviewCardProps {
  task: DiscoveryTask;
  onViewDetails: () => void;
}

export default function DiscoveryPreviewCard({
  task,
  onViewDetails,
}: DiscoveryPreviewCardProps) {
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : 'Quote Required';
  const catMeta = CATEGORY_META[task.category] ?? CATEGORY_META.GENERAL;

  return (
    <View style={[styles.card, shadows.lg]}>
      <View style={styles.headerRow}>
        <View style={[styles.categoryPill, { backgroundColor: catMeta.color + '18' }]}>
          <Text style={[typography.label, { color: catMeta.color }]}>{catMeta.label}</Text>
        </View>
        <Text style={[typography.h3, styles.priceText]}>{budgetLabel}</Text>
      </View>

      <Text style={[typography.h2, styles.title]} numberOfLines={2}>
        {task.title}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={brandColors.textMuted} />
          <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
            {task.generalLocationName} · {task.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="hand-extended-outline" size={14} color={brandColors.textMuted} />
          <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
            {task.bidCount} {task.bidCount === 1 ? 'bid' : 'bids'}
          </Text>
        </View>
      </View>

      <FButton onPress={onViewDetails} fullWidth icon="arrow-right" size="md">
        View Details
      </FButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radii.xl,
    backgroundColor: brandColors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  priceText: {
    color: brandColors.primary,
  },
  title: {
    color: brandColors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
