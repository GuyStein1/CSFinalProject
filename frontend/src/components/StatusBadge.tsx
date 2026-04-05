import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
type Status = TaskStatus | BidStatus;

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  OPEN:        { label: 'Open',        bg: 'rgba(29,124,184,0.25)',  text: '#7EC8F0' },
  IN_PROGRESS: { label: 'In Progress', bg: 'rgba(241,181,69,0.22)',  text: '#F1B545' },
  COMPLETED:   { label: 'Completed',   bg: 'rgba(81,122,88,0.25)',   text: '#8FD19B' },
  CANCELED:    { label: 'Canceled',    bg: 'rgba(168,91,91,0.22)',   text: '#F0A0A0' },
  PENDING:     { label: 'Pending',     bg: 'rgba(241,181,69,0.22)',  text: '#F1B545' },
  ACCEPTED:    { label: 'Accepted',    bg: 'rgba(81,122,88,0.25)',   text: '#8FD19B' },
  REJECTED:    { label: 'Rejected',    bg: 'rgba(168,91,91,0.22)',   text: '#F0A0A0' },
  WITHDRAWN:   { label: 'Withdrawn',   bg: 'rgba(255,255,255,0.10)', text: 'rgba(255,252,246,0.50)' },
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.text + '44' }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
