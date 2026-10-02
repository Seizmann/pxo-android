import type { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key=?;`,
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value;`,
    [key, value],
  );
}

export async function getAllSettings(
  db: SQLiteDatabase,
): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM settings;`,
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Convenience helpers for the two global rates (stored as integer poisha). */
export async function getSourceRate(db: SQLiteDatabase): Promise<number> {
  const v = await getSetting(db, 'source_rate');
  return v ? parseInt(v, 10) : 19000;
}

export async function getSellRate(db: SQLiteDatabase): Promise<number> {
  const v = await getSetting(db, 'sell_rate');
  return v ? parseInt(v, 10) : 30000;
}

export async function setSourceRate(db: SQLiteDatabase, paisa: number): Promise<void> {
  await setSetting(db, 'source_rate', String(paisa));
}

export async function setSellRate(db: SQLiteDatabase, paisa: number): Promise<void> {
  await setSetting(db, 'sell_rate', String(paisa));
}
