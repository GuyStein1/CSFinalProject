import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { DiscoveryTask } from '../hooks/useTasks';
import { getCategoryMetadata } from '../constants/categories';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

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
  hasBid?: boolean;
  onPress: () => void;
}

export default function DiscoveryListCard({ task, hasBid = false, onPress }: DiscoveryListCardProps) {
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : 'Quote Required';
  const catMeta = getCategoryMetadata(task.category);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open task ${task.title}`}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: catMeta.color }]} />
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: catMeta.bg }]}>
          <MaterialCommunityIcons name={catMeta.icon} size={20} color={catMeta.color} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[typography.h3, styles.title]} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={styles.categoryLine}>
            <Text style={[typography.caption, { color: catMeta.color }]}>{catMeta.label}</Text>
            <View style={styles.metaDot} />
            <Text style={[typography.caption, styles.metaText]}>{formatTimeAgo(task.createdAt)}</Text>
          </View>
          {hasBid && (
            <View style={styles.bidStatusPill}>
              <MaterialCommunityIcons name="check-circle-outline" size={12} color={brandColors.success} />
              <Text style={[typography.caption, styles.bidStatusText]}>Bid sent</Text>
            </View>
          )}
        </View>
        <View style={styles.priceTag}>
          <Text style={[typography.h3, styles.price]}>{budgetLabel}</Text>
        </View>
      </View>

      {!!task.description && (
        <Text style={[typography.bodySm, styles.description]} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText]}>
            {task.generalLocationName} / {task.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="hand-extended-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText]}>
            {task.bidCount} {task.bidCount === 1 ? 'bid' : 'bids'}
          </Text>
        </View>
        <View style={[styles.detailsCue, hasBid && styles.bidDetailsCue]}>
          <Text style={[typography.caption, hasBid ? styles.bidDetailsText : styles.detailsText]}>
            {hasBid ? 'View bid' : 'Details'}
          </Text>
          <MaterialCommunityIcons
            name={hasBid ? 'check-circle-outline' : 'arrow-right'}
            size={13}
            color={hasBid ? brandColors.success : brandColors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  categoryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bidStatusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(81,122,88,0.22)',
  },
  bidStatusText: {
    color: brandColors.success,
    fontWeight: '700',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brandColors.outline,
  },
  title: {
    color: brandColors.textPrimary,
  },
  priceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: brandColors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(155,109,42,0.16)',
  },
  price: {
    color: brandColors.secondaryDark,
  },
  description: {
    color: brandColors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: brandColors.textMuted,
  },
  detailsCue: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.infoSoft,
  },
  bidDetailsCue: {
    backgroundColor: brandColors.successSoft,
  },
  detailsText: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  bidDetailsText: {
    color: brandColors.success,
    fontWeight: '700',
  },
});
