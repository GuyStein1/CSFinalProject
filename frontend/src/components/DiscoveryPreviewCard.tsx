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
  hasBid?: boolean;
  onViewDetails: () => void;
}

export default function DiscoveryPreviewCard({
  task,
  hasBid = false,
  onViewDetails,
}: DiscoveryPreviewCardProps) {
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : 'No price specified';
  const catMeta = getCategoryMetadata(task.category);

  return (
    <View style={[styles.card, shadows.lg]}>
      <View style={styles.headerRow}>
        <View style={styles.categoryLockup}>
          <View style={[styles.iconCircle, { backgroundColor: catMeta.bg }]}>
            <MaterialCommunityIcons name={catMeta.icon} size={18} color={catMeta.color} />
          </View>
          <View>
            <Text style={[typography.caption, { color: brandColors.textMuted }]}>Selected job</Text>
            <Text style={[typography.label, { color: catMeta.color }]}>{catMeta.label}</Text>
          </View>
        </View>
        <View style={styles.priceTag}>
          <Text style={[typography.h3, styles.priceText]}>{budgetLabel}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {hasBid && (
          <View style={styles.bidNotice}>
            <MaterialCommunityIcons name="check-circle-outline" size={15} color={brandColors.success} />
            <Text style={[typography.caption, styles.bidNoticeText]}>Bid already sent</Text>
          </View>
        )}
        {task.urgency === 'TODAY' && (
          <View style={[styles.bidNotice, { backgroundColor: brandColors.dangerSoft, borderColor: 'rgba(168,91,91,0.22)' }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={15} color={brandColors.danger} />
            <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '700' }]}>Today</Text>
          </View>
        )}
        {task.urgency === 'THIS_WEEK' && (
          <View style={[styles.bidNotice, { backgroundColor: brandColors.warningSoft, borderColor: 'rgba(155,109,42,0.22)' }]}>
            <MaterialCommunityIcons name="calendar-week" size={15} color={brandColors.warning} />
            <Text style={[typography.caption, { color: brandColors.warning, fontWeight: '700' }]}>This week</Text>
          </View>
        )}
      </View>

      <Text style={[typography.h2, styles.title]} numberOfLines={2}>
        {task.title}
      </Text>

      {!!task.description && (
        <Text style={[typography.bodySm, styles.description]} numberOfLines={2}>
          {task.description}
        </Text>
      )}

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

      <FButton
        onPress={onViewDetails}
        fullWidth
        icon={hasBid ? 'check-circle-outline' : 'arrow-right'}
        size="md"
        variant={hasBid ? 'secondary' : 'primary'}
      >
        {hasBid ? 'View Your Bid' : 'View Details'}
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
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  categoryLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.warningSoft,
  },
  priceText: {
    color: brandColors.secondaryDark,
  },
  bidNotice: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(81,122,88,0.22)',
  },
  bidNoticeText: {
    color: brandColors.success,
    fontWeight: '700',
  },
  title: {
    color: brandColors.textPrimary,
  },
  description: {
    color: brandColors.textSecondary,
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
});
