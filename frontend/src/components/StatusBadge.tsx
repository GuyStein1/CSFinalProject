import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { brandColors, radii, spacing, typography } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

type Status = TaskStatus | BidStatus;

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; dotColor: string }> = {
  OPEN:        { label: 'Open',        bg: brandColors.successSoft,  text: brandColors.success,     dotColor: brandColors.success },
  IN_PROGRESS: { label: 'In Progress', bg: brandColors.infoSoft,     text: brandColors.primaryMuted, dotColor: brandColors.primaryMuted },
  COMPLETED:   { label: 'Completed',   bg: brandColors.surfaceAlt,   text: brandColors.textMuted,   dotColor: brandColors.textMuted },
  CANCELED:    { label: 'Canceled',    bg: brandColors.dangerSoft,   text: brandColors.danger,      dotColor: brandColors.danger },
  PENDING:     { label: 'Pending',     bg: brandColors.warningSoft,  text: brandColors.warning,     dotColor: brandColors.warning },
  ACCEPTED:    { label: 'Accepted',    bg: brandColors.successSoft,  text: brandColors.success,     dotColor: brandColors.success },
  REJECTED:    { label: 'Rejected',    bg: brandColors.dangerSoft,   text: brandColors.danger,      dotColor: brandColors.danger },
  WITHDRAWN:   { label: 'Withdrawn',   bg: brandColors.neutralSoft,  text: brandColors.textMuted,   dotColor: brandColors.textMuted },
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      <Text style={[typography.caption, { color: config.text }]}>{config.label}</Text>
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
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
