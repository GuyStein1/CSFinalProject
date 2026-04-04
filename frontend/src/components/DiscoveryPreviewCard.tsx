import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import type { DiscoveryTask } from '../hooks/useTasks';
import { brandColors } from '../theme';

const CATEGORY_LABELS: Record<DiscoveryTask['category'], string> = {
  ELECTRICITY: 'Electricity',
  PLUMBING: 'Plumbing',
  CARPENTRY: 'Carpentry',
  PAINTING: 'Painting',
  MOVING: 'Moving',
  GENERAL: 'General',
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

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.categoryPill}>
            <Text variant="labelMedium" style={styles.categoryText}>
              {CATEGORY_LABELS[task.category]}
            </Text>
          </View>
          <Text variant="titleSmall" style={styles.priceText}>
            {budgetLabel}
          </Text>
        </View>

        <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>

        <Text variant="bodySmall" style={styles.meta}>
          {task.generalLocationName} · {task.distanceKm.toFixed(1)} km away
        </Text>

        <Text variant="bodySmall" style={styles.meta}>
          {task.bidCount} active bids
        </Text>

        <Button mode="contained" onPress={onViewDetails} style={styles.button}>
          View Details
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: brandColors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: brandColors.surfaceAlt,
  },
  categoryText: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  priceText: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  title: {
    marginTop: 12,
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  meta: {
    marginTop: 6,
    color: brandColors.textMuted,
  },
  button: {
    marginTop: 16,
    borderRadius: 999,
  },
});
