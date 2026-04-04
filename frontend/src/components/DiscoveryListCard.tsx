import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, Text, useTheme } from 'react-native-paper';
import type { DiscoveryTask } from '../hooks/useTasks';
import { brandColors } from '../theme';

const CATEGORY_ICONS: Record<DiscoveryTask['category'], string> = {
  ELECTRICITY: 'lightning-bolt',
  PLUMBING: 'water',
  CARPENTRY: 'hammer',
  PAINTING: 'format-paint',
  MOVING: 'truck',
  GENERAL: 'wrench',
};

const CATEGORY_LABELS: Record<DiscoveryTask['category'], string> = {
  ELECTRICITY: 'Electricity',
  PLUMBING: 'Plumbing',
  CARPENTRY: 'Carpentry',
  PAINTING: 'Painting',
  MOVING: 'Moving',
  GENERAL: 'General',
};

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

interface DiscoveryListCardProps {
  task: DiscoveryTask;
  onPress: () => void;
}

export default function DiscoveryListCard({ task, onPress }: DiscoveryListCardProps) {
  const theme = useTheme();
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : 'Quote Required';

  return (
    <Card style={styles.card} onPress={onPress} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.iconShell}>
            <Icon source={CATEGORY_ICONS[task.category]} size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.titleBlock}>
            <Text variant="titleSmall" style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
            <Text variant="labelSmall" style={styles.categoryLabel}>
              {CATEGORY_LABELS[task.category]}
            </Text>
          </View>
          <Text variant="titleSmall" style={styles.price}>
            {budgetLabel}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon source="map-marker-outline" size={14} color={brandColors.textMuted} />
            <Text variant="bodySmall" style={styles.metaText}>
              {task.generalLocationName} — {task.distanceKm.toFixed(1)} km
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon source="clock-outline" size={14} color={brandColors.textMuted} />
            <Text variant="bodySmall" style={styles.metaText}>
              Posted {formatTimeAgo(task.createdAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon source="hand-extended-outline" size={14} color={brandColors.textMuted} />
            <Text variant="bodySmall" style={styles.metaText}>
              {task.bidCount} {task.bidCount === 1 ? 'bid' : 'bids'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 22,
    backgroundColor: brandColors.surface,
    shadowColor: '#112336',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  content: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  categoryLabel: {
    color: brandColors.textMuted,
    marginTop: 2,
  },
  price: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: brandColors.textMuted,
  },
});
