import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExpenseCategory } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export async function listExpenseCategories(
  db: SQLiteDatabase,
  includeArchived = false,
): Promise<ExpenseCategory[]> {
  const where = includeArchived ? '' : 'WHERE archived_at IS NULL';
  return db.getAllAsync<ExpenseCategory>(
    `SELECT * FROM expense_categories ${where} ORDER BY name;`,
  );
}

export async function getExpenseCategory(
  db: SQLiteDatabase,
  id: string,
): Promise<ExpenseCategory | null> {
  return db.getFirstAsync<ExpenseCategory>(
    `SELECT * FROM expense_categories WHERE id=?;`,
    [id],
  );
}

export async function insertExpenseCategory(
  db: SQLiteDatabase,
  name: string,
): Promise<ExpenseCategory> {
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO expense_categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);`,
    [id, name, now, now],
  );
  return (await getExpenseCategory(db, id))!;
}

export async function updateExpenseCategory(
  db: SQLiteDatabase,
  id: string,
  name: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE expense_categories SET name=?, updated_at=? WHERE id=?;`,
    [name, nowIso(), id],
  );
}

export async function archiveExpenseCategory(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE expense_categories SET archived_at=?, updated_at=? WHERE id=?;`,
    [now, now, id],
  );
}

export async function deleteExpenseCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM expense_categories WHERE id=?;`, [id]);
}
