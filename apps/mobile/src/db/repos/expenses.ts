import type { SQLiteDatabase } from 'expo-sqlite';
import type { Expense, ExpenseWalletLine } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export interface ExpenseWalletLineInput {
  wallet_id: string;
  amount: number;
}

export async function listExpenses(
  db: SQLiteDatabase,
  filter: 'active' | 'archived' | 'all' = 'active',
  categoryId?: string,
): Promise<Expense[]> {
  const conditions: string[] = [];
  const params: (string | null)[] = [];

  if (filter === 'active') conditions.push('archived_at IS NULL');
  else if (filter === 'archived') conditions.push('archived_at IS NOT NULL');

  if (categoryId) {
    conditions.push('category_id = ?');
    params.push(categoryId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<Expense>(
    `SELECT * FROM expenses ${where} ORDER BY entry_date DESC, created_at DESC;`,
    params,
  );
}

export async function getExpense(db: SQLiteDatabase, id: string): Promise<Expense | null> {
  return db.getFirstAsync<Expense>(`SELECT * FROM expenses WHERE id=?;`, [id]);
}

export async function insertExpense(
  db: SQLiteDatabase,
  data: { entry_date: string; category_id: string; note?: string },
  walletLines: ExpenseWalletLineInput[],
): Promise<Expense> {
  const id = newId();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO expenses (id, entry_date, category_id, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, data.entry_date, data.category_id, data.note ?? null, now, now],
    );
    for (const l of walletLines) {
      await db.runAsync(
        `INSERT INTO expense_wallet_lines (id, expense_id, wallet_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [newId(), id, l.wallet_id, l.amount, now, now],
      );
    }
  });
  return (await getExpense(db, id))!;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: string,
  data: { entry_date: string; category_id: string; note?: string },
  walletLines: ExpenseWalletLineInput[],
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE expenses SET entry_date=?, category_id=?, note=?, updated_at=? WHERE id=?;`,
      [data.entry_date, data.category_id, data.note ?? null, now, id],
    );
    await db.runAsync(`DELETE FROM expense_wallet_lines WHERE expense_id=?;`, [id]);
    for (const l of walletLines) {
      await db.runAsync(
        `INSERT INTO expense_wallet_lines (id, expense_id, wallet_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [newId(), id, l.wallet_id, l.amount, now, now],
      );
    }
  });
}

export async function archiveExpense(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE expenses SET archived_at=?, updated_at=? WHERE id=?;`,
    [now, now, id],
  );
}

export async function restoreExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE expenses SET archived_at=NULL, updated_at=? WHERE id=?;`,
    [nowIso(), id],
  );
}

export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM expenses WHERE id=?;`, [id]);
}

export async function listExpenseWalletLines(
  db: SQLiteDatabase,
  expenseId: string,
): Promise<ExpenseWalletLine[]> {
  return db.getAllAsync<ExpenseWalletLine>(
    `SELECT * FROM expense_wallet_lines WHERE expense_id=?;`,
    [expenseId],
  );
}

/** All expense wallet lines for balance computation — joins archived_at from parent expense. */
export async function listAllExpenseWalletLinesForBalance(db: SQLiteDatabase): Promise<
  (ExpenseWalletLine & { expense_archived_at: string | null })[]
> {
  return db.getAllAsync<ExpenseWalletLine & { expense_archived_at: string | null }>(
    `SELECT ewl.*, e.archived_at as expense_archived_at
     FROM expense_wallet_lines ewl
     JOIN expenses e ON e.id = ewl.expense_id;`,
  );
}
