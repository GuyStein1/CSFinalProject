import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { DiscoveryTask } from '../hooks/useTasks';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

const CATEGORY_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  ASSEMBLY:    { icon: 'hammer-screwdriver', label: 'Assembly',    color: '#7B61FF', bg: '#EFECFF' },
  MOUNTING:    { icon: 'television',         label: 'Mounting',    color: '#0D7C6E', bg: '#E0F5F3' },
  MOVING:      { icon: 'truck-delivery',     label: 'Moving',      color: '#1E8449', bg: '#E6F4EC' },
  PAINTING:    { icon: 'brush',              label: 'Painting',    color: '#C0392B', bg: '#FCECEA' },
  PLUMBING:    { icon: 'water-pump',         label: 'Plumbing',    color: '#2E86C1', bg: '#E4F2FB' },
  ELECTRICITY: { icon: 'lightning-bolt',     label: 'Electricity', color: '#D4900A', bg: '#FEF3D7' },
  OUTDOORS:    { icon: 'tree-outline',       label: 'Outdoors',    color: '#27AE60', bg: '#E8F8EF' },
  CLEANING:    { icon: 'broom',             label: 'Cleaning',    color: '#8E44AD', bg: '#F4ECF7' },
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
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : 'Quote Required';
  const catMeta = CATEGORY_META[task.category] ?? { icon: 'wrench', label: 'Other', color: '#7A8B96', bg: '#E9E2D5' };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: catMeta.bg }]}>
          <MaterialCommunityIcons name={catMeta.icon as never} size={20} color={catMeta.color} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[typography.h3, styles.title]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={[typography.caption, { color: catMeta.color }]}>{catMeta.label}</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={[typography.h3, styles.price]}>{budgetLabel}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText]}>
            {task.generalLocationName} — {task.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText]}>
            {formatTimeAgo(task.createdAt)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="hand-extended-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText]}>
            {task.bidCount} {task.bidCount === 1 ? 'bid' : 'bids'}
          </Text>
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
    gap: spacing.md,
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
  title: {
    color: brandColors.textPrimary,
  },
  priceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: brandColors.infoSoft,
  },
  price: {
    color: brandColors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: brandColors.textMuted,
  },
});
