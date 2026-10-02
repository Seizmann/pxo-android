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
import { AmountInput } from '../../src/components/AmountInput';
import { EntryList } from '../../src/components/EntryList';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import { WalletSplitSheet, type WalletSplit } from '../../src/sheets/WalletSplitSheet';
import {
  listStockPurchases,
  insertStockPurchase,
  updateStockPurchase,
  archiveStockPurchase,
  deleteStockPurchase,
  restoreStockPurchase,
  listStockPurchasePayments,
} from '../../src/db/repos/stock-purchases';
import { getSourceRate } from '../../src/db/repos/settings';
import type { StockPurchase } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { todayIsoDate } from '../../src/utils/dateFormat';
import { listWallets } from '../../src/db/repos/wallets';

type Filter = 'active' | 'archived' | 'all';

export default function BuyStockScreen() {
  const db = useDb();

  // Form state
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState(0);
  const [note, setNote] = useState('');
  const [walletSplit, setWalletSplit] = useState<WalletSplit>({ cash: 0, bkash: 0, nagad: 0 });
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // List state
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [filter, setFilter] = useState<Filter>('active');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Wallet IDs
  const [walletIds, setWalletIds] = useState<{ cash: string; bkash: string; nagad: string }>({
    cash: 'wallet-cash', bkash: 'wallet-bkash', nagad: 'wallet-nagad',
  });

  const loadDefaults = useCallback(async () => {
    if (!db) return;
    const r = await getSourceRate(db);
    setRate(r);
    const ws = await listWallets(db);
    const ids = { cash: 'wallet-cash', bkash: 'wallet-bkash', nagad: 'wallet-nagad' };
    ws.forEach((w) => {
      if (w.name === 'Cash') ids.cash = w.id;
      else if (w.name === 'bKash') ids.bkash = w.id;
      else if (w.name === 'Nagad') ids.nagad = w.id;
    });
    setWalletIds(ids);
  }, [db]);

  const loadList = useCallback(async () => {
    if (!db) return;
    setPurchases(await listStockPurchases(db, filter));
  }, [db, filter]);

  useEffect(() => { loadDefaults(); }, [loadDefaults]);
  useEffect(() => { loadList(); }, [loadList]);

  const resetForm = () => {
    setEntryDate(todayIsoDate());
    setQuantity('');
    setNote('');
    setWalletSplit({ cash: 0, bkash: 0, nagad: 0 });
    setEditingId(null);
  };

  const buildWalletLines = () => {
    const lines: { wallet_id: string; amount: number }[] = [];
    if (walletSplit.cash > 0) lines.push({ wallet_id: walletIds.cash, amount: walletSplit.cash });
    if (walletSplit.bkash > 0) lines.push({ wallet_id: walletIds.bkash, amount: walletSplit.bkash });
    if (walletSplit.nagad > 0) lines.push({ wallet_id: walletIds.nagad, amount: walletSplit.nagad });
    return lines;
  };

  const handleSubmit = async () => {
    if (!db) return;
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) { Alert.alert('Validation', 'Enter a valid quantity.'); return; }
    if (rate <= 0) { Alert.alert('Validation', 'Enter a valid rate.'); return; }

    const lines = buildWalletLines();
    const data = { entry_date: entryDate, quantity: qty, rate, note: note || undefined };

    if (editingId) {
      await updateStockPurchase(db, editingId, data, lines);
    } else {
      await insertStockPurchase(db, data, lines);
    }
    resetForm();
    loadList();
  };

  const handleEdit = async (id: string) => {
    if (!db) return;
    const p = purchases.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setEntryDate(p.entry_date);
    setQuantity(String(p.quantity));
    setRate(p.rate);
    setNote(p.note ?? '');
    const lines = await listStockPurchasePayments(db, id);
    const split: WalletSplit = { cash: 0, bkash: 0, nagad: 0 };
    lines.forEach((l) => {
      if (l.wallet_id === walletIds.cash) split.cash = l.amount;
      else if (l.wallet_id === walletIds.bkash) split.bkash = l.amount;
      else if (l.wallet_id === walletIds.nagad) split.nagad = l.amount;
    });
    setWalletSplit(split);
  };

  const handlePermanentDelete = async () => {
    if (!db || !deleteTarget) return;
    await deleteStockPurchase(db, deleteTarget);
    setDeleteTarget(null);
    loadList();
  };

  const handleArchive = async () => {
    if (!db || !deleteTarget) return;
    await archiveStockPurchase(db, deleteTarget);
    setDeleteTarget(null);
    loadList();
  };

  const handleRestore = async (id: string) => {
    if (!db) return;
    await restoreStockPurchase(db, id);
    loadList();
  };

  const totalPayment = walletSplit.cash + walletSplit.bkash + walletSplit.nagad;
  const totalCost = (parseInt(quantity, 10) || 0) * rate;

  const listItems = purchases.map((p) => ({
    id: p.id,
    title: `${p.quantity} cards @ ৳${formatTaka(p.rate)}`,
    subtitle: p.note ?? undefined,
    amount: `৳${formatTaka(p.quantity * p.rate)}`,
    timestamp: p.created_at,
    archived: p.archived_at !== null,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editingId ? 'Edit Purchase' : 'New Purchase'}</Text>

            <DatePicker value={entryDate} onChange={setEntryDate} />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Cards</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="e.g. 100"
                  placeholderTextColor={colours.textMuted}
                />
              </View>
              <View style={styles.flex1}>
                <AmountInput label="Rate/card (৳)" value={rate} onChange={setRate} />
              </View>
            </View>

            {totalCost > 0 && (
              <Text style={styles.totalCost}>Total cost: ৳{formatTaka(totalCost)}</Text>
            )}

            {/* Payment split */}
            <TouchableOpacity style={styles.splitBtn} onPress={() => setShowWalletSheet(true)}>
              <Text style={styles.splitBtnText}>
                Payment: ৳{formatTaka(totalPayment)} {totalPayment === 0 ? '(tap to set)' : '✓'}
              </Text>
            </TouchableOpacity>

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
                <Text style={styles.submitText}>{editingId ? 'Save' : 'Add Purchase'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter tabs */}
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

          {/* List */}
          <EntryList
            items={listItems}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteTarget(id)}
            onRestore={handleRestore}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <WalletSplitSheet
        visible={showWalletSheet}
        value={walletSplit}
        onChange={setWalletSplit}
        onDone={() => setShowWalletSheet(false)}
        totalLabel="Payment total"
      />

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
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border,
    borderRadius: radius.md, padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44,
  },
  totalCost: { ...typography.bodyBold, color: colours.primary },
  splitBtn: {
    borderWidth: 1, borderColor: colours.primary, borderRadius: radius.md,
    padding: spacing.sm, minHeight: 48, justifyContent: 'center',
  },
  splitBtnText: { ...typography.body, color: colours.primary },
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
