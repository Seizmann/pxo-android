/**
 * Wallet balance computation.
 *
 * Formula (all active rows only, i.e. archived_at IS NULL):
 *
 *   balance =
 *     opening_balance
 *     + Σ stock_purchase_payments.amount   (money out for stock — debits wallet)
 *       Wait: stock purchases are money OUT of the wallet.
 *     + Σ payment_wallet_lines.amount      (money IN from sellers)
 *     - Σ expense_wallet_lines.amount      (money OUT for expenses)
 *     + Σ transfers.amount  where to_wallet_id = wallet.id   (money IN)
 *     - Σ transfers.amount  where from_wallet_id = wallet.id (money OUT)
 *
 * Stock purchases debit the wallet (money paid to supplier):
 *     - Σ stock_purchase_payments.amount
 *
 * NOTE: transfers.charge is NOT subtracted here. The MFS→Cash charge is
 * captured solely via its linked Cash-out expense's expense_wallet_lines row.
 * Subtracting transfers.charge separately would double-count.
 */

export interface WalletInput {
  id: string;
  opening_balance: number;
}

export interface StockPaymentRow {
  wallet_id: string;
  amount: number;
  archived_at: string | null; // archived_at of parent stock_purchase
}

export interface PaymentWalletLineRow {
  wallet_id: string;
  amount: number;
  payment_archived_at: string | null;
}

export interface ExpenseWalletLineRow {
  wallet_id: string;
  amount: number;
  expense_archived_at: string | null;
}

export interface TransferRow {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  archived_at: string | null;
}

export function walletBalance(
  wallet: WalletInput,
  stockPayments: StockPaymentRow[],
  paymentLines: PaymentWalletLineRow[],
  expenseLines: ExpenseWalletLineRow[],
  transfers: TransferRow[],
): number {
  const id = wallet.id;

  const stockOut = stockPayments
    .filter((r) => r.wallet_id === id && r.archived_at === null)
    .reduce((s, r) => s + r.amount, 0);

  const receivedIn = paymentLines
    .filter((r) => r.wallet_id === id && r.payment_archived_at === null)
    .reduce((s, r) => s + r.amount, 0);

  const expenseOut = expenseLines
    .filter((r) => r.wallet_id === id && r.expense_archived_at === null)
    .reduce((s, r) => s + r.amount, 0);

  const transferIn = transfers
    .filter((r) => r.to_wallet_id === id && r.archived_at === null)
    .reduce((s, r) => s + r.amount, 0);

  const transferOut = transfers
    .filter((r) => r.from_wallet_id === id && r.archived_at === null)
    .reduce((s, r) => s + r.amount, 0);

  return wallet.opening_balance + receivedIn - stockOut - expenseOut + transferIn - transferOut;
}
