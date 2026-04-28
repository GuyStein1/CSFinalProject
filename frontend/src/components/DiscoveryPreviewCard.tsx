import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FButton } from './ui';
import type { DiscoveryTask } from '../hooks/useTasks';
import { getCategoryMetadata } from '../constants/categories';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

interface DiscoveryPreviewCardProps {
  task: DiscoveryTask;
  onViewDetails: () => void;
}

export default function DiscoveryPreviewCard({
  task,
  onViewDetails,
}: DiscoveryPreviewCardProps) {
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : 'Quote Required';
  const catMeta = getCategoryMetadata(task.category);

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
