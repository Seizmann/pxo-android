import type { SQLiteDatabase } from 'expo-sqlite';
import type { Seller } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export async function listSellers(db: SQLiteDatabase, includeArchived = false): Promise<Seller[]> {
  const sql = includeArchived
    ? `SELECT * FROM sellers ORDER BY name;`
    : `SELECT * FROM sellers WHERE archived_at IS NULL ORDER BY name;`;
  return db.getAllAsync<Seller>(sql);
}

export async function getSeller(db: SQLiteDatabase, id: string): Promise<Seller | null> {
  return db.getFirstAsync<Seller>(`SELECT * FROM sellers WHERE id = ?;`, [id]);
}

export async function insertSeller(
  db: SQLiteDatabase,
  data: { name: string; note?: string },
): Promise<Seller> {
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO sellers (id, name, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
    [id, data.name, data.note ?? null, now, now],
  );
  return (await getSeller(db, id))!;
}

export async function updateSeller(
  db: SQLiteDatabase,
  id: string,
  data: { name: string; note?: string },
): Promise<void> {
  await db.runAsync(
    `UPDATE sellers SET name = ?, note = ?, updated_at = ? WHERE id = ?;`,
    [data.name, data.note ?? null, nowIso(), id],
  );
}

export async function archiveSeller(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE sellers SET archived_at = ?, updated_at = ? WHERE id = ?;`,
    [nowIso(), nowIso(), id],
  );
}

export async function deleteSeller(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM sellers WHERE id = ?;`, [id]);
}
