import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { autoAllocate } from '@pxo/core';
import type { PacketForAllocation, PaymentAllocation as CoreAllocation } from '@pxo/core';
import { AmountInput } from '../components/AmountInput';
import { formatTaka } from '@pxo/core';
import { colours, spacing, typography, radius } from '../theme';

export type AllocationMode = 'auto' | 'manual' | 'hybrid';

export interface PacketAllocationRow {
  packet_id: string;
  label: string;      // e.g. "Packet 1 — 25 cards"
  grossAmount: number; // poisha — total due gross
  paidSoFar: number;
  discountSoFar: number;
  dispatchDate: string;
  seq: number;
  amount: number;     // poisha — user-entered or auto-computed
  discount: number;   // poisha
}

interface AllocationSheetProps {
  visible: boolean;
  packets: PacketAllocationRow[];
  totalPayment: number;
  totalDiscount: number;
  mode: AllocationMode;
  onModeChange: (m: AllocationMode) => void;
  onAllocationsChange: (rows: PacketAllocationRow[]) => void;
  onDone: () => void;
}

export function AllocationSheet({
  visible,
  packets,
  totalPayment,
  totalDiscount,
  mode,
  onModeChange,
  onAllocationsChange,
  onDone,
}: AllocationSheetProps) {
  if (!visible) return null;

  const runAuto = useCallback(() => {
    const forCore: PacketForAllocation[] = packets.map((p) => ({
      id: p.packet_id,
      amount: p.grossAmount,
      paidSoFar: p.paidSoFar,
      discountSoFar: p.discountSoFar,
      dispatchDate: p.dispatchDate,
      seq: p.seq,
    }));
    const results = autoAllocate(forCore, totalPayment, totalDiscount);
    const updated = packets.map((p) => {
      const r = results.find((x) => x.packet_id === p.packet_id);
      return { ...p, amount: r?.amount ?? 0, discount: r?.discount ?? 0 };
    });
    onAllocationsChange(updated);
  }, [packets, totalPayment, totalDiscount, onAllocationsChange]);

  // Auto-compute whenever mode is auto or totalPayment/totalDiscount changes
  useEffect(() => {
    if (mode === 'auto' || mode === 'hybrid') runAuto();
  }, [mode, totalPayment, totalDiscount]);

  const updateRow = (idx: number, patch: Partial<PacketAllocationRow>) => {
    onAllocationsChange(packets.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const modes: AllocationMode[] = ['auto', 'manual', 'hybrid'];

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Allocation</Text>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => onModeChange(m)}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {packets.map((p, idx) => (
            <View key={p.packet_id} style={styles.packetRow}>
              <Text style={styles.packetLabel}>{p.label}</Text>
              <Text style={styles.packetDue}>
                Due: ৳{formatTaka(Math.max(0, p.grossAmount - p.paidSoFar - p.discountSoFar))}
              </Text>

              {(mode === 'manual' || mode === 'hybrid') ? (
                <View style={styles.inputRow}>
                  <View style={styles.flex1}>
                    <AmountInput
                      label="Payment"
                      value={p.amount}
                      onChange={(v) => updateRow(idx, { amount: v })}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <AmountInput
                      label="Discount"
                      value={p.discount}
                      onChange={(v) => updateRow(idx, { discount: v })}
                    />
                  </View>
                </View>
              ) : (
                <Text style={styles.autoValue}>
                  Payment: ৳{formatTaka(p.amount)}  Discount: ৳{formatTaka(p.discount)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>

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
    maxHeight: '80%',
  },
  title: { ...typography.h3, color: colours.textPrimary },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: {
    flex: 1, padding: spacing.sm, borderRadius: radius.md,
    backgroundColor: colours.surfaceVariant, alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: colours.primary },
  modeBtnText: { ...typography.captionBold, color: colours.textSecondary },
  modeBtnTextActive: { color: colours.textOnPrimary },
  scroll: { flexGrow: 0 },
  packetRow: {
    borderBottomWidth: 1, borderBottomColor: colours.divider,
    paddingVertical: spacing.sm, gap: spacing.xs,
  },
  packetLabel: { ...typography.bodyBold, color: colours.textPrimary },
  packetDue: { ...typography.caption, color: colours.warning },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  autoValue: { ...typography.caption, color: colours.textSecondary },
  doneBtn: {
    backgroundColor: colours.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  doneText: { ...typography.button, color: colours.textOnPrimary },
});
