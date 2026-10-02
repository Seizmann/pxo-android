import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { WalletSplitSheet, type WalletSplit } from '../../src/sheets/WalletSplitSheet';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import { CategoryEditorSheet } from '../../src/sheets/CategoryEditorSheet';
import {
  listExpenses, insertExpense, updateExpense,
  archiveExpense, deleteExpense, restoreExpense,
  listExpenseWalletLines,
} from '../../src/db/repos/expenses';
import {
  listExpenseCategories, insertExpenseCategory,
  updateExpenseCategory, archiveExpenseCategory,
} from '../../src/db/repos/expense-categories';
import { listWallets } from '../../src/db/repos/wallets';
import type { Expense, ExpenseCategory } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { todayIsoDate } from '../../src/utils/dateFormat';

type Filter = 'active' | 'archived' | 'all';

export default function ExpensesScreen() {
  const db = useDb();

  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [walletSplit, setWalletSplit] = useState<WalletSplit>({ cash: 0, bkash: 0, nagad: 0 });
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [filterCatId, setFilterCatId] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const [walletIds, setWalletIds] = useState({ cash: 'wallet-cash', bkash: 'wallet-bkash', nagad: 'wallet-nagad' });

  const loadAll = useCallback(async () => {
    if (!db) return;
    const ws = await listWallets(db);
    const ids = { cash: 'wallet-cash', bkash: 'wallet-bkash', nagad: 'wallet-nagad' };
    ws.forEach((w) => {
      if (w.name === 'Cash') ids.cash = w.id;
      else if (w.name === 'bKash') ids.bkash = w.id;
      else if (w.name === 'Nagad') ids.nagad = w.id;
    });
    setWalletIds(ids);
    setCategories(await listExpenseCategories(db));
    setExpenses(await listExpenses(db, filter, filterCatId));
  }, [db, filter, filterCatId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const resetForm = () => {
    setEntryDate(todayIsoDate()); setCategoryId(null); setNote('');
    setWalletSplit({ cash: 0, bkash: 0, nagad: 0 }); setEditingId(null);
  };

  const buildLines = () => {
    const lines: { wallet_id: string; amount: number }[] = [];
    if (walletSplit.cash > 0) lines.push({ wallet_id: walletIds.cash, amount: walletSplit.cash });
    if (walletSplit.bkash > 0) lines.push({ wallet_id: walletIds.bkash, amount: walletSplit.bkash });
    if (walletSplit.nagad > 0) lines.push({ wallet_id: walletIds.nagad, amount: walletSplit.nagad });
    return lines;
  };

  const total = walletSplit.cash + walletSplit.bkash + walletSplit.nagad;

  const handleSubmit = async () => {
    if (!db) return;
    if (!categoryId) { Alert.alert('Validation', 'Select a category.'); return; }
    if (total <= 0) { Alert.alert('Validation', 'Enter an amount.'); return; }
    const data = { entry_date: entryDate, category_id: categoryId, note: note.trim() || undefined };
    if (editingId) {
      await updateExpense(db, editingId, data, buildLines());
    } else {
      await insertExpense(db, data, buildLines());
    }
    resetForm(); loadAll();
  };

  const handleEdit = async (id: string) => {
    if (!db) return;
    const e = expenses.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id); setEntryDate(e.entry_date); setCategoryId(e.category_id); setNote(e.note ?? '');
    const lines = await listExpenseWalletLines(db, id);
    const split: WalletSplit = { cash: 0, bkash: 0, nagad: 0 };
    lines.forEach((l) => {
      if (l.wallet_id === walletIds.cash) split.cash = l.amount;
      else if (l.wallet_id === walletIds.bkash) split.bkash = l.amount;
      else if (l.wallet_id === walletIds.nagad) split.nagad = l.amount;
    });
    setWalletSplit(split);
  };

  const catName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? 'Unknown') : 'Select…';

  const listItems = expenses.map((e) => ({
    id: e.id,
    title: catName(e.category_id),
    subtitle: e.note ?? undefined,
    amount: undefined,
    timestamp: e.created_at,
    archived: e.archived_at !== null,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editingId ? 'Edit Expense' : 'New Expense'}</Text>
            <DatePicker value={entryDate} onChange={setEntryDate} />

            {/* Category picker */}
            <View>
              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                <TouchableOpacity style={styles.catBtn} onPress={() => setShowCatPicker(true)}>
                  <Text style={[styles.catBtnText, !categoryId && styles.placeholder]}>{catName(categoryId)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editCatBtn} onPress={() => setShowCatEditor(true)}>
                  <Text style={styles.editCatText}>Edit categories</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.splitBtn} onPress={() => setShowWalletSheet(true)}>
              <Text style={styles.splitBtnText}>Amount: ৳{formatTaka(total)} {total === 0 ? '(tap to set)' : '✓'}</Text>
            </TouchableOpacity>

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
                <Text style={styles.submitText}>{editingId ? 'Save' : 'Add Expense'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter */}
          <View style={styles.filterRow}>
            {(['active', 'archived', 'all'] as Filter[]).map((f) => (
              <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterScroll}>
            <TouchableOpacity style={[styles.catFilter, !filterCatId && styles.catFilterActive]} onPress={() => setFilterCatId(undefined)}>
              <Text style={[styles.catFilterText, !filterCatId && styles.catFilterTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.filter((c) => c.archived_at === null).map((c) => (
              <TouchableOpacity key={c.id} style={[styles.catFilter, filterCatId === c.id && styles.catFilterActive]} onPress={() => setFilterCatId(c.id)}>
                <Text style={[styles.catFilterText, filterCatId === c.id && styles.catFilterTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <EntryList
            items={listItems}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteTarget(id)}
            onRestore={async (id) => { if (db) { await restoreExpense(db, id); loadAll(); } }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker modal */}
      <Modal visible={showCatPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCatPicker(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {categories.filter((c) => c.archived_at === null).map((c) => (
              <TouchableOpacity key={c.id} style={styles.catOption} onPress={() => { setCategoryId(c.id); setShowCatPicker(false); }}>
                <Text style={styles.catOptionText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <WalletSplitSheet visible={showWalletSheet} value={walletSplit} onChange={setWalletSplit} onDone={() => setShowWalletSheet(false)} />

      <CategoryEditorSheet
        visible={showCatEditor}
        categories={categories}
        onAdd={async (name) => { if (db) { await insertExpenseCategory(db, name); loadAll(); } }}
        onEdit={async (id, name) => { if (db) { await updateExpenseCategory(db, id, name); loadAll(); } }}
        onDelete={async (id) => { if (db) { await archiveExpenseCategory(db, id); loadAll(); } }}
        onClose={() => setShowCatEditor(false)}
      />

      <DeleteConfirmSheet
        visible={deleteTarget !== null}
        onPermanent={async () => { if (db && deleteTarget) { await deleteExpense(db, deleteTarget); setDeleteTarget(null); loadAll(); } }}
        onArchive={async () => { if (db && deleteTarget) { await archiveExpense(db, deleteTarget); setDeleteTarget(null); loadAll(); } }}
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
  catRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  catBtn: { flex: 1, borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 44, justifyContent: 'center' },
  catBtnText: { ...typography.body, color: colours.textPrimary },
  placeholder: { color: colours.textMuted },
  editCatBtn: { padding: spacing.sm },
  editCatText: { ...typography.caption, color: colours.primary },
  input: { borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44 },
  splitBtn: { borderWidth: 1, borderColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, minHeight: 48, justifyContent: 'center' },
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
  catFilterScroll: { flexGrow: 0 },
  catFilter: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colours.surface, marginRight: spacing.xs },
  catFilterActive: { backgroundColor: colours.primaryLight },
  catFilterText: { ...typography.captionBold, color: colours.textSecondary },
  catFilterTextActive: { color: colours.textOnPrimary },
  modal: { flex: 1, backgroundColor: colours.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  modalTitle: { ...typography.h3, color: colours.textPrimary },
  closeBtn: { fontSize: 20, color: colours.textMuted, padding: spacing.sm },
  catOption: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colours.divider },
  catOptionText: { ...typography.body, color: colours.textPrimary },
});
