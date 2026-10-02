import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, spacing, typography, radius } from '../theme';

type Status = 'paid' | 'partial' | 'due' | 'archived';

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  paid:     { label: 'Paid',     bg: colours.success,  text: '#fff' },
  partial:  { label: 'Partial',  bg: colours.warning,  text: '#fff' },
  due:      { label: 'Due',      bg: colours.error,    text: '#fff' },
  archived: { label: 'Archived', bg: colours.archived, text: '#fff' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export function packetStatus(due: number, archived: boolean): Status {
  if (archived) return 'archived';
  if (due <= 0) return 'paid';
  return 'partial'; // any payment received but still owing — the list shows actual due amount
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { ...typography.captionBold },
});
