import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { sellerDue, formatTaka } from '@pxo/core';
import { useDb } from '../../src/hooks/useDb';
import { listSellers, insertSeller, updateSeller, archiveSeller, deleteSeller } from '../../src/db/repos/sellers';
import { listDispatchesBySeller, listPacketsByDispatches } from '../../src/db/repos/dispatches';
import { listAllocationsForPackets } from '../../src/db/repos/payments';
import type { Seller } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';

export default function SellersScreen() {
  const db = useDb();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerDues, setSellerDues] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!db) return;
    const list = await listSellers(db);
    setSellers(list);

    const dues: Record<string, number> = {};
    for (const s of list) {
      const dispatches = await listDispatchesBySeller(db, s.id, 'all');
      const packets = await listPacketsByDispatches(db, dispatches.map((d) => d.id));
      const allAllocs = await listAllocationsForPackets(db, packets.map((p) => p.id));
      const allocsWithMeta = await Promise.all(
        allAllocs.map(async (a) => {
          const row = await db.getFirstAsync<{ archived_at: string | null }>(
            `SELECT archived_at FROM payments WHERE id=?;`, [a.payment_id],
          );
          return { ...a, payment_archived_at: row?.archived_at ?? null };
        }),
      );
      dues[s.id] = sellerDue(
        packets.map((p) => ({ id: p.id, dispatch_id: p.dispatch_id, cards: p.cards, rate_override: p.rate_override })),
        dispatches.map((d) => ({ id: d.id, sell_rate: d.sell_rate, archived_at: d.archived_at })),
        allocsWithMeta,
      );
    }
    setSellerDues(dues);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setName(''); setNote(''); setEditingSeller(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!db) return;
    if (!name.trim()) { Alert.alert('Validation', 'Enter a seller name.'); return; }
    if (editingSeller) {
      await updateSeller(db, editingSeller.id, { name: name.trim(), note: note.trim() || undefined });
    } else {
      await insertSeller(db, { name: name.trim(), note: note.trim() || undefined });
    }
    resetForm();
    load();
  };

  const handleArchive = async (id: string) => {
    if (!db) return;
    Alert.alert('Archive Seller', 'Archive this seller?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', onPress: async () => { await archiveSeller(db, id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
          <Text style={styles.addBtnText}>+ Add Seller</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editingSeller ? 'Edit Seller' : 'New Seller'}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seller name"
              placeholderTextColor={colours.textMuted}
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor={colours.textMuted}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>{editingSeller ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {sellers.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.sellerCard}
            onPress={() => router.push(`/sellers/${s.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{s.name}</Text>
              {s.note ? <Text style={styles.sellerNote}>{s.note}</Text> : null}
            </View>
            <View style={styles.sellerRight}>
              <Text style={styles.dueLabel}>Due</Text>
              <Text style={[styles.dueAmount, (sellerDues[s.id] ?? 0) > 0 && styles.dueAmountPositive]}>
                ৳{formatTaka(sellerDues[s.id] ?? 0)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => { setEditingSeller(s); setName(s.name); setNote(s.note ?? ''); setShowForm(true); }}
            >
              <Text>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.archiveBtn} onPress={() => handleArchive(s.id)}>
              <Text>🗄</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {sellers.length === 0 && (
          <Text style={styles.empty}>No sellers yet. Add one above.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  addBtn: {
    borderWidth: 1, borderColor: colours.primary, borderStyle: 'dashed',
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
  },
  addBtnText: { ...typography.bodyBold, color: colours.primary },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, elevation: 1 },
  cardTitle: { ...typography.h3, color: colours.textPrimary },
  input: {
    borderWidth: 1, borderColor: colours.border, borderRadius: radius.md,
    padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44,
  },
  formActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md },
  cancelText: { ...typography.bodyBold, color: colours.textSecondary },
  submitBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.lg },
  submitText: { ...typography.button, color: colours.textOnPrimary },
  sellerCard: {
    backgroundColor: colours.surface, borderRadius: radius.md,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', elevation: 1,
  },
  sellerInfo: { flex: 1 },
  sellerName: { ...typography.bodyBold, color: colours.textPrimary },
  sellerNote: { ...typography.caption, color: colours.textMuted },
  sellerRight: { alignItems: 'flex-end', marginRight: spacing.sm },
  dueLabel: { ...typography.caption, color: colours.textMuted },
  dueAmount: { ...typography.bodyBold, color: colours.success },
  dueAmountPositive: { color: colours.warning },
  editBtn: { padding: spacing.sm },
  archiveBtn: { padding: spacing.sm },
  empty: { ...typography.body, color: colours.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
