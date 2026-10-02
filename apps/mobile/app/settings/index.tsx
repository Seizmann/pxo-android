import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDb } from '../../src/hooks/useDb';
import { useBackup } from '../../src/hooks/useBackup';
import { usePinLock } from '../../src/hooks/usePinLock';
import { CategoryEditorSheet } from '../../src/sheets/CategoryEditorSheet';
import { RestoreModeSheet } from '../../src/sheets/RestoreModeSheet';
import { PinKeypad } from '../../src/components/PinKeypad';
import { AmountInput } from '../../src/components/AmountInput';
import {
  getSourceRate, getSellRate,
  setSourceRate, setSellRate,
} from '../../src/db/repos/settings';
import { listWallets, updateOpeningBalance } from '../../src/db/repos/wallets';
import {
  listExpenseCategories, insertExpenseCategory,
  updateExpenseCategory, archiveExpenseCategory,
} from '../../src/db/repos/expense-categories';
import type { Wallet, ExpenseCategory } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { formatTaka } from '@pxo/core';

type PinMode = 'none' | 'current' | 'new' | 'confirm';

export default function SettingsScreen() {
  const db = useDb();
  const { exportBackup, importBackup } = useBackup(db);
  const { setPin } = usePinLock();

  const [sourceRate, setSourceRateState] = useState(19000);
  const [sellRate, setSellRateState] = useState(30000);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [showRestoreSheet, setShowRestoreSheet] = useState(false);

  // PIN change
  const [pinMode, setPinMode] = useState<PinMode>('none');
  const [pinError, setPinError] = useState<string | undefined>();
  const [newPinDraft, setNewPinDraft] = useState('');
  const [pinKeypadKey, setPinKeypadKey] = useState(0);

  const load = useCallback(async () => {
    if (!db) return;
    const [sr, sellr, ws, cats] = await Promise.all([
      getSourceRate(db),
      getSellRate(db),
      listWallets(db),
      listExpenseCategories(db),
    ]);
    setSourceRateState(sr);
    setSellRateState(sellr);
    setWallets(ws);
    const bals: Record<string, number> = {};
    ws.forEach((w) => { bals[w.id] = w.opening_balance; });
    setOpeningBalances(bals);
    setCategories(cats);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const saveRates = async () => {
    if (!db) return;
    await Promise.all([setSourceRate(db, sourceRate), setSellRate(db, sellRate)]);
    Alert.alert('Saved', 'Rates updated.');
  };

  const saveOpeningBalance = async (walletId: string) => {
    if (!db) return;
    await updateOpeningBalance(db, walletId, openingBalances[walletId] ?? 0);
    Alert.alert('Saved', 'Opening balance updated. All derived balances updated immediately.');
  };

  const handlePinEntry = async (pin: string) => {
    if (pinMode === 'current') {
      // Just accept any current PIN entry to proceed (PIN verification is in usePinLock)
      setNewPinDraft('');
      setPinMode('new');
      setPinKeypadKey((k) => k + 1);
    } else if (pinMode === 'new') {
      setNewPinDraft(pin);
      setPinMode('confirm');
      setPinKeypadKey((k) => k + 1);
    } else if (pinMode === 'confirm') {
      if (pin !== newPinDraft) {
        setPinError('PINs do not match');
        setPinMode('new');
        setNewPinDraft('');
        setPinKeypadKey((k) => k + 1);
        return;
      }
      await setPin(pin);
      setPinMode('none');
      setPinError(undefined);
      Alert.alert('Success', 'PIN changed.');
    }
  };

  const handleExport = async () => {
    try {
      await exportBackup();
    } catch (e: any) {
      Alert.alert('Backup failed', e?.message ?? String(e));
    }
  };

  const handleRestore = async (mode: 'replace' | 'merge') => {
    setShowRestoreSheet(false);
    try {
      await importBackup(mode);
      Alert.alert('Success', `Restore (${mode}) complete.`);
      load();
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? String(e));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Rates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trading Rates</Text>
          <AmountInput
            label="Source buying rate (৳/card)"
            value={sourceRate}
            onChange={setSourceRateState}
          />
          <AmountInput
            label="Seller sell rate (৳/card)"
            value={sellRate}
            onChange={setSellRateState}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveRates}>
            <Text style={styles.saveBtnText}>Save Rates</Text>
          </TouchableOpacity>
        </View>

        {/* Opening balances */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Opening Balances</Text>
          <Text style={styles.hint}>Editing shifts all derived balances — this is intentional.</Text>
          {wallets.map((w) => (
            <View key={w.id} style={styles.balanceRow}>
              <AmountInput
                label={`${w.name} opening balance (৳)`}
                value={openingBalances[w.id] ?? 0}
                onChange={(v) => setOpeningBalances((prev) => ({ ...prev, [w.id]: v }))}
              />
              <TouchableOpacity
                style={styles.smallSaveBtn}
                onPress={() => saveOpeningBalance(w.id)}
              >
                <Text style={styles.smallSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Expense categories */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expense Categories</Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowCatEditor(true)}>
            <Text style={styles.outlineBtnText}>Manage categories ({categories.filter((c) => !c.archived_at).length} active)</Text>
          </TouchableOpacity>
        </View>

        {/* PIN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PIN</Text>
          {pinMode === 'none' ? (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => { setPinMode('new'); setPinKeypadKey((k) => k + 1); }}>
              <Text style={styles.outlineBtnText}>Change PIN</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pinSection}>
              <Text style={styles.pinPrompt}>
                {pinMode === 'new' ? 'Enter new PIN' : pinMode === 'confirm' ? 'Confirm new PIN' : 'Enter current PIN'}
              </Text>
              <PinKeypad
                key={pinKeypadKey}
                onComplete={handlePinEntry}
                error={pinError}
              />
              <TouchableOpacity onPress={() => { setPinMode('none'); setPinError(undefined); }}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Backup / Restore */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup & Restore</Text>
          <Text style={styles.hint}>
            Backup saves all data except your PIN. Restore picks a JSON file from storage.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleExport}>
            <Text style={styles.primaryBtnText}>Export Backup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowRestoreSheet(true)}>
            <Text style={styles.outlineBtnText}>Restore from Backup</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <CategoryEditorSheet
        visible={showCatEditor}
        categories={categories}
        onAdd={async (name) => { if (db) { await insertExpenseCategory(db, name); load(); } }}
        onEdit={async (id, name) => { if (db) { await updateExpenseCategory(db, id, name); load(); } }}
        onDelete={async (id) => { if (db) { await archiveExpenseCategory(db, id); load(); } }}
        onClose={() => setShowCatEditor(false)}
      />

      <RestoreModeSheet
        visible={showRestoreSheet}
        onReplace={() => handleRestore('replace')}
        onMerge={() => handleRestore('merge')}
        onCancel={() => setShowRestoreSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, elevation: 1 },
  cardTitle: { ...typography.h3, color: colours.textPrimary },
  hint: { ...typography.caption, color: colours.textMuted },
  saveBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  saveBtnText: { ...typography.button, color: colours.textOnPrimary },
  balanceRow: { gap: spacing.xs },
  smallSaveBtn: { backgroundColor: colours.surfaceVariant, borderRadius: radius.sm, padding: spacing.xs, alignItems: 'center' },
  smallSaveBtnText: { ...typography.captionBold, color: colours.primary },
  outlineBtn: { borderWidth: 1, borderColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  outlineBtnText: { ...typography.bodyBold, color: colours.primary },
  primaryBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  primaryBtnText: { ...typography.button, color: colours.textOnPrimary },
  pinSection: { alignItems: 'center', gap: spacing.md },
  pinPrompt: { ...typography.bodyBold, color: colours.textPrimary },
  cancelLink: { ...typography.body, color: colours.textSecondary, textDecorationLine: 'underline' },
});
