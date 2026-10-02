import type { SQLiteDatabase } from 'expo-sqlite';
import type { Payment, PaymentWalletLine, PaymentAllocation } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export interface WalletLineInput {
  wallet_id: string;
  amount: number;
}

export interface AllocationInput {
  packet_id: string;
  amount: number;
  discount: number;
}

export async function listPayments(
  db: SQLiteDatabase,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<Payment[]> {
  const where =
    filter === 'active'
      ? 'WHERE archived_at IS NULL'
      : filter === 'archived'
        ? 'WHERE archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<Payment>(
    `SELECT * FROM payments ${where} ORDER BY entry_date DESC, created_at DESC;`,
  );
}

export async function listPaymentsBySeller(
  db: SQLiteDatabase,
  sellerId: string,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<Payment[]> {
  const extra =
    filter === 'active'
      ? 'AND archived_at IS NULL'
      : filter === 'archived'
        ? 'AND archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<Payment>(
    `SELECT * FROM payments WHERE seller_id=? ${extra} ORDER BY entry_date DESC, created_at DESC;`,
    [sellerId],
  );
}

export async function getPayment(db: SQLiteDatabase, id: string): Promise<Payment | null> {
  return db.getFirstAsync<Payment>(`SELECT * FROM payments WHERE id=?;`, [id]);
}

export async function insertPayment(
  db: SQLiteDatabase,
  data: {
    seller_id: string;
    entry_date: string;
    discount_total: number;
    allocation_mode: 'auto' | 'manual' | 'hybrid';
    note?: string;
  },
  walletLines: WalletLineInput[],
  allocations: AllocationInput[],
): Promise<Payment> {
  const id = newId();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO payments (id, seller_id, entry_date, discount_total, allocation_mode, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, data.seller_id, data.entry_date, data.discount_total, data.allocation_mode, data.note ?? null, now, now],
    );
    for (const l of walletLines) {
      await db.runAsync(
        `INSERT INTO payment_wallet_lines (id, payment_id, wallet_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [newId(), id, l.wallet_id, l.amount, now, now],
      );
    }
    for (const a of allocations) {
      await db.runAsync(
        `INSERT INTO payment_allocations (id, payment_id, packet_id, amount, discount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [newId(), id, a.packet_id, a.amount, a.discount, now, now],
      );
    }
  });
  return (await getPayment(db, id))!;
}

export async function updatePayment(
  db: SQLiteDatabase,
  id: string,
  data: {
    seller_id: string;
    entry_date: string;
    discount_total: number;
    allocation_mode: 'auto' | 'manual' | 'hybrid';
    note?: string;
  },
  walletLines: WalletLineInput[],
  allocations: AllocationInput[],
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE payments SET seller_id=?, entry_date=?, discount_total=?, allocation_mode=?, note=?, updated_at=? WHERE id=?;`,
      [data.seller_id, data.entry_date, data.discount_total, data.allocation_mode, data.note ?? null, now, id],
    );
    await db.runAsync(`DELETE FROM payment_wallet_lines WHERE payment_id=?;`, [id]);
    await db.runAsync(`DELETE FROM payment_allocations WHERE payment_id=?;`, [id]);
    for (const l of walletLines) {
      await db.runAsync(
        `INSERT INTO payment_wallet_lines (id, payment_id, wallet_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [newId(), id, l.wallet_id, l.amount, now, now],
      );
    }
    for (const a of allocations) {
      await db.runAsync(
        `INSERT INTO payment_allocations (id, payment_id, packet_id, amount, discount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [newId(), id, a.packet_id, a.amount, a.discount, now, now],
      );
    }
  });
}

export async function archivePayment(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(`UPDATE payments SET archived_at=?, updated_at=? WHERE id=?;`, [now, now, id]);
}

export async function restorePayment(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE payments SET archived_at=NULL, updated_at=? WHERE id=?;`, [nowIso(), id]);
}

export async function deletePayment(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM payments WHERE id=?;`, [id]);
}

export async function listPaymentWalletLines(
  db: SQLiteDatabase,
  paymentId: string,
): Promise<PaymentWalletLine[]> {
  return db.getAllAsync<PaymentWalletLine>(
    `SELECT * FROM payment_wallet_lines WHERE payment_id=?;`,
    [paymentId],
  );
}

export async function listPaymentAllocations(
  db: SQLiteDatabase,
  paymentId: string,
): Promise<PaymentAllocation[]> {
  return db.getAllAsync<PaymentAllocation>(
    `SELECT * FROM payment_allocations WHERE payment_id=?;`,
    [paymentId],
  );
}

export async function listAllocationsForPackets(
  db: SQLiteDatabase,
  packetIds: string[],
): Promise<PaymentAllocation[]> {
  if (packetIds.length === 0) return [];
  const ph = packetIds.map(() => '?').join(',');
  return db.getAllAsync<PaymentAllocation>(
    `SELECT pa.* FROM payment_allocations pa WHERE pa.packet_id IN (${ph});`,
    packetIds,
  );
}
