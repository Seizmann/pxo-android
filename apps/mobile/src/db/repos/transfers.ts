import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transfer } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export async function listTransfers(
  db: SQLiteDatabase,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<Transfer[]> {
  const where =
    filter === 'active'
      ? 'WHERE archived_at IS NULL'
      : filter === 'archived'
        ? 'WHERE archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<Transfer>(
    `SELECT * FROM transfers ${where} ORDER BY entry_date DESC, created_at DESC;`,
  );
}

export async function getTransfer(db: SQLiteDatabase, id: string): Promise<Transfer | null> {
  return db.getFirstAsync<Transfer>(`SELECT * FROM transfers WHERE id=?;`, [id]);
}

export async function insertTransfer(
  db: SQLiteDatabase,
  data: {
    from_wallet_id: string;
    to_wallet_id: string;
    amount: number;
    charge: number;
    expense_id?: string;
    entry_date: string;
  },
): Promise<Transfer> {
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO transfers (id, from_wallet_id, to_wallet_id, amount, charge, expense_id, entry_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, data.from_wallet_id, data.to_wallet_id, data.amount, data.charge, data.expense_id ?? null, data.entry_date, now, now],
  );
  return (await getTransfer(db, id))!;
}

export async function updateTransfer(
  db: SQLiteDatabase,
  id: string,
  data: {
    from_wallet_id: string;
    to_wallet_id: string;
    amount: number;
    charge: number;
    expense_id?: string;
    entry_date: string;
  },
): Promise<void> {
  await db.runAsync(
    `UPDATE transfers SET from_wallet_id=?, to_wallet_id=?, amount=?, charge=?, expense_id=?, entry_date=?, updated_at=? WHERE id=?;`,
    [data.from_wallet_id, data.to_wallet_id, data.amount, data.charge, data.expense_id ?? null, data.entry_date, nowIso(), id],
  );
}

export async function archiveTransfer(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE transfers SET archived_at=?, updated_at=? WHERE id=?;`,
    [now, now, id],
  );
}

export async function restoreTransfer(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE transfers SET archived_at=NULL, updated_at=? WHERE id=?;`,
    [nowIso(), id],
  );
}

export async function deleteTransfer(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM transfers WHERE id=?;`, [id]);
}
