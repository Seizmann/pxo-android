/** TypeScript interfaces mirroring every DB table row. Money in poisha (integer). */

export interface Wallet {
  id: string;
  type: 'cash' | 'mfs';
  name: 'Cash' | 'bKash' | 'Nagad';
  opening_balance: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Seller {
  id: string;
  name: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface StockPurchase {
  id: string;
  entry_date: string;
  quantity: number;
  rate: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface StockPurchasePayment {
  id: string;
  purchase_id: string;
  wallet_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface Dispatch {
  id: string;
  seller_id: string;
  entry_date: string;
  sell_rate: number;
  sell_cards: number;
  bonus_cards: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Packet {
  id: string;
  dispatch_id: string;
  seq: number;
  cards: number;
  rate_override: number | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  seller_id: string;
  entry_date: string;
  discount_total: number;
  allocation_mode: 'auto' | 'manual' | 'hybrid';
  note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PaymentWalletLine {
  id: string;
  payment_id: string;
  wallet_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  packet_id: string;
  amount: number;
  discount: number;
  created_at: string;
  updated_at: string;
}

export interface ManagerBonus {
  id: string;
  entry_date: string;
  cards: number;
  rate_at_entry: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Transfer {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  charge: number;
  expense_id: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Expense {
  id: string;
  entry_date: string;
  category_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ExpenseWalletLine {
  id: string;
  expense_id: string;
  wallet_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
