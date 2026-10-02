import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTaka } from '@pxo/core';
import { useDb } from '../../src/hooks/useDb';
import { DatePicker } from '../../src/components/DatePicker';
import { EntryList } from '../../src/components/EntryList';
import { PacketBuilder, type PacketData } from '../../src/components/PacketBuilder';
import { SellerPicker } from '../../src/components/SellerPicker';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import {
  listDispatches,
  insertDispatch,
  updateDispatch,
  archiveDispatch,
  deleteDispatch,
  restoreDispatch,
  listPacketsByDispatch,
} from '../../src/db/repos/dispatches';
import { getSellRate } from '../../src/db/repos/settings';
import type { Dispatch } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { todayIsoDate } from '../../src/utils/dateFormat';

type Filter = 'active' | 'archived' | 'all';

export default function GiveCardsScreen() {
  const db = useDb();

  // Form state
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [sellRate, setSellRate] = useState(0);
  const [packets, setPackets] = useState<PacketData[]>([{ seq: 1, cards: 0, showRateOverride: false }]);
  const [bonusCards, setBonusCards] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // List
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadDefaults = useCallback(async () => {
    if (!db) return;
    setSellRate(await getSellRate(db));
  }, [db]);

  const loadList = useCallback(async () => {
    if (!db) return;
    setDispatches(await listDispatches(db, filter));
  }, [db, filter]);

  useEffect(() => { loadDefaults(); }, [loadDefaults]);
  useEffect(() => { loadList(); }, [loadList]);

  const resetForm = () => {
    setEntryDate(todayIsoDate());
    setSellerId(null);
    setPackets([{ seq: 1, cards: 0, showRateOverride: false }]);
    setBonusCards('');
    setNote('');
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!db) return;
    if (!sellerId) { Alert.alert('Validation', 'Select a seller.'); return; }
    if (packets.some((p) => p.cards <= 0)) { Alert.alert('Validation', 'All packets need a card count.'); return; }

    const packetInputs = packets.map((p) => ({
      seq: p.seq, cards: p.cards, rate_override: p.rate_override,
    }));
    const data = {
      seller_id: sellerId,
      entry_date: entryDate,
      sell_rate: sellRate,
      bonus_cards: parseInt(bonusCards, 10) || 0,
      note: note || undefined,
    };

    if (editingId) {
      await updateDispatch(db, editingId, data, packetInputs);
    } else {
      await insertDispatch(db, data, packetInputs);
    }
    resetForm();
    loadList();
  };

  const handleEdit = async (id: string) => {
    if (!db) return;
    const d = dispatches.find((x) => x.id === id);
    if (!d) return;
    setEditingId(id);
    setEntryDate(d.entry_date);
    setSellerId(d.seller_id);
    setSellRate(d.sell_rate);
    setBonusCards(d.bonus_cards > 0 ? String(d.bonus_cards) : '');
    setNote(d.note ?? '');
    const pkts = await listPacketsByDispatch(db, id);
    setPackets(pkts.map((p) => ({
      seq: p.seq, cards: p.cards,
      rate_override: p.rate_override ?? undefined,
      showRateOverride: p.rate_override !== null,
    })));
  };

  const handlePermanentDelete = async () => {
    if (!db || !deleteTarget) return;
    await deleteDispatch(db, deleteTarget);
    setDeleteTarget(null);
    loadList();
  };

  const handleArchive = async () => {
    if (!db || !deleteTarget) return;
    await archiveDispatch(db, deleteTarget);
    setDeleteTarget(null);
    loadList();
  };

  const totalSellCards = packets.reduce((s, p) => s + p.cards, 0);
  const bonus = parseInt(bonusCards, 10) || 0;
  const totalCards = totalSellCards + bonus;

  const listItems = dispatches.map((d) => ({
    id: d.id,
    title: `${d.sell_cards} sell + ${d.bonus_cards} bonus cards`,
    subtitle: d.note ?? undefined,
    amount: `৳${formatTaka(d.sell_cards * d.sell_rate)}`,
    timestamp: d.created_at,
    archived: d.archived_at !== null,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editingId ? 'Edit Dispatch' : 'Give Cards'}</Text>

            <DatePicker value={entryDate} onChange={setEntryDate} />

            {db && (
              <SellerPicker
                db={db}
                value={sellerId}
                onChange={(id) => setSellerId(id)}
              />
            )}

            <View>
              <Text style={styles.label}>Sell Rate (৳/card)</Text>
              <TextInput
                style={styles.input}
                value={sellRate === 0 ? '' : (sellRate / 100).toFixed(2)}
                onChangeText={(t) => setSellRate(Math.round((parseFloat(t) || 0) * 100))}
                keyboardType="decimal-pad"
                placeholder="300.00"
                placeholderTextColor={colours.textMuted}
              />
            </View>

            <PacketBuilder
              packets={packets}
              defaultRate={sellRate}
              onChange={setPackets}
            />

            <View>
              <Text style={styles.label}>Bonus Cards (for seller)</Text>
              <TextInput
                style={styles.input}
                value={bonusCards}
                onChangeText={setBonusCards}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colours.textMuted}
              />
            </View>

            {totalCards > 0 && (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  Sell: {totalSellCards} · Bonus: {bonus} · Total out: {totalCards} cards
                </Text>
              </View>
            )}

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Note…"
              placeholderTextColor={colours.textMuted}
            />

            <View style={styles.formActions}>
              {editingId && (
                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>{editingId ? 'Save' : 'Give Cards'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter */}
          <View style={styles.filterRow}>
            {(['active', 'archived', 'all'] as Filter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <EntryList
            items={listItems}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteTarget(id)}
            onRestore={async (id) => { if (db) { await restoreDispatch(db, id); loadList(); } }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <DeleteConfirmSheet
        visible={deleteTarget !== null}
        onPermanent={handlePermanentDelete}
        onArchive={handleArchive}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, elevation: 1 },
  cardTitle: { ...typography.h3, color: colours.textPrimary },
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border,
    borderRadius: radius.md, padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44,
  },
  summary: { backgroundColor: colours.surfaceVariant, borderRadius: radius.sm, padding: spacing.sm },
  summaryText: { ...typography.bodyBold, color: colours.primary },
  formActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md },
  cancelText: { ...typography.bodyBold, color: colours.textSecondary },
  submitBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: 'center' },
  submitText: { ...typography.button, color: colours.textOnPrimary },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterTab: { flex: 1, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colours.surface, alignItems: 'center' },
  filterTabActive: { backgroundColor: colours.primary },
  filterTabText: { ...typography.captionBold, color: colours.textSecondary },
  filterTabTextActive: { color: colours.textOnPrimary },
});
