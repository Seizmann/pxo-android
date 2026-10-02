import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatTaka } from '@pxo/core';
import { useDb } from '../../src/hooks/useDb';
import { useWalletBalances } from '../../src/hooks/useWalletBalances';
import { listWallets } from '../../src/db/repos/wallets';
import { insertTransfer, listTransfers, getTransfer, archiveTransfer, deleteTransfer } from '../../src/db/repos/transfers';
import { insertExpense } from '../../src/db/repos/expenses';
import { getExpenseCategory } from '../../src/db/repos/expense-categories';
import { SummaryCard } from '../../src/components/SummaryCard';
import { AmountInput } from '../../src/components/AmountInput';
import { DatePicker } from '../../src/components/DatePicker';
import { EntryList } from '../../src/components/EntryList';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import type { Transfer, Wallet } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { todayIsoDate } from '../../src/utils/dateFormat';

type WalletName = 'Cash' | 'bKash' | 'Nagad';
const WALLET_NAMES: WalletName[] = ['Cash', 'bKash', 'Nagad'];

export default function WalletsScreen() {
  const db = useDb();
  const balances = useWalletBalances(db);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Transfer form
  const [fromWallet, setFromWallet] = useState<WalletName>('bKash');
  const [toWallet, setToWallet] = useState<WalletName>('Cash');
  const [amount, setAmount] = useState(0);
  const [charge, setCharge] = useState(0);
  const [entryDate, setEntryDate] = useState(todayIsoDate());

  const isMfsToCash = (fromWallet === 'bKash' || fromWallet === 'Nagad') && toWallet === 'Cash';

  const load = useCallback(async () => {
    if (!db) return;
    setWallets(await listWallets(db));
    setTransfers(await listTransfers(db, 'active'));
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const walletBalance = (name: WalletName) => {
    if (name === 'Cash') return balances.cash;
    if (name === 'bKash') return balances.bkash;
    return balances.nagad;
  };

  const walletAccent = (name: WalletName) => {
    if (name === 'Cash') return colours.cash;
    if (name === 'bKash') return colours.bkash;
    return colours.nagad;
  };

  const handleTransfer = async () => {
    if (!db) return;
    if (fromWallet === toWallet) { Alert.alert('Validation', 'From and To wallets must differ.'); return; }
    if (amount <= 0) { Alert.alert('Validation', 'Enter an amount.'); return; }

    const fromW = wallets.find((w) => w.name === fromWallet);
    const toW = wallets.find((w) => w.name === toWallet);
    if (!fromW || !toW) return;

    let expenseId: string | undefined;

    // MFS→Cash: auto-create a Cash-out expense whose wallet line is the source MFS wallet
    if (isMfsToCash && charge > 0) {
      const cashOutCat = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM expense_categories WHERE name='Cash-out' AND archived_at IS NULL LIMIT 1;`,
      );
      const expense = await insertExpense(
        db,
        { entry_date: entryDate, category_id: cashOutCat?.id ?? 'cat-cashout', note: `Cash-out charge for transfer` },
        [{ wallet_id: fromW.id, amount: charge }],
      );
      expenseId = expense.id;
    }

    await insertTransfer(db, {
      from_wallet_id: fromW.id,
      to_wallet_id: toW.id,
      amount,
      charge: isMfsToCash ? charge : 0,
      expense_id: expenseId,
      entry_date: entryDate,
    });

    setAmount(0);
    setCharge(0);
    load();
  };

  const listItems = transfers.map((t) => {
    const from = wallets.find((w) => w.id === t.from_wallet_id)?.name ?? '?';
    const to = wallets.find((w) => w.id === t.to_wallet_id)?.name ?? '?';
    return {
      id: t.id,
      title: `${from} → ${to}`,
      subtitle: t.charge > 0 ? `Charge: ৳${formatTaka(t.charge)}` : undefined,
      amount: `৳${formatTaka(t.amount)}`,
      timestamp: t.created_at,
      archived: t.archived_at !== null,
    };
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balances */}
        <Text style={styles.sectionTitle}>Balances</Text>
        {WALLET_NAMES.map((name) => (
          <SummaryCard
            key={name}
            label={name}
            value={`৳${formatTaka(walletBalance(name))}`}
            accent={walletAccent(name)}
          />
        ))}
        <SummaryCard
          label="Total"
          value={`৳${formatTaka(balances.total)}`}
          accent={colours.primary}
        />

        {/* Transfer form */}
        <Text style={styles.sectionTitle}>Transfer</Text>
        <View style={styles.card}>
          <DatePicker value={entryDate} onChange={setEntryDate} />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>From</Text>
              <View style={styles.pickerRow}>
                {WALLET_NAMES.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.walletBtn, fromWallet === n && styles.walletBtnActive]}
                    onPress={() => setFromWallet(n)}
                  >
                    <Text style={[styles.walletBtnText, fromWallet === n && styles.walletBtnTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>To</Text>
              <View style={styles.pickerRow}>
                {WALLET_NAMES.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.walletBtn, toWallet === n && styles.walletBtnActive]}
                    onPress={() => setToWallet(n)}
                  >
                    <Text style={[styles.walletBtnText, toWallet === n && styles.walletBtnTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <AmountInput label="Amount (৳)" value={amount} onChange={setAmount} />

          {isMfsToCash && (
            <AmountInput
              label="Cash-out charge (৳) — booked as expense"
              value={charge}
              onChange={setCharge}
            />
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleTransfer}>
            <Text style={styles.submitText}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Transfer History</Text>
        <EntryList
          items={listItems}
          onEdit={() => {}} // transfers are not editable, only deletable
          onDelete={(id) => setDeleteTarget(id)}
          onRestore={async (id) => {
            if (db) {
              await db.runAsync(`UPDATE transfers SET archived_at=NULL, updated_at=datetime('now') WHERE id=?;`, [id]);
              load();
            }
          }}
        />
      </ScrollView>

      <DeleteConfirmSheet
        visible={deleteTarget !== null}
        onPermanent={async () => { if (db && deleteTarget) { await deleteTransfer(db, deleteTarget); setDeleteTarget(null); load(); } }}
        onArchive={async () => { if (db && deleteTarget) { await archiveTransfer(db, deleteTarget); setDeleteTarget(null); load(); } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colours.textPrimary, marginTop: spacing.sm },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, elevation: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  pickerRow: { flexDirection: 'row', gap: spacing.xs },
  walletBtn: { flex: 1, padding: spacing.xs, borderRadius: radius.sm, backgroundColor: colours.surfaceVariant, alignItems: 'center' },
  walletBtnActive: { backgroundColor: colours.primary },
  walletBtnText: { ...typography.captionBold, color: colours.textSecondary },
  walletBtnTextActive: { color: colours.textOnPrimary },
  submitBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  submitText: { ...typography.button, color: colours.textOnPrimary },
});
