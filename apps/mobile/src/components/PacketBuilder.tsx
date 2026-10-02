import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colours, spacing, typography, radius } from '../theme';

export interface PacketData {
  seq: number;
  cards: number;
  rate_override?: number;
  showRateOverride: boolean;
}

interface PacketBuilderProps {
  packets: PacketData[];
  defaultRate: number; // poisha — shown as placeholder
  onChange: (packets: PacketData[]) => void;
}

export function PacketBuilder({ packets, defaultRate, onChange }: PacketBuilderProps) {
  const update = (idx: number, patch: Partial<PacketData>) => {
    const next = packets.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  };

  const add = () => {
    onChange([...packets, { seq: packets.length + 1, cards: 0, showRateOverride: false }]);
  };

  const remove = (idx: number) => {
    const next = packets.filter((_, i) => i !== idx).map((p, i) => ({ ...p, seq: i + 1 }));
    onChange(next);
  };

  const takaDefault = (defaultRate / 100).toFixed(2);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Packets</Text>
      {packets.map((p, idx) => (
        <View key={idx} style={styles.packet}>
          <View style={styles.packetHeader}>
            <Text style={styles.packetTitle}>Packet {p.seq}</Text>
            {packets.length > 1 && (
              <TouchableOpacity onPress={() => remove(idx)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cards count */}
          <View style={styles.field}>
            <Text style={styles.label}>Cards</Text>
            <TextInput
              style={styles.input}
              value={p.cards === 0 ? '' : String(p.cards)}
              onChangeText={(t) => update(idx, { cards: parseInt(t, 10) || 0 })}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={colours.textMuted}
            />
          </View>

          {/* Custom rate toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Custom rate</Text>
            <Switch
              value={p.showRateOverride}
              onValueChange={(v) =>
                update(idx, { showRateOverride: v, rate_override: v ? defaultRate : undefined })
              }
              trackColor={{ true: colours.primary }}
            />
          </View>

          {/* Rate override — hidden until toggle */}
          {p.showRateOverride && (
            <View style={styles.field}>
              <Text style={styles.label}>Rate (৳)</Text>
              <TextInput
                style={styles.input}
                value={p.rate_override ? (p.rate_override / 100).toFixed(2) : ''}
                onChangeText={(t) =>
                  update(idx, { rate_override: Math.round((parseFloat(t) || 0) * 100) })
                }
                keyboardType="decimal-pad"
                placeholder={takaDefault}
                placeholderTextColor={colours.textMuted}
              />
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={add}>
        <Text style={styles.addText}>+ Add Packet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  sectionLabel: { ...typography.h3, color: colours.textPrimary },
  packet: {
    backgroundColor: colours.surfaceVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  packetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packetTitle: { ...typography.bodyBold, color: colours.textPrimary },
  removeBtn: { fontSize: 16, color: colours.error, padding: spacing.xs },
  field: { gap: 4 },
  label: { ...typography.label, color: colours.textMuted },
  input: {
    backgroundColor: colours.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colours.border,
    padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: {
    borderWidth: 1, borderColor: colours.primary, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', borderStyle: 'dashed',
  },
  addText: { ...typography.bodyBold, color: colours.primary },
});
