import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StatusBadge from './StatusBadge';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type Category = 'ASSEMBLY' | 'MOUNTING' | 'MOVING' | 'PAINTING' | 'PLUMBING' | 'ELECTRICITY' | 'OUTDOORS' | 'CLEANING';

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  ASSEMBLY:    { icon: 'hammer-screwdriver', color: '#7B61FF', bg: '#EFECFF' },
  MOUNTING:    { icon: 'television',         color: '#0D7C6E', bg: '#E0F5F3' },
  MOVING:      { icon: 'truck-delivery',     color: '#1E8449', bg: '#E6F4EC' },
  PAINTING:    { icon: 'brush',              color: '#C0392B', bg: '#FCECEA' },
  PLUMBING:    { icon: 'water-pump',         color: '#2E86C1', bg: '#E4F2FB' },
  ELECTRICITY: { icon: 'lightning-bolt',     color: '#D4900A', bg: '#FEF3D7' },
  OUTDOORS:    { icon: 'tree-outline',       color: '#27AE60', bg: '#E8F8EF' },
  CLEANING:    { icon: 'broom',             color: '#8E44AD', bg: '#F4ECF7' },
};

interface TaskCardProps {
  title: string;
  category: Category;
  status: TaskStatus;
  suggestedPrice?: number | null;
  locationName: string;
  bidCount?: number;
  fixerName?: string;
  onPress?: () => void;
  muted?: boolean;
}

export default function TaskCard({
  title,
  category,
  status,
  suggestedPrice,
  locationName,
  bidCount,
  fixerName,
  onPress,
  muted = false,
}: TaskCardProps) {
  const meta = CATEGORY_META[category] ?? { icon: 'wrench', color: '#7A8B96', bg: '#E9E2D5' };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        muted && styles.cardMuted,
        shadows.sm,
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon as never} size={20} color={meta.color} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[typography.h3, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={brandColors.textMuted} />
            <Text style={[typography.bodySm, styles.location]} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <StatusBadge status={status} />

        <View style={styles.metaGroup}>
          {suggestedPrice != null && (
            <Text style={[typography.h3, styles.price]}>₪{suggestedPrice}</Text>
          )}
          {suggestedPrice == null && (
            <Text style={[typography.bodySm, styles.quoteLabel]}>Quote</Text>
          )}
        </View>
      </View>

      {(bidCount != null && status === 'OPEN') || (fixerName && status === 'IN_PROGRESS') ? (
        <View style={styles.footer}>
          {bidCount != null && status === 'OPEN' && (
            <View style={styles.footerChip}>
              <MaterialCommunityIcons name="hand-extended-outline" size={13} color={brandColors.textMuted} />
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
              </Text>
            </View>
          )}
          {fixerName && status === 'IN_PROGRESS' && (
            <View style={styles.footerChip}>
              <MaterialCommunityIcons name="account-check-outline" size={13} color={brandColors.success} />
              <Text style={[typography.caption, { color: brandColors.success }]}>
                {fixerName}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brandColors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardMuted: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  location: {
    color: brandColors.textMuted,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    color: brandColors.primary,
  },
  quoteLabel: {
    color: brandColors.primaryMuted,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
    backgroundColor: brandColors.surfaceAlt,
  },
});
