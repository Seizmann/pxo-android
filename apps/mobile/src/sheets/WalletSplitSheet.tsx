import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AmountInput } from '../components/AmountInput';
import { colours, spacing, typography, radius } from '../theme';
import { formatTaka } from '@pxo/core';

export interface WalletSplit {
  cash: number;
  bkash: number;
  nagad: number;
}

interface WalletSplitSheetProps {
  visible: boolean;
  value: WalletSplit;
  onChange: (split: WalletSplit) => void;
  onDone: () => void;
  totalLabel?: string;
}

export function WalletSplitSheet({
  visible,
  value,
  onChange,
  onDone,
  totalLabel = 'Total',
}: WalletSplitSheetProps) {
  if (!visible) return null;

  const total = value.cash + value.bkash + value.nagad;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Wallet Split</Text>

        <AmountInput
          label="Cash (৳)"
          value={value.cash}
          onChange={(v) => onChange({ ...value, cash: v })}
        />
        <AmountInput
          label="bKash (৳)"
          value={value.bkash}
          onChange={(v) => onChange({ ...value, bkash: v })}
        />
        <AmountInput
          label="Nagad (৳)"
          value={value.nagad}
          onChange={(v) => onChange({ ...value, nagad: v })}
        />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>৳{formatTaka(total)}</Text>
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: colours.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.h3, color: colours.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...typography.bodyBold, color: colours.textSecondary },
  totalValue: { ...typography.amount, color: colours.primary },
  doneBtn: {
    backgroundColor: colours.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  doneText: { ...typography.button, color: colours.textOnPrimary },
});
