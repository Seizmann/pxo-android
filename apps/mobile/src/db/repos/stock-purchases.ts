import type { SQLiteDatabase } from 'expo-sqlite';
import type { StockPurchase, StockPurchasePayment } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export async function listStockPurchases(
  db: SQLiteDatabase,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<StockPurchase[]> {
  const where =
    filter === 'active'
      ? 'WHERE archived_at IS NULL'
      : filter === 'archived'
        ? 'WHERE archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<StockPurchase>(
    `SELECT * FROM stock_purchases ${where} ORDER BY entry_date DESC, created_at DESC;`,
  );
}

export async function getStockPurchase(
  db: SQLiteDatabase,
  id: string,
): Promise<StockPurchase | null> {
  return db.getFirstAsync<StockPurchase>(`SELECT * FROM stock_purchases WHERE id = ?;`, [id]);
}

export async function insertStockPurchase(
  db: SQLiteDatabase,
  data: { entry_date: string; quantity: number; rate: number; note?: string },
  payments: { wallet_id: string; amount: number }[],
): Promise<StockPurchase> {
  const id = newId();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO stock_purchases (id, entry_date, quantity, rate, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, data.entry_date, data.quantity, data.rate, data.note ?? null, now, now],
    );
    for (const p of payments) {
      await db.runAsync(
        `INSERT INTO stock_purchase_payments (id, purchase_id, wallet_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [newId(), id, p.wallet_id, p.amount, now, now],
      );
    }
  });
  return (await getStockPurchase(db, id))!;
}

export async function updateStockPurchase(
  db: SQLiteDatabase,
  id: string,
  data: { entry_date: string; quantity: number; rate: number; note?: string },
  payments: { wallet_id: string; amount: number }[],
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE stock_purchases SET entry_date=?, quantity=?, rate=?, note=?, updated_at=? WHERE id=?;`,
      [data.entry_date, data.quantity, data.rate, data.note ?? null, now, id],
    );
    await db.runAsync(`DELETE FROM stock_purchase_payments WHERE purchase_id=?;`, [id]);
    for (const p of payments) {
      await db.runAsync(
        `INSERT INTO stock_purchase_payments (id, purchase_id, wallet_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [newId(), id, p.wallet_id, p.amount, now, now],
      );
    }
  });
}

export async function archiveStockPurchase(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE stock_purchases SET archived_at=?, updated_at=? WHERE id=?;`,
    [now, now, id],
  );
}

export async function restoreStockPurchase(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE stock_purchases SET archived_at=NULL, updated_at=? WHERE id=?;`,
    [nowIso(), id],
  );
}

export async function deleteStockPurchase(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM stock_purchases WHERE id=?;`, [id]);
}

export async function listStockPurchasePayments(
  db: SQLiteDatabase,
  purchaseId: string,
): Promise<StockPurchasePayment[]> {
  return db.getAllAsync<StockPurchasePayment>(
    `SELECT * FROM stock_purchase_payments WHERE purchase_id=?;`,
    [purchaseId],
  );
}
