import { describe, it, expect } from 'vitest';
import { walletBalance } from '../src/balance';
import type {
  WalletInput,
  StockPaymentRow,
  PaymentWalletLineRow,
  ExpenseWalletLineRow,
  TransferRow,
} from '../src/balance';

const wallet: WalletInput = { id: 'w1', opening_balance: 100_000 }; // 1000 taka

describe('walletBalance', () => {
  it('returns opening_balance when no entries', () => {
    expect(walletBalance(wallet, [], [], [], [])).toBe(100_000);
  });

  it('adds payment_wallet_lines (money received from sellers)', () => {
    const lines: PaymentWalletLineRow[] = [
      { wallet_id: 'w1', amount: 50_000, payment_archived_at: null },
    ];
    expect(walletBalance(wallet, [], lines, [], [])).toBe(150_000);
  });

  it('subtracts stock_purchase_payments (money paid to supplier)', () => {
    const stockPay: StockPaymentRow[] = [
      { wallet_id: 'w1', amount: 30_000, archived_at: null },
    ];
    expect(walletBalance(wallet, stockPay, [], [], [])).toBe(70_000);
  });

  it('subtracts expense_wallet_lines', () => {
    const expLines: ExpenseWalletLineRow[] = [
      { wallet_id: 'w1', amount: 10_000, expense_archived_at: null },
    ];
    expect(walletBalance(wallet, [], [], expLines, [])).toBe(90_000);
  });

  it('adds transfer in, subtracts transfer out', () => {
    const transfers: TransferRow[] = [
      { from_wallet_id: 'w2', to_wallet_id: 'w1', amount: 20_000, archived_at: null },
      { from_wallet_id: 'w1', to_wallet_id: 'w2', amount: 5_000, archived_at: null },
    ];
    expect(walletBalance(wallet, [], [], [], transfers)).toBe(100_000 + 20_000 - 5_000);
  });

  it('MFS→Cash: charge is counted via expense_wallet_line, NOT via transfers.charge', () => {
    // Scenario: transfer 5000 poisha from MFS (w_mfs) to Cash (w_cash)
    // with charge of 100 poisha.
    // The transfer row: from=w_mfs, to=w_cash, amount=5000, charge=100
    // A Cash-out expense wallet line: wallet_id=w_mfs, amount=100
    //
    // Expected MFS balance: opening - 5000 (transfer out) - 100 (expense line) = opening - 5100
    // Expected Cash balance: opening + 5000 (transfer in)

    const mfsWallet: WalletInput = { id: 'w_mfs', opening_balance: 200_000 };
    const cashWallet: WalletInput = { id: 'w_cash', opening_balance: 50_000 };

    const transfers: TransferRow[] = [
      { from_wallet_id: 'w_mfs', to_wallet_id: 'w_cash', amount: 5_000, archived_at: null },
    ];
    // The Cash-out expense wallet line on MFS wallet (charge = 100):
    const expenseLines: ExpenseWalletLineRow[] = [
      { wallet_id: 'w_mfs', amount: 100, expense_archived_at: null },
    ];

    const mfsBalance = walletBalance(mfsWallet, [], [], expenseLines, transfers);
    const cashBalance = walletBalance(cashWallet, [], [], [], transfers);

    expect(mfsBalance).toBe(200_000 - 5_000 - 100); // 194_900
    expect(cashBalance).toBe(50_000 + 5_000);        // 55_000
  });

  it('ignores archived stock payments', () => {
    const stockPay: StockPaymentRow[] = [
      { wallet_id: 'w1', amount: 30_000, archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(walletBalance(wallet, stockPay, [], [], [])).toBe(100_000);
  });

  it('ignores archived payment lines', () => {
    const lines: PaymentWalletLineRow[] = [
      { wallet_id: 'w1', amount: 50_000, payment_archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(walletBalance(wallet, [], lines, [], [])).toBe(100_000);
  });

  it('ignores archived expense lines', () => {
    const expLines: ExpenseWalletLineRow[] = [
      { wallet_id: 'w1', amount: 10_000, expense_archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(walletBalance(wallet, [], [], expLines, [])).toBe(100_000);
  });

  it('ignores archived transfers', () => {
    const transfers: TransferRow[] = [
      { from_wallet_id: 'w2', to_wallet_id: 'w1', amount: 20_000, archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(walletBalance(wallet, [], [], [], transfers)).toBe(100_000);
  });

  it('ignores rows for other wallet ids', () => {
    const lines: PaymentWalletLineRow[] = [
      { wallet_id: 'w_other', amount: 99_999, payment_archived_at: null },
    ];
    expect(walletBalance(wallet, [], lines, [], [])).toBe(100_000);
  });
});
