import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { formatTaka, packetDue, bonusValue } from '@pxo/core';
import type { PacketRow, DispatchForDue, AllocationRow } from '@pxo/core';
import { useDb } from '../../src/hooks/useDb';
import { getSeller } from '../../src/db/repos/sellers';
import { listDispatchesBySeller, listPacketsByDispatches } from '../../src/db/repos/dispatches';
import { listPaymentsBySeller, listPaymentWalletLines, listAllocationsForPackets } from '../../src/db/repos/payments';
import { SummaryCard } from '../../src/components/SummaryCard';
import { StatusBadge } from '../../src/components/StatusBadge';
import { colours, spacing, typography, radius } from '../../src/theme';
import { formatEntryDate } from '../../src/utils/dateFormat';

interface PacketSummary {
  id: string;
  label: string;
  amount: number;
  due: number;
  archived: boolean;
}

interface PaymentSummary {
  id: string;
  date: string;
  total: number;
  discount: number;
}

export default function SellerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();

  const [sellerName, setSellerName] = useState('');
  const [packets, setPackets] = useState<PacketSummary[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentSummary[]>([]);
  const [totals, setTotals] = useState({
    cards: 0, charged: 0, paid: 0, discount: 0, due: 0, bonusCards: 0, bonusValue: 0,
  });

  const load = useCallback(async () => {
    if (!db || !id) return;

    const seller = await getSeller(db, id);
    if (!seller) return;
    setSellerName(seller.name);

    // Dispatches and packets
    const dispatches = await listDispatchesBySeller(db, id, 'all');
    const allPackets = await listPacketsByDispatches(db, dispatches.map((d) => d.id));
    const dispMap = new Map(dispatches.map((d) => [d.id, d]));

    // Allocations
    const allAllocs = await listAllocationsForPackets(db, allPackets.map((p) => p.id));
    const allocsWithMeta: AllocationRow[] = await Promise.all(
      allAllocs.map(async (a) => {
        const row = await db.getFirstAsync<{ archived_at: string | null }>(
          `SELECT archived_at FROM payments WHERE id=?;`, [a.payment_id],
        );
        return { ...a, payment_archived_at: row?.archived_at ?? null };
      }),
    );

    const pkSummaries: PacketSummary[] = allPackets.map((pkt) => {
      const dispatch = dispMap.get(pkt.dispatch_id)!;
      const rate = pkt.rate_override ?? dispatch.sell_rate;
      const amount = pkt.cards * rate;
      const due = packetDue(
        { id: pkt.id, dispatch_id: pkt.dispatch_id, cards: pkt.cards, rate_override: pkt.rate_override },
        { id: dispatch.id, sell_rate: dispatch.sell_rate, archived_at: dispatch.archived_at },
        allocsWithMeta,
      );
      return {
        id: pkt.id,
        label: `Pkt ${pkt.seq} — ${pkt.cards} cards @ ৳${formatTaka(rate)}`,
        amount,
        due,
        archived: dispatch.archived_at !== null,
      };
    });
    setPackets(pkSummaries);

    // Payments with wallet totals
    const payments = await listPaymentsBySeller(db, id, 'all');
    const pSummaries: PaymentSummary[] = await Promise.all(
      payments.map(async (p) => {
        const wLines = await listPaymentWalletLines(db, p.id);
        const total = wLines.reduce((s, l) => s + l.amount, 0);
        return { id: p.id, date: p.entry_date, total, discount: p.discount_total };
      }),
    );
    setPaymentHistory(pSummaries);

    // Totals
    const totalCards = dispatches
      .filter((d) => d.archived_at === null)
      .reduce((s, d) => s + d.sell_cards, 0);
    const totalCharged = pkSummaries
      .filter((p) => !p.archived)
      .reduce((s, p) => s + p.amount, 0);
    const totalPaid = pSummaries.reduce((s, p) => s + p.total, 0);
    const totalDiscount = pSummaries.reduce((s, p) => s + p.discount, 0);
    const totalDue = pkSummaries.filter((p) => !p.archived).reduce((s, p) => s + Math.max(0, p.due), 0);
    const bonusCards = dispatches.filter((d) => d.archived_at === null).reduce((s, d) => s + d.bonus_cards, 0);
    const bVal = dispatches
      .filter((d) => d.archived_at === null)
      .reduce((s, d) => s + bonusValue(d.bonus_cards, d.sell_rate), 0);

    setTotals({ cards: totalCards, charged: totalCharged, paid: totalPaid, discount: totalDiscount, due: totalDue, bonusCards, bonusValue: bVal });
  }, [db, id]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{sellerName}</Text>

        {/* Totals */}
        <View style={styles.row}>
          <View style={styles.flex1}><SummaryCard label="Cards Given" value={String(totals.cards)} /></View>
          <View style={styles.flex1}><SummaryCard label="Charged" value={`৳${formatTaka(totals.charged)}`} /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex1}><SummaryCard label="Paid" value={`৳${formatTaka(totals.paid)}`} accent={colours.success} /></View>
          <View style={styles.flex1}><SummaryCard label="Discount" value={`৳${formatTaka(totals.discount)}`} /></View>
        </View>
        <SummaryCard
          label="Total Due"
          value={`৳${formatTaka(totals.due)}`}
          accent={totals.due > 0 ? colours.warning : colours.success}
        />

        {/* Bonus (info only) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bonus (info only — not in due)</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.flex1}><SummaryCard label="Bonus Cards" value={String(totals.bonusCards)} /></View>
          <View style={styles.flex1}><SummaryCard label="Bonus Value" value={`৳${formatTaka(totals.bonusValue)}`} /></View>
        </View>

        {/* Packets */}
        <Text style={styles.sectionTitle}>Packets</Text>
        {packets.map((p) => (
          <View key={p.id} style={[styles.card, p.archived && styles.cardArchived]}>
            <View style={styles.packetRow}>
              <Text style={styles.packetLabel}>{p.label}</Text>
              <StatusBadge status={p.archived ? 'archived' : p.due <= 0 ? 'paid' : 'partial'} />
            </View>
            <View style={styles.packetRow}>
              <Text style={styles.metaText}>Amount: ৳{formatTaka(p.amount)}</Text>
              <Text style={[styles.metaText, p.due > 0 && styles.dueText]}>
                Due: ৳{formatTaka(Math.max(0, p.due))}
              </Text>
            </View>
          </View>
        ))}

        {/* Payment history */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paymentHistory.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.packetRow}>
              <Text style={styles.packetLabel}>{formatEntryDate(p.date)}</Text>
              <Text style={styles.amountText}>৳{formatTaka(p.total)}</Text>
            </View>
            {p.discount > 0 && (
              <Text style={styles.metaText}>Discount: ৳{formatTaka(p.discount)}</Text>
            )}
          </View>
        ))}

        {paymentHistory.length === 0 && (
          <Text style={styles.empty}>No payments yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  title: { ...typography.h2, color: colours.textPrimary },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  sectionHeader: { marginTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colours.textPrimary, marginTop: spacing.sm },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, elevation: 1, gap: spacing.xs },
  cardArchived: { opacity: 0.6 },
  packetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packetLabel: { ...typography.bodyBold, color: colours.textPrimary, flex: 1 },
  metaText: { ...typography.caption, color: colours.textSecondary },
  dueText: { color: colours.warning },
  amountText: { ...typography.bodyBold, color: colours.primary },
  empty: { ...typography.body, color: colours.textMuted, textAlign: 'center' },
});
