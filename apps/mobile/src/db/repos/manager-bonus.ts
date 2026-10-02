import type { SQLiteDatabase } from 'expo-sqlite';
import type { ManagerBonus } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export async function listManagerBonus(
  db: SQLiteDatabase,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<ManagerBonus[]> {
  const where =
    filter === 'active'
      ? 'WHERE archived_at IS NULL'
      : filter === 'archived'
        ? 'WHERE archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<ManagerBonus>(
    `SELECT * FROM manager_bonus ${where} ORDER BY entry_date DESC, created_at DESC;`,
  );
}

export async function getManagerBonus(db: SQLiteDatabase, id: string): Promise<ManagerBonus | null> {
  return db.getFirstAsync<ManagerBonus>(`SELECT * FROM manager_bonus WHERE id=?;`, [id]);
}

export async function insertManagerBonus(
  db: SQLiteDatabase,
  data: { entry_date: string; cards: number; rate_at_entry: number; note?: string },
): Promise<ManagerBonus> {
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO manager_bonus (id, entry_date, cards, rate_at_entry, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [id, data.entry_date, data.cards, data.rate_at_entry, data.note ?? null, now, now],
  );
  return (await getManagerBonus(db, id))!;
}

export async function updateManagerBonus(
  db: SQLiteDatabase,
  id: string,
  data: { entry_date: string; cards: number; rate_at_entry: number; note?: string },
): Promise<void> {
  await db.runAsync(
    `UPDATE manager_bonus SET entry_date=?, cards=?, rate_at_entry=?, note=?, updated_at=? WHERE id=?;`,
    [data.entry_date, data.cards, data.rate_at_entry, data.note ?? null, nowIso(), id],
  );
}

export async function archiveManagerBonus(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE manager_bonus SET archived_at=?, updated_at=? WHERE id=?;`,
    [now, now, id],
  );
}

export async function restoreManagerBonus(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE manager_bonus SET archived_at=NULL, updated_at=? WHERE id=?;`,
    [nowIso(), id],
  );
}

export async function deleteManagerBonus(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM manager_bonus WHERE id=?;`, [id]);
}
