import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { brandColors, radii, spacing, typography } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

// TASK_CANCELED is a synthetic badge (not a real enum) used when a fixer's bid
// outcome is "the requester canceled the task" — distinct from the fixer's own
// REJECTED/CANCELED so it's clear the fixer didn't back out.
type Status = TaskStatus | BidStatus | 'TASK_CANCELED';

const STATUS_CONFIG: Record<Status, { bg: string; text: string; dotColor: string; border: string }> = {
  OPEN:          { bg: brandColors.successSoft,  text: brandColors.success,      dotColor: brandColors.success,      border: brandColors.outlineLight },
  IN_PROGRESS:   { bg: brandColors.infoSoft,     text: brandColors.primaryMuted, dotColor: brandColors.primaryMuted, border: brandColors.outlineLight },
  COMPLETED:     { bg: brandColors.surfaceAlt,   text: brandColors.textMuted,    dotColor: brandColors.textMuted,    border: brandColors.outlineLight },
  CANCELED:      { bg: brandColors.dangerSoft,   text: brandColors.danger,       dotColor: brandColors.danger,       border: brandColors.outlineLight },
  TASK_CANCELED: { bg: brandColors.dangerSoft,   text: brandColors.danger,       dotColor: brandColors.danger,       border: brandColors.outlineLight },
  PENDING:       { bg: brandColors.warningSoft,  text: brandColors.warning,      dotColor: brandColors.warning,      border: brandColors.outlineLight },
  ACCEPTED:      { bg: brandColors.successSoft,  text: brandColors.success,      dotColor: brandColors.success,      border: brandColors.outlineLight },
  REJECTED:      { bg: brandColors.dangerSoft,   text: brandColors.danger,       dotColor: brandColors.danger,       border: brandColors.outlineLight },
  WITHDRAWN:     { bg: brandColors.neutralSoft,  text: brandColors.textMuted,    dotColor: brandColors.textMuted,    border: brandColors.outlineLight },
};

const STATUS_KEY: Record<Status, string> = {
  OPEN:          'status.open',
  IN_PROGRESS:   'status.inProgress',
  COMPLETED:     'status.completed',
  CANCELED:      'status.canceled',
  TASK_CANCELED: 'status.taskCanceled',
  PENDING:       'status.pending',
  ACCEPTED:      'status.accepted',
  REJECTED:      'status.rejected',
  WITHDRAWN:     'status.withdrawn',
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      <Text style={[typography.caption, styles.label, { color: config.text }]} numberOfLines={1}>
        {t(STATUS_KEY[status])}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '700',
  },
});
