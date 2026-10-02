import { useCallback, useEffect, useState } from 'react';
import { walletBalance } from '@pxo/core';
import type { SQLiteDatabase } from 'expo-sqlite';
import { listWallets } from '../db/repos/wallets';
import { listStockPurchases, listStockPurchasePayments } from '../db/repos/stock-purchases';
import { listTransfers } from '../db/repos/transfers';
import { listAllExpenseWalletLinesForBalance } from '../db/repos/expenses';
import type { StockPaymentRow, PaymentWalletLineRow, ExpenseWalletLineRow, TransferRow } from '@pxo/core';

export interface WalletBalances {
  cash: number;
  bkash: number;
  nagad: number;
  total: number;
}

export function useWalletBalances(db: SQLiteDatabase | null): WalletBalances {
  const [balances, setBalances] = useState<WalletBalances>({ cash: 0, bkash: 0, nagad: 0, total: 0 });

  const refresh = useCallback(async () => {
    if (!db) return;

    const wallets = await listWallets(db);

    // Gather stock purchase payments (all, for balance — archived_at comes from parent purchase)
    const allPurchases = await listStockPurchases(db, 'all');
    const stockPayRows: StockPaymentRow[] = [];
    for (const p of allPurchases) {
      const lines = await listStockPurchasePayments(db, p.id);
      for (const l of lines) {
        stockPayRows.push({ wallet_id: l.wallet_id, amount: l.amount, archived_at: p.archived_at });
      }
    }

    // Payment wallet lines with payment archived_at
    const paymentLineRows: PaymentWalletLineRow[] = await db.getAllAsync(
      `SELECT pwl.wallet_id, pwl.amount, p.archived_at as payment_archived_at
       FROM payment_wallet_lines pwl JOIN payments p ON p.id = pwl.payment_id;`,
    );

    // Expense wallet lines with expense archived_at
    const expenseLineRows: ExpenseWalletLineRow[] = await listAllExpenseWalletLinesForBalance(db);

    // Transfers (all, including archived)
    const allTransfers = await listTransfers(db, 'all');
    const transferRows: TransferRow[] = allTransfers.map((t) => ({
      from_wallet_id: t.from_wallet_id,
      to_wallet_id: t.to_wallet_id,
      amount: t.amount,
      archived_at: t.archived_at,
    }));

    const result: WalletBalances = { cash: 0, bkash: 0, nagad: 0, total: 0 };

    for (const w of wallets) {
      const bal = walletBalance(
        { id: w.id, opening_balance: w.opening_balance },
        stockPayRows,
        paymentLineRows,
        expenseLineRows,
        transferRows,
      );
      if (w.name === 'Cash') result.cash = bal;
      else if (w.name === 'bKash') result.bkash = bal;
      else if (w.name === 'Nagad') result.nagad = bal;
    }
    result.total = result.cash + result.bkash + result.nagad;
    setBalances(result);
  }, [db]);

  useEffect(() => { refresh(); }, [refresh]);

  return balances;
}
