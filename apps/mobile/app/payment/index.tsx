import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDb } from '../../src/hooks/useDb';
import { DatePicker } from '../../src/components/DatePicker';
import { EntryList } from '../../src/components/EntryList';
import { SellerPicker } from '../../src/components/SellerPicker';
import { WalletSplitSheet, type WalletSplit } from '../../src/sheets/WalletSplitSheet';
import { AllocationSheet, type AllocationMode, type PacketAllocationRow } from '../../src/sheets/AllocationSheet';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import {
  listPayments, insertPayment, updatePayment,
  archivePayment, deletePayment, restorePayment,
  listPaymentWalletLines, listPaymentAllocations,
  listAllocationsForPackets,
} from '../../src/db/repos/payments';
import { listDispatchesBySeller, listPacketsByDispatches, listPacketsByDispatch } from '../../src/db/repos/dispatches';
import { formatTaka } from '@pxo/core';
import { packetDue, packetAmount } from '@pxo/core';
import type { Payment } from '../../src/types';
import { colours, spacing, typography, radius } from '../../src/theme';
import { todayIsoDate } from '../../src/utils/dateFormat';
import { listWallets } from '../../src/db/repos/wallets';
import { newId } from '../../src/utils/uuid';

type Filter = 'active' | 'archived' | 'all';

export default function ReceivePaymentScreen() {
  const db = useDb();

  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [walletSplit, setWalletSplit] = useState<WalletSplit>({ cash: 0, bkash: 0, nagad: 0 });
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('auto');
  const [packetRows, setPacketRows] = useState<PacketAllocationRow[]>([]);
  const [showAllocationSheet, setShowAllocationSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [walletIds, setWalletIds] = useState({ cash: 'wallet-cash', bkash: 'wallet-bkash', nagad: 'wallet-nagad' });

  const loadWalletIds = useCallback(async () => {
    if (!db) return;
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
    setPayments(await listPayments(db, filter));
  }, [db, filter]);

  useEffect(() => { loadWalletIds(); }, [loadWalletIds]);
  useEffect(() => { loadList(); }, [loadList]);

  // Load packets when seller changes
  const loadPacketsForSeller = useCallback(async (sid: string) => {
    if (!db) return;
    const dispatches = await listDispatchesBySeller(db, sid, 'active');
    const allPackets = await listPacketsByDispatches(db, dispatches.map((d) => d.id));
    const dispMap = new Map(dispatches.map((d) => [d.id, d]));

    // Get existing allocations for these packets
    const existingAllocs = await listAllocationsForPackets(db, allPackets.map((p) => p.id));

    const rows: PacketAllocationRow[] = allPackets.map((pkt) => {
      const dispatch = dispMap.get(pkt.dispatch_id)!;
      const rate = pkt.rate_override ?? dispatch.sell_rate;
      const gross = pkt.cards * rate;

      const pkAllocations = existingAllocs
        .filter((a) => a.packet_id === pkt.id)
        .map((a) => ({ ...a, payment_archived_at: null as string | null }));

      // Fetch payment archived_at for each — simplified: treat active payments only
      const paidSoFar = pkAllocations.reduce((s, a) => s + a.amount, 0);
      const discountSoFar = pkAllocations.reduce((s, a) => s + a.discount, 0);

      return {
        packet_id: pkt.id,
        label: `Packet ${pkt.seq} — ${pkt.cards} cards @ ৳${formatTaka(rate)}`,
        grossAmount: gross,
        paidSoFar,
        discountSoFar,
        dispatchDate: dispatch.entry_date,
        seq: pkt.seq,
        amount: 0,
        discount: 0,
      };
    });
    setPacketRows(rows);
  }, [db]);

  useEffect(() => {
    if (sellerId) loadPacketsForSeller(sellerId);
    else setPacketRows([]);
  }, [sellerId, loadPacketsForSeller]);

  const resetForm = () => {
    setEntryDate(todayIsoDate());
    setSellerId(null);
    setDiscount(0);
    setNote('');
    setWalletSplit({ cash: 0, bkash: 0, nagad: 0 });
    setAllocationMode('auto');
    setPacketRows([]);
    setEditingId(null);
  };

  const totalPayment = walletSplit.cash + walletSplit.bkash + walletSplit.nagad;

  const handleSubmit = async () => {
    if (!db) return;
    if (!sellerId) { Alert.alert('Validation', 'Select a seller.'); return; }
    if (totalPayment === 0 && discount === 0) { Alert.alert('Validation', 'Enter a payment or discount.'); return; }

    const walletLines: { wallet_id: string; amount: number }[] = [];
    if (walletSplit.cash > 0) walletLines.push({ wallet_id: walletIds.cash, amount: walletSplit.cash });
    if (walletSplit.bkash > 0) walletLines.push({ wallet_id: walletIds.bkash, amount: walletSplit.bkash });
    if (walletSplit.nagad > 0) walletLines.push({ wallet_id: walletIds.nagad, amount: walletSplit.nagad });

    const allocations = packetRows
      .filter((r) => r.amount > 0 || r.discount > 0)
      .map((r) => ({ packet_id: r.packet_id, amount: r.amount, discount: r.discount }));

    const data = {
      seller_id: sellerId,
      entry_date: entryDate,
      discount_total: discount,
      allocation_mode: allocationMode,
      note: note || undefined,
    };

    if (editingId) {
      await updatePayment(db, editingId, data, walletLines, allocations);
    } else {
      await insertPayment(db, data, walletLines, allocations);
    }
    resetForm();
    loadList();
  };

  const handleEdit = async (id: string) => {
    if (!db) return;
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setEntryDate(p.entry_date);
    setSellerId(p.seller_id);
    setDiscount(p.discount_total);
    setNote(p.note ?? '');
    setAllocationMode(p.allocation_mode);
    const wLines = await listPaymentWalletLines(db, id);
    const split: WalletSplit = { cash: 0, bkash: 0, nagad: 0 };
    wLines.forEach((l) => {
      if (l.wallet_id === walletIds.cash) split.cash = l.amount;
      else if (l.wallet_id === walletIds.bkash) split.bkash = l.amount;
      else if (l.wallet_id === walletIds.nagad) split.nagad = l.amount;
    });
    setWalletSplit(split);
  };

  const listItems = payments.map((p) => ({
    id: p.id,
    title: `Payment — ৳${formatTaka(p.discount_total > 0 ? p.discount_total : 0)} discount`,
    subtitle: p.note ?? undefined,
    amount: undefined,
    timestamp: p.created_at,
    archived: p.archived_at !== null,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editingId ? 'Edit Payment' : 'Receive Payment'}</Text>

            <DatePicker value={entryDate} onChange={setEntryDate} />

            {db && (
              <SellerPicker db={db} value={sellerId} onChange={(id) => setSellerId(id)} />
            )}

            <TouchableOpacity style={styles.splitBtn} onPress={() => setShowWalletSheet(true)}>
              <Text style={styles.splitBtnText}>
                Amount: ৳{formatTaka(totalPayment)} {totalPayment === 0 ? '(tap to set)' : '✓'}
              </Text>
            </TouchableOpacity>

            <View>
              <Text style={styles.label}>Discount (৳)</Text>
              <TextInput
                style={styles.input}
                value={discount === 0 ? '' : formatTaka(discount)}
                onChangeText={(t) => setDiscount(Math.round((parseFloat(t) || 0) * 100))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colours.textMuted}
              />
            </View>

            {packetRows.length > 0 && (
              <TouchableOpacity style={styles.allocBtn} onPress={() => setShowAllocationSheet(true)}>
                <Text style={styles.allocBtnText}>
                  Allocation: {allocationMode} — {packetRows.filter(r => r.amount > 0 || r.discount > 0).length}/{packetRows.length} packets
                </Text>
              </TouchableOpacity>
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
                <Text style={styles.submitText}>{editingId ? 'Save' : 'Record Payment'}</Text>
              </TouchableOpacity>
            </View>
          </View>

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
            onRestore={async (id) => { if (db) { await restorePayment(db, id); loadList(); } }}
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

      <AllocationSheet
        visible={showAllocationSheet}
        packets={packetRows}
        totalPayment={totalPayment}
        totalDiscount={discount}
        mode={allocationMode}
        onModeChange={setAllocationMode}
        onAllocationsChange={setPacketRows}
        onDone={() => setShowAllocationSheet(false)}
      />

      <DeleteConfirmSheet
        visible={deleteTarget !== null}
        onPermanent={async () => { if (db && deleteTarget) { await deletePayment(db, deleteTarget); setDeleteTarget(null); loadList(); } }}
        onArchive={async () => { if (db && deleteTarget) { await archivePayment(db, deleteTarget); setDeleteTarget(null); loadList(); } }}
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
  splitBtn: { borderWidth: 1, borderColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, minHeight: 48, justifyContent: 'center' },
  splitBtnText: { ...typography.body, color: colours.primary },
  allocBtn: { borderWidth: 1, borderColor: colours.primaryLight, borderRadius: radius.md, padding: spacing.sm, minHeight: 44, justifyContent: 'center', backgroundColor: colours.surfaceVariant },
  allocBtnText: { ...typography.body, color: colours.primary },
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
