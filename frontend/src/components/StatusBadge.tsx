import React from 'react';
import { Chip } from 'react-native-paper';
import { StyleSheet } from 'react-native';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

type Status = TaskStatus | BidStatus;

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'Open', bg: '#E3F2FD', text: '#1565C0' },
  IN_PROGRESS: { label: 'In Progress', bg: '#FFF3E0', text: '#E65100' },
  COMPLETED: { label: 'Completed', bg: '#E8F5E9', text: '#2E7D32' },
  CANCELED: { label: 'Canceled', bg: '#FCE4EC', text: '#C62828' },
  PENDING: { label: 'Pending', bg: '#FFF8E1', text: '#F9A825' },
  ACCEPTED: { label: 'Accepted', bg: '#E8F5E9', text: '#2E7D32' },
  REJECTED: { label: 'Rejected', bg: '#FCE4EC', text: '#C62828' },
  WITHDRAWN: { label: 'Withdrawn', bg: '#F5F5F5', text: '#757575' },
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
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
