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
import { formatTaka, bonusValue } from '@pxo/core';
import { useDb } from '../../src/hooks/useDb';
import { DatePicker } from '../../src/components/DatePicker';
import { EntryList, type EntryItem } from '../../src/components/EntryList';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import { listDispatches, listDispatchesBySeller } from '../../src/db/repos/dispatches';
import {
  listManagerBonus, insertManagerBonus, updateManagerBonus,
  archiveManagerBonus, deleteManagerBonus, restoreManagerBonus,
} from '../../src/db/repos/manager-bonus';
import { listSellers } from '../../src/db/repos/sellers';
import { getSellRate } from '../../src/db/repos/settings';
import type { ManagerBonus, Dispatch, Seller } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { todayIsoDate, formatEntryDate } from '../../src/utils/dateFormat';

export default function BonusScreen() {
  const db = useDb();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerDispatches, setSellerDispatches] = useState<(Dispatch & { sellerName: string })[]>([]);
  const [managerBonusList, setManagerBonusList] = useState<ManagerBonus[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'manager' | null>(null);

  // Manager bonus form
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [cards, setCards] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sellRate, setSellRate] = useState(30000);

  // Filters
  const [filterSellerId, setFilterSellerId] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const load = useCallback(async () => {
    if (!db) return;
    const [sList, mbList, rate] = await Promise.all([
      listSellers(db),
      listManagerBonus(db, 'all'),
      getSellRate(db),
    ]);
    setSellers(sList);
    setManagerBonusList(mbList);
    setSellRate(rate);

    // Seller dispatches with bonus cards
    const allDispatches = await listDispatches(db, 'all');
    const withNames = allDispatches.map((d) => ({
      ...d,
      sellerName: sList.find((s) => s.id === d.seller_id)?.name ?? '?',
    }));
    setSellerDispatches(withNames);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setEntryDate(todayIsoDate()); setCards(''); setNote(''); setEditingId(null); };

  const handleSubmit = async () => {
    if (!db) return;
    const c = parseInt(cards, 10);
    if (!c || c <= 0) { Alert.alert('Validation', 'Enter a card count.'); return; }
    const data = { entry_date: entryDate, cards: c, rate_at_entry: sellRate, note: note.trim() || undefined };
    if (editingId) {
      await updateManagerBonus(db, editingId, data);
    } else {
      await insertManagerBonus(db, data);
    }
    resetForm(); load();
  };

  // Apply filters to seller bonus
  const filteredSellerDispatches = sellerDispatches.filter((d) => {
    if (d.bonus_cards === 0) return false;
    if (filterSellerId && d.seller_id !== filterSellerId) return false;
    if (filterDateFrom && d.entry_date < filterDateFrom) return false;
    if (filterDateTo && d.entry_date > filterDateTo) return false;
    return true;
  });

  const filteredManagerBonus = managerBonusList.filter((m) => {
    if (filterDateFrom && m.entry_date < filterDateFrom) return false;
    if (filterDateTo && m.entry_date > filterDateTo) return false;
    return true;
  });

  const managerItems: EntryItem[] = filteredManagerBonus.map((m) => ({
    id: m.id,
    title: `${m.cards} bonus cards`,
    subtitle: m.note ?? undefined,
    amount: `৳${formatTaka(bonusValue(m.cards, m.rate_at_entry))}`,
    timestamp: m.created_at,
    archived: m.archived_at !== null,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Filters */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Filters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, !filterSellerId && styles.filterChipActive]}
                onPress={() => setFilterSellerId(null)}
              >
                <Text style={[styles.filterChipText, !filterSellerId && styles.filterChipTextActive]}>All sellers</Text>
              </TouchableOpacity>
              {sellers.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.filterChip, filterSellerId === s.id && styles.filterChipActive]}
                  onPress={() => setFilterSellerId(filterSellerId === s.id ? null : s.id)}
                >
                  <Text style={[styles.filterChipText, filterSellerId === s.id && styles.filterChipTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Seller Bonus section */}
          <Text style={styles.sectionTitle}>Seller Bonus</Text>
          {filteredSellerDispatches.length === 0 ? (
            <Text style={styles.empty}>No seller bonus entries.</Text>
          ) : (
            filteredSellerDispatches.map((d) => (
              <View key={d.id} style={[styles.card, d.archived_at !== null && styles.cardArchived]}>
                <View style={styles.bonusRow}>
                  <View>
                    <Text style={styles.bonusName}>{d.sellerName}</Text>
                    <Text style={styles.bonusMeta}>{formatEntryDate(d.entry_date)}</Text>
                  </View>
                  <View style={styles.bonusRight}>
                    <Text style={styles.bonusCards}>{d.bonus_cards} cards</Text>
                    <Text style={styles.bonusValue}>৳{formatTaka(bonusValue(d.bonus_cards, d.sell_rate))}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Manager Bonus section */}
          <Text style={styles.sectionTitle}>Manager Bonus</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editingId ? 'Edit' : 'Add Manager Bonus'}</Text>
            <DatePicker value={entryDate} onChange={setEntryDate} />
            <View>
              <Text style={styles.label}>Cards</Text>
              <TextInput
                style={styles.input}
                value={cards}
                onChangeText={setCards}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colours.textMuted}
              />
            </View>
            {cards && parseInt(cards, 10) > 0 && (
              <Text style={styles.valuePreview}>
                Value: ৳{formatTaka(bonusValue(parseInt(cards, 10) || 0, sellRate))} (at ৳{formatTaka(sellRate)}/card)
              </Text>
            )}
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor={colours.textMuted}
            />
            <View style={styles.formActions}>
              {editingId && (
                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>{editingId ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <EntryList
            items={managerItems}
            onEdit={(id) => {
              const m = managerBonusList.find((x) => x.id === id);
              if (!m) return;
              setEditingId(id); setEntryDate(m.entry_date); setCards(String(m.cards)); setNote(m.note ?? '');
            }}
            onDelete={(id) => { setDeleteTarget(id); setDeleteType('manager'); }}
            onRestore={async (id) => { if (db) { await restoreManagerBonus(db, id); load(); } }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <DeleteConfirmSheet
        visible={deleteTarget !== null}
        onPermanent={async () => {
          if (db && deleteTarget && deleteType === 'manager') {
            await deleteManagerBonus(db, deleteTarget);
          }
          setDeleteTarget(null); setDeleteType(null); load();
        }}
        onArchive={async () => {
          if (db && deleteTarget && deleteType === 'manager') {
            await archiveManagerBonus(db, deleteTarget);
          }
          setDeleteTarget(null); setDeleteType(null); load();
        }}
        onCancel={() => { setDeleteTarget(null); setDeleteType(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colours.textPrimary, marginTop: spacing.sm },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, elevation: 1 },
  cardArchived: { opacity: 0.6 },
  cardTitle: { ...typography.bodyBold, color: colours.textPrimary },
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44 },
  valuePreview: { ...typography.bodyBold, color: colours.primary },
  formActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md },
  cancelText: { ...typography.bodyBold, color: colours.textSecondary },
  submitBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: 'center' },
  submitText: { ...typography.button, color: colours.textOnPrimary },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colours.surfaceVariant, marginRight: spacing.xs },
  filterChipActive: { backgroundColor: colours.primary },
  filterChipText: { ...typography.captionBold, color: colours.textSecondary },
  filterChipTextActive: { color: colours.textOnPrimary },
  bonusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bonusName: { ...typography.bodyBold, color: colours.textPrimary },
  bonusMeta: { ...typography.caption, color: colours.textMuted },
  bonusRight: { alignItems: 'flex-end' },
  bonusCards: { ...typography.caption, color: colours.textSecondary },
  bonusValue: { ...typography.bodyBold, color: colours.primary },
  empty: { ...typography.body, color: colours.textMuted, textAlign: 'center' },
});
