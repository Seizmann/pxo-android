import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, spacing, typography, radius } from '../theme';

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export function SummaryCard({ label, value, sub, accent }: SummaryCardProps) {
  return (
    <View style={[styles.card, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : undefined]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  label: { ...typography.label, color: colours.textMuted, marginBottom: 2 },
  value: { ...typography.amount, color: colours.textPrimary },
  sub: { ...typography.caption, color: colours.textSecondary, marginTop: 2 },
});
