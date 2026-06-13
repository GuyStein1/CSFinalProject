import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import StatusBadge from './StatusBadge';
import { getCategoryMetadata, type Category } from '../constants/categories';
import { getCategoryLabel } from '../utils/categoryMetadata';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

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
  onReview?: () => void;
  onChat?: () => void;
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
  onReview,
  onChat,
  muted = false,
}: TaskCardProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const meta = getCategoryMetadata(category);
  const budgetLabel = suggestedPrice != null ? `₪${suggestedPrice}` : t('taskCard.openToQuotes');
  const hasOffers = bidCount != null && bidCount > 0 && status === 'OPEN';
  const waitingForOffers = bidCount != null && bidCount === 0 && status === 'OPEN';
  const assigned = fixerName && status === 'IN_PROGRESS';
  const hasActions = Boolean(
    onPress || onDelete || onReactivate || onCancel || onMarkCompleted || onEdit || onReview || onChat
  );
  const detailsActionLabel = hasOffers ? t('taskCard.reviewBids') : t('taskCard.viewDetails');
  const detailsActionIcon = hasOffers ? 'hand-extended-outline' : 'text-box-search-outline';
  const detailsActionTone: 'warning' | 'default' = hasOffers ? 'warning' : 'default';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Open task ${title}` : undefined}
      style={({ pressed }) => [
        styles.card,
        muted && styles.cardMuted,
        shadows.sm,
        {
          opacity: pressed ? 0.94 : muted ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          backgroundColor: pressed ? brandColors.surfaceAlt : brandColors.surface,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon as never} size={22} color={meta.color} />
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.categoryRow}>
            <Text style={[typography.caption, styles.categoryLabel, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {getCategoryLabel(category, t)}
            </Text>
          </View>
          <Text style={[typography.h3, styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <StatusBadge status={status} />
      </View>

      <View style={styles.infoGrid}>
        <InfoChip icon="cash" label={budgetLabel} emphasized />
        <InfoChip
          icon="map-marker-outline"
          label={locationName || t('taskCard.locationNotSet')}
        />
      </View>

      {hasOffers && (
        <TaskSignal
          icon="hand-extended-outline"
          label={t('taskCard.newOffers', { count: bidCount })}
          tone="warning"
        />
      )}
      {waitingForOffers && (
        <TaskSignal
          icon="clock-outline"
          label={t('taskCard.awaitingFirstBid')}
          tone="neutral"
        />
      )}
      {assigned && (
        <TaskSignal
          icon="account-check-outline"
          label={t('taskCard.assignedTo', { name: fixerName })}
          tone="success"
        />
      )}
      {onReview && (
        <TaskSignal
          icon="star-outline"
          label={t('taskCard.reviewCompleted')}
          tone="warning"
        />
      )}

      {hasActions && (
        <View style={styles.actionRow}>
          {onPress && (
            <ActionButton
              icon={detailsActionIcon}
              label={detailsActionLabel}
              tone={detailsActionTone}
              onPress={onPress}
            />
          )}
          {onReview && (
            <ActionButton
              icon="star-outline"
              label={t('taskCard.leaveReview')}
              tone="warning"
              onPress={onReview}
            />
          )}
          {onReactivate && status === 'CANCELED' && (
            <ActionButton
              icon="refresh"
              label={t('taskCard.reopen')}
              tone="success"
              onPress={onReactivate}
            />
          )}
          {onEdit && (
            <ActionButton
              icon="pencil-outline"
              label={t('common.edit')}
              tone="default"
              onPress={onEdit}
            />
          )}
          {onChat && (
            <ActionButton
              icon="chat-outline"
              label={t('taskCard.chat')}
              tone="default"
              onPress={onChat}
            />
          )}
          {onMarkCompleted && (
            <ActionButton
              icon="check-circle-outline"
              label={t('taskCard.markComplete')}
              tone="success"
              onPress={onMarkCompleted}
            />
          )}
          {onCancel && (
            <ActionButton
              icon="close-circle-outline"
              label={t('common.cancel')}
              tone="danger"
              onPress={onCancel}
            />
          )}
          {onDelete && (
            <ActionButton
              icon="delete-outline"
              label={t('common.delete')}
              tone="danger"
              onPress={onDelete}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

function InfoChip({
  icon,
  label,
  emphasized = false,
}: {
  icon: string;
  label: string;
  emphasized?: boolean;
}) {
  return (
    <View style={[styles.infoChip, emphasized && styles.infoChipEmphasized]}>
      <MaterialCommunityIcons
        name={icon as never}
        size={14}
        color={emphasized ? brandColors.primary : brandColors.textMuted}
      />
      <Text
        style={[
          typography.caption,
          emphasized ? styles.infoTextEmphasized : styles.infoText,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function TaskSignal({
  icon,
  label,
  tone,
}: {
  icon: string;
  label: string;
  tone: 'warning' | 'success' | 'neutral';
}) {
  const { isRTL } = useLanguage();
  const color =
    tone === 'success'
      ? brandColors.success
      : tone === 'warning'
        ? brandColors.warning
        : brandColors.textMuted;
  const background =
    tone === 'success'
      ? brandColors.successSoft
      : tone === 'warning'
        ? brandColors.warningSoft
        : brandColors.neutralSoft;

  return (
    <View style={[styles.signal, { backgroundColor: background }]}>
      <MaterialCommunityIcons name={icon as never} size={14} color={color} />
      <Text style={[typography.caption, styles.signalText, { color, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: string;
  label: string;
  tone: 'default' | 'success' | 'warning' | 'danger';
  onPress: () => void;
}) {
  const color =
    tone === 'success'
      ? brandColors.success
      : tone === 'warning'
        ? brandColors.warning
        : tone === 'danger'
          ? brandColors.danger
          : brandColors.primaryMuted;
  const background =
    tone === 'success'
      ? brandColors.successSoft
      : tone === 'warning'
        ? brandColors.warningSoft
        : tone === 'danger'
          ? brandColors.dangerSoft
          : brandColors.surfaceAlt;
  const border =
    tone === 'default'
      ? brandColors.outlineLight
      : color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: background, borderColor: border, opacity: pressed ? 0.72 : 1 },
      ]}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <MaterialCommunityIcons name={icon as never} size={14} color={color} />
      <Text style={[typography.caption, styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: radii.lg,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 6,
    marginBottom: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  cardMuted: {
    borderColor: brandColors.outlineLight,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    color: brandColors.primaryMuted,
    fontWeight: '700',
  },
  title: {
    color: brandColors.textPrimary,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoChip: {
    minHeight: 32,
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.neutralSoft,
  },
  infoChipEmphasized: {
    backgroundColor: brandColors.infoSoft,
  },
  infoText: {
    color: brandColors.textMuted,
    flexShrink: 1,
  },
  infoTextEmphasized: {
    color: brandColors.primary,
    fontWeight: '800',
    flexShrink: 1,
  },
  signal: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  signalText: {
    flexShrink: 1,
    fontWeight: '700',
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
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '700',
  },
});
