import React from 'react';
import { Chip } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { brandColors } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

type Status = TaskStatus | BidStatus;

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'Open', bg: brandColors.infoSoft, text: brandColors.primary },
  IN_PROGRESS: { label: 'In Progress', bg: brandColors.warningSoft, text: brandColors.warning },
  COMPLETED: { label: 'Completed', bg: brandColors.successSoft, text: brandColors.success },
  CANCELED: { label: 'Canceled', bg: brandColors.dangerSoft, text: brandColors.danger },
  PENDING: { label: 'Pending', bg: brandColors.warningSoft, text: brandColors.warning },
  ACCEPTED: { label: 'Accepted', bg: brandColors.successSoft, text: brandColors.success },
  REJECTED: { label: 'Rejected', bg: brandColors.dangerSoft, text: brandColors.danger },
  WITHDRAWN: { label: 'Withdrawn', bg: brandColors.neutralSoft, text: brandColors.textMuted },
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Chip
      mode="flat"
      compact
      style={[styles.chip, { backgroundColor: config.bg }]}
      textStyle={[styles.text, { color: config.text }]}
    >
      {config.label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
