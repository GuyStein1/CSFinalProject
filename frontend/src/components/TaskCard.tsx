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
  onDelete?: () => void;
  onReactivate?: () => void;
  onCancel?: () => void;
  onMarkCompleted?: () => void;
  onEdit?: () => void;
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
  onDelete,
  onReactivate,
  onCancel,
  onMarkCompleted,
  onEdit,
  muted = false,
}: TaskCardProps) {
  const meta = CATEGORY_META[category] ?? { icon: 'wrench', color: '#7A8B96', bg: '#E9E2D5' };
  const hasActions = onDelete || onReactivate || onCancel || onMarkCompleted || onEdit;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        muted && styles.cardMuted,
        shadows.sm,
        {
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.975 : 1 }],
          backgroundColor: pressed ? brandColors.surfaceAlt : brandColors.surface,
        },
      ]}
    >
      {/* Category accent bar */}
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon as never} size={22} color={meta.color} />
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
        <StatusBadge status={status} />
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.metaGroup}>
          {suggestedPrice != null && (
            <Text style={[typography.h3, styles.price]}>₪{suggestedPrice}</Text>
          )}
          {suggestedPrice == null && (
            <Text style={[typography.bodySm, styles.quoteLabel]}>Quote</Text>
          )}
        </View>
      </View>

      {/* Bid badges & fixer assignment */}
      {bidCount != null && bidCount > 0 && status === 'OPEN' && (
        <View style={styles.newOffersBadge}>
          <MaterialCommunityIcons name="hand-extended-outline" size={13} color={brandColors.warning} />
          <Text style={[typography.caption, { color: brandColors.warning, fontWeight: '700' }]}>
            {bidCount} {bidCount === 1 ? 'new offer' : 'new offers'} — tap to review
          </Text>
        </View>
      )}
      {bidCount != null && bidCount === 0 && status === 'OPEN' && (
        <View style={styles.noBidChip}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, { color: brandColors.textMuted }]}>No bids yet</Text>
        </View>
      )}
      {fixerName && status === 'IN_PROGRESS' && (
        <View style={styles.footerChip}>
          <MaterialCommunityIcons name="account-check-outline" size={13} color={brandColors.success} />
          <Text style={[typography.caption, { color: brandColors.success }]}>
            Assigned to {fixerName}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      {hasActions && (
        <View style={styles.actionRow}>
          {onReactivate && status === 'CANCELED' && (
            <Pressable
              style={[styles.actionBtn, styles.successBtn]}
              onPress={(e) => { e.stopPropagation(); onReactivate(); }}
            >
              <MaterialCommunityIcons name="refresh" size={14} color={brandColors.success} />
              <Text style={[typography.caption, { color: brandColors.success, fontWeight: '600' }]}>
                Reactivate
              </Text>
            </Pressable>
          )}
          {onEdit && (
            <Pressable
              style={[styles.actionBtn, styles.defaultBtn]}
              onPress={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <MaterialCommunityIcons name="pencil" size={14} color={brandColors.primaryMuted} />
              <Text style={[typography.caption, { color: brandColors.primaryMuted, fontWeight: '600' }]}>
                Edit
              </Text>
            </Pressable>
          )}
          {onMarkCompleted && (
            <Pressable
              style={[styles.actionBtn, styles.successBtn]}
              onPress={(e) => { e.stopPropagation(); onMarkCompleted(); }}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={14} color={brandColors.success} />
              <Text style={[typography.caption, { color: brandColors.success, fontWeight: '600' }]}>
                Mark as Completed
              </Text>
            </Pressable>
          )}
          {onCancel && (
            <Pressable
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={(e) => { e.stopPropagation(); onCancel(); }}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={14} color={brandColors.danger} />
              <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '600' }]}>
                Cancel
              </Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <MaterialCommunityIcons name="delete-outline" size={14} color={brandColors.danger} />
              <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '600' }]}>
                Delete
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brandColors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
    marginBottom: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  cardMuted: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
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
  newOffersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.warningSoft,
    alignSelf: 'flex-start',
  },
  noBidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.neutralSoft,
    alignSelf: 'flex-start',
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
    backgroundColor: brandColors.surfaceAlt,
    alignSelf: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
    paddingTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  successBtn: {
    borderColor: brandColors.success,
    backgroundColor: brandColors.successSoft,
  },
  dangerBtn: {
    borderColor: brandColors.danger,
    backgroundColor: brandColors.dangerSoft,
  },
  defaultBtn: {
    borderColor: brandColors.outline,
    backgroundColor: brandColors.surfaceAlt,
  },
});
