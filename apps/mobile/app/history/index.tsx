import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDb } from '../../src/hooks/useDb';
import { DeleteConfirmSheet } from '../../src/sheets/DeleteConfirmSheet';
import { formatTimestamp } from '../../src/utils/dateFormat';
import { colours, spacing, typography, radius } from '../../src/theme';

type EntryType = 'stock_purchase' | 'dispatch' | 'payment' | 'expense' | 'transfer' | 'manager_bonus';
type FilterMode = 'all' | 'active' | 'archived';

interface HistoryRow {
  id: string;
  type: EntryType;
  title: string;
  subtitle: string;
  timestamp: string;
  archived: boolean;
}

export default function HistoryScreen() {
  const db = useDb();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: EntryType } | null>(null);

  const load = useCallback(async () => {
    if (!db) return;
    const all: HistoryRow[] = [];

    // Stock purchases
    const purchases = await db.getAllAsync<{ id: string; entry_date: string; quantity: number; rate: number; note: string | null; created_at: string; archived_at: string | null }>(
      `SELECT id, entry_date, quantity, rate, note, created_at, archived_at FROM stock_purchases;`,
    );
    for (const p of purchases) {
      all.push({
        id: p.id, type: 'stock_purchase',
        title: `Buy Stock — ${p.quantity} cards`,
        subtitle: p.note ?? p.entry_date,
        timestamp: p.created_at, archived: p.archived_at !== null,
      });
    }

    // Dispatches
    const dispatches = await db.getAllAsync<{ id: string; entry_date: string; sell_cards: number; bonus_cards: number; note: string | null; created_at: string; archived_at: string | null; seller_name: string }>(
      `SELECT d.id, d.entry_date, d.sell_cards, d.bonus_cards, d.note, d.created_at, d.archived_at, s.name as seller_name
       FROM dispatches d LEFT JOIN sellers s ON s.id=d.seller_id;`,
    );
    for (const d of dispatches) {
      all.push({
        id: d.id, type: 'dispatch',
        title: `Give Cards — ${d.seller_name}`,
        subtitle: `${d.sell_cards} sell + ${d.bonus_cards} bonus`,
        timestamp: d.created_at, archived: d.archived_at !== null,
      });
    }

    // Payments
    const payments = await db.getAllAsync<{ id: string; entry_date: string; discount_total: number; note: string | null; created_at: string; archived_at: string | null; seller_name: string }>(
      `SELECT p.id, p.entry_date, p.discount_total, p.note, p.created_at, p.archived_at, s.name as seller_name
       FROM payments p LEFT JOIN sellers s ON s.id=p.seller_id;`,
    );
    for (const p of payments) {
      all.push({
        id: p.id, type: 'payment',
        title: `Payment — ${p.seller_name}`,
        subtitle: p.discount_total > 0 ? `Discount: ৳${(p.discount_total / 100).toFixed(2)}` : p.entry_date,
        timestamp: p.created_at, archived: p.archived_at !== null,
      });
    }

    // Expenses
    const expenses = await db.getAllAsync<{ id: string; entry_date: string; note: string | null; created_at: string; archived_at: string | null; cat_name: string }>(
      `SELECT e.id, e.entry_date, e.note, e.created_at, e.archived_at, ec.name as cat_name
       FROM expenses e LEFT JOIN expense_categories ec ON ec.id=e.category_id;`,
    );
    for (const e of expenses) {
      all.push({
        id: e.id, type: 'expense',
        title: `Expense — ${e.cat_name}`,
        subtitle: e.note ?? e.entry_date,
        timestamp: e.created_at, archived: e.archived_at !== null,
      });
    }

    // Transfers
    const transfers = await db.getAllAsync<{ id: string; entry_date: string; amount: number; charge: number; created_at: string; archived_at: string | null; from_name: string; to_name: string }>(
      `SELECT t.id, t.entry_date, t.amount, t.charge, t.created_at, t.archived_at,
              fw.name as from_name, tw.name as to_name
       FROM transfers t
       LEFT JOIN wallets fw ON fw.id=t.from_wallet_id
       LEFT JOIN wallets tw ON tw.id=t.to_wallet_id;`,
    );
    for (const t of transfers) {
      all.push({
        id: t.id, type: 'transfer',
        title: `Transfer — ${t.from_name} → ${t.to_name}`,
        subtitle: `৳${(t.amount / 100).toFixed(2)}${t.charge > 0 ? ` + ৳${(t.charge / 100).toFixed(2)} charge` : ''}`,
        timestamp: t.created_at, archived: t.archived_at !== null,
      });
    }

    // Manager bonus
    const bonuses = await db.getAllAsync<{ id: string; entry_date: string; cards: number; note: string | null; created_at: string; archived_at: string | null }>(
      `SELECT id, entry_date, cards, note, created_at, archived_at FROM manager_bonus;`,
    );
    for (const b of bonuses) {
      all.push({
        id: b.id, type: 'manager_bonus',
        title: `Manager Bonus — ${b.cards} cards`,
        subtitle: b.note ?? b.entry_date,
        timestamp: b.created_at, archived: b.archived_at !== null,
      });
    }

    // Sort newest first
    all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    const filtered = filter === 'all' ? all
      : filter === 'active' ? all.filter((r) => !r.archived)
      : all.filter((r) => r.archived);

    setRows(filtered);
  }, [db, filter]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (row: HistoryRow) => {
    if (!db) return;
    const tableMap: Record<EntryType, string> = {
      stock_purchase: 'stock_purchases',
      dispatch: 'dispatches',
      payment: 'payments',
      expense: 'expenses',
      transfer: 'transfers',
      manager_bonus: 'manager_bonus',
    };
    await db.runAsync(
      `UPDATE ${tableMap[row.type]} SET archived_at=NULL, updated_at=datetime('now') WHERE id=?;`,
      [row.id],
    );
    load();
  };

  const handlePermanentDelete = async () => {
    if (!db || !deleteTarget) return;
    const tableMap: Record<EntryType, string> = {
      stock_purchase: 'stock_purchases',
      dispatch: 'dispatches',
      payment: 'payments',
      expense: 'expenses',
      transfer: 'transfers',
      manager_bonus: 'manager_bonus',
    };
    await db.runAsync(`DELETE FROM ${tableMap[deleteTarget.type]} WHERE id=?;`, [deleteTarget.id]);
    setDeleteTarget(null);
    load();
  };

  const handleArchive = async () => {
    if (!db || !deleteTarget) return;
    const tableMap: Record<EntryType, string> = {
      stock_purchase: 'stock_purchases',
      dispatch: 'dispatches',
      payment: 'payments',
      expense: 'expenses',
      transfer: 'transfers',
      manager_bonus: 'manager_bonus',
    };
    await db.runAsync(
      `UPDATE ${tableMap[deleteTarget.type]} SET archived_at=datetime('now'), updated_at=datetime('now') WHERE id=?;`,
      [deleteTarget.id],
    );
    setDeleteTarget(null);
    load();
  };

  const TYPE_EMOJI: Record<EntryType, string> = {
    stock_purchase: '📦',
    dispatch: '🃏',
    payment: '💵',
    expense: '📝',
    transfer: '💳',
    manager_bonus: '🎁',
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'archived'] as FilterMode[]).map((f) => (
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

      <ScrollView contentContainerStyle={styles.scroll}>
        {rows.length === 0 && (
          <Text style={styles.empty}>No entries.</Text>
        )}
        {rows.map((row) => (
          <View key={`${row.type}-${row.id}`} style={[styles.card, row.archived && styles.cardArchived]}>
            <View style={styles.cardMain}>
              <Text style={styles.emoji}>{TYPE_EMOJI[row.type]}</Text>
              <View style={styles.textCol}>
                <Text style={styles.title}>{row.title}</Text>
                <Text style={styles.subtitle}>{row.subtitle}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(row.timestamp)}</Text>
              </View>
              <View style={styles.actions}>
                {row.archived && (
                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleRestore(row)}
                  >
                    <Text style={styles.restoreText}>Restore</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setDeleteTarget({ id: row.id, type: row.type })}
                >
                  <Text>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

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
  filterRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colours.surface },
  filterTab: { flex: 1, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colours.background, alignItems: 'center' },
  filterTabActive: { backgroundColor: colours.primary },
  filterTabText: { ...typography.captionBold, color: colours.textSecondary },
  filterTabTextActive: { color: colours.textOnPrimary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { ...typography.body, color: colours.textMuted, textAlign: 'center', marginTop: spacing.xl },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, elevation: 1 },
  cardArchived: { opacity: 0.6, borderLeftWidth: 3, borderLeftColor: colours.archived },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  emoji: { fontSize: 24 },
  textCol: { flex: 1, gap: 2 },
  title: { ...typography.bodyBold, color: colours.textPrimary },
  subtitle: { ...typography.caption, color: colours.textSecondary },
  timestamp: { ...typography.caption, color: colours.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  restoreBtn: { backgroundColor: colours.primaryLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  restoreText: { ...typography.captionBold, color: colours.textOnPrimary },
  deleteBtn: { padding: spacing.xs },
});
