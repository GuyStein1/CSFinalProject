import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import type { DiscoveryTask } from '../hooks/useTasks';
import { getCategoryMetadata } from '../constants/categories';
import { getCategoryLabel } from '../utils/categoryMetadata';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

function formatTimeAgo(dateString: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('timeAgo.justNow');
  if (minutes === 1) return t('timeAgo.minuteAgo');
  if (minutes < 60) return t('timeAgo.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return t('timeAgo.hourAgo');
  if (hours < 24) return t('timeAgo.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('timeAgo.yesterday');
  if (days < 7) return t('timeAgo.daysAgo', { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return t('timeAgo.weekAgo');
  return t('timeAgo.weeksAgo', { count: weeks });
}

interface DiscoveryListCardProps {
  task: DiscoveryTask;
  hasBid?: boolean;
  onPress: () => void;
}

export default function DiscoveryListCard({ task, hasBid = false, onPress }: DiscoveryListCardProps) {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const locationName = (language === 'en' && task.generalLocationNameEn) ? task.generalLocationNameEn : task.generalLocationName;
  const budgetLabel = task.suggestedPrice != null ? `₪${task.suggestedPrice}` : t('discoveryCard.noPrice');
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
          <Text style={[typography.h3, styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={styles.categoryLine}>
            <Text style={[typography.caption, { color: catMeta.color }]}>{getCategoryLabel(task.category, t)}</Text>
            <View style={styles.metaDot} />
            <Text style={[typography.caption, styles.metaText]}>{formatTimeAgo(task.createdAt, t)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {hasBid && (
              <View style={styles.bidStatusPill}>
                <MaterialCommunityIcons name="check-circle-outline" size={12} color={brandColors.success} />
                <Text style={[typography.caption, styles.bidStatusText]}>{t('discoveryCard.bidSent')}</Text>
              </View>
            )}
            {task.urgency === 'TODAY' && (
              <View style={styles.urgencyPill}>
                <MaterialCommunityIcons name="clock-alert-outline" size={12} color={brandColors.danger} />
                <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '700' }]}>{t('taskDetails.detail.urgencyToday')}</Text>
              </View>
            )}
            {task.urgency === 'THIS_WEEK' && (
              <View style={styles.urgencyPillWeek}>
                <MaterialCommunityIcons name="calendar-week" size={12} color={brandColors.warning} />
                <Text style={[typography.caption, { color: brandColors.warning, fontWeight: '700' }]}>{t('taskDetails.detail.urgencyThisWeek')}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.priceTag}>
          <Text style={[typography.h3, styles.price]}>{budgetLabel}</Text>
        </View>
      </View>

      {!!task.description && (
        <Text style={[typography.bodySm, styles.description, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText, { writingDirection: 'ltr' }]}>
            {locationName} / {task.distanceKm.toFixed(1)} {t('discoveryCard.km')}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="hand-extended-outline" size={13} color={brandColors.textMuted} />
          <Text style={[typography.caption, styles.metaText]}>
            {t('discoveryCard.bids', { count: task.bidCount })}
          </Text>
        </View>
        <View style={[styles.detailsCue, hasBid && styles.bidDetailsCue]}>
          <Text style={[typography.caption, hasBid ? styles.bidDetailsText : styles.detailsText]}>
            {hasBid ? t('discoveryCard.viewBid') : t('discoveryCard.details')}
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
  urgencyPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(168,91,91,0.22)',
  },
  urgencyPillWeek: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(155,109,42,0.22)',
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
