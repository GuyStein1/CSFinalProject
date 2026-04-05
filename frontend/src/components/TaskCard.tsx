import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StatusBadge from './StatusBadge';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type Category = 'ELECTRICITY' | 'PLUMBING' | 'CARPENTRY' | 'PAINTING' | 'MOVING' | 'GENERAL';

const CATEGORY_META: Record<Category, { icon: string; color: string; bg: string }> = {
  ELECTRICITY: { icon: 'lightning-bolt', color: '#F0B429', bg: '#FEF3D7' },
  PLUMBING:    { icon: 'water',          color: '#4A90D9', bg: '#DDE7EE' },
  CARPENTRY:   { icon: 'hammer',         color: '#A07553', bg: '#EDE0D0' },
  PAINTING:    { icon: 'format-paint',   color: '#8B6DAF', bg: '#EAE0F0' },
  MOVING:      { icon: 'truck',          color: '#4CAF7D', bg: '#D5EBD8' },
  GENERAL:     { icon: 'wrench',         color: '#7A8B96', bg: brandColors.surfaceAlt },
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
  const meta = CATEGORY_META[category] ?? CATEGORY_META.GENERAL;

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
