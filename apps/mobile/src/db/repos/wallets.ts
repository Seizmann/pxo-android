import type { SQLiteDatabase } from 'expo-sqlite';
import type { Wallet } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export async function listWallets(db: SQLiteDatabase): Promise<Wallet[]> {
  return db.getAllAsync<Wallet>(`SELECT * FROM wallets WHERE archived_at IS NULL ORDER BY name;`);
}

export async function getWallet(db: SQLiteDatabase, id: string): Promise<Wallet | null> {
  return db.getFirstAsync<Wallet>(`SELECT * FROM wallets WHERE id = ?;`, [id]);
}

export async function updateOpeningBalance(
  db: SQLiteDatabase,
  id: string,
  opening_balance: number,
): Promise<void> {
  await db.runAsync(
    `UPDATE wallets SET opening_balance = ?, updated_at = ? WHERE id = ?;`,
    [opening_balance, nowIso(), id],
  );
}
