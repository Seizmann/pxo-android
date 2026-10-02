import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatTaka } from '@pxo/core';
import { useDb } from '../src/hooks/useDb';
import { useStock } from '../src/hooks/useStock';
import { useWalletBalances } from '../src/hooks/useWalletBalances';
import { useSellerDue } from '../src/hooks/useSellerDue';
import { SummaryCard } from '../src/components/SummaryCard';
import { colours, spacing, typography, radius } from '../src/theme';
import { isToday, formatTimestamp } from '../src/utils/dateFormat';

interface TodaySummary {
  cardsGiven: number;
  paymentsReceived: number;
  expensesTotal: number;
}

export default function HomeScreen() {
  const db = useDb();
  const stock = useStock(db);
  const balances = useWalletBalances(db);
  const totalDue = useSellerDue(db);
  const [today, setToday] = useState<TodaySummary>({ cardsGiven: 0, paymentsReceived: 0, expensesTotal: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadToday = useCallback(async () => {
    if (!db) return;
    const todayDate = new Date().toISOString().slice(0, 10);

    const dispatches = await db.getAllAsync<{ sell_cards: number; bonus_cards: number }>(
      `SELECT sell_cards, bonus_cards FROM dispatches WHERE entry_date=? AND archived_at IS NULL;`,
      [todayDate],
    );
    const cardsGiven = dispatches.reduce((s, d) => s + d.sell_cards + d.bonus_cards, 0);

    const payLines = await db.getAllAsync<{ amount: number }>(
      `SELECT pwl.amount FROM payment_wallet_lines pwl
       JOIN payments p ON p.id=pwl.payment_id
       WHERE p.entry_date=? AND p.archived_at IS NULL;`,
      [todayDate],
    );
    const paymentsReceived = payLines.reduce((s, l) => s + l.amount, 0);

    const expLines = await db.getAllAsync<{ amount: number }>(
      `SELECT ewl.amount FROM expense_wallet_lines ewl
       JOIN expenses e ON e.id=ewl.expense_id
       WHERE e.entry_date=? AND e.archived_at IS NULL;`,
      [todayDate],
    );
    const expensesTotal = expLines.reduce((s, l) => s + l.amount, 0);

    setToday({ cardsGiven, paymentsReceived, expensesTotal });
  }, [db]);

  useEffect(() => { loadToday(); }, [loadToday]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadToday();
    setRefreshing(false);
  }, [loadToday]);

  const navItems: { label: string; route: string; emoji: string }[] = [
    { label: 'Buy Stock', route: '/stock', emoji: '📦' },
    { label: 'Give Cards', route: '/give', emoji: '🃏' },
    { label: 'Payment', route: '/payment', emoji: '💵' },
    { label: 'Sellers', route: '/sellers', emoji: '👥' },
    { label: 'Wallets', route: '/wallets', emoji: '💳' },
    { label: 'Expenses', route: '/expenses', emoji: '📝' },
    { label: 'Bonus', route: '/bonus', emoji: '🎁' },
    { label: 'History', route: '/history', emoji: '📋' },
    { label: 'Settings', route: '/settings', emoji: '⚙️' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>PXO</Text>
          <Text style={styles.headerSub}>Manager Dashboard</Text>
        </View>

        {/* Stock card */}
        <SummaryCard
          label="Cards in Stock"
          value={String(stock)}
          sub="Active inventory"
          accent={colours.primaryLight}
        />

        {/* Wallet balances */}
        <Text style={styles.sectionTitle}>Wallets</Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <SummaryCard label="Cash" value={`৳${formatTaka(balances.cash)}`} accent={colours.cash} />
          </View>
          <View style={styles.flex1}>
            <SummaryCard label="bKash" value={`৳${formatTaka(balances.bkash)}`} accent={colours.bkash} />
          </View>
          <View style={styles.flex1}>
            <SummaryCard label="Nagad" value={`৳${formatTaka(balances.nagad)}`} accent={colours.nagad} />
          </View>
        </View>
        <SummaryCard
          label="Total Balance"
          value={`৳${formatTaka(balances.total)}`}
          accent={colours.primary}
        />

        {/* Seller due */}
        <SummaryCard
          label="Total Seller Due"
          value={`৳${formatTaka(totalDue)}`}
          accent={totalDue > 0 ? colours.warning : colours.success}
        />

        {/* Today's activity */}
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <SummaryCard label="Cards Given" value={String(today.cardsGiven)} />
          </View>
          <View style={styles.flex1}>
            <SummaryCard label="Received" value={`৳${formatTaka(today.paymentsReceived)}`} />
          </View>
          <View style={styles.flex1}>
            <SummaryCard label="Expenses" value={`৳${formatTaka(today.expensesTotal)}`} />
          </View>
        </View>

        {/* Nav grid */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.navGrid}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.navBtn}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.navEmoji}>{item.emoji}</Text>
              <Text style={styles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  header: {
    backgroundColor: colours.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  appName: { ...typography.h1, color: colours.textOnPrimary },
  headerSub: { ...typography.body, color: colours.textOnPrimary, opacity: 0.8 },
  sectionTitle: { ...typography.h3, color: colours.textPrimary, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  navBtn: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colours.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    gap: spacing.xs,
  },
  navEmoji: { fontSize: 28 },
  navLabel: { ...typography.caption, color: colours.textPrimary, textAlign: 'center' },
});
