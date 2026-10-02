import type * as SQLite from 'expo-sqlite';

const MIGRATIONS: string[] = [
  // 0001 — initial schema
  `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('cash','mfs')),
    name TEXT NOT NULL,
    opening_balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sellers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_purchases (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    rate INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_purchase_payments (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES stock_purchases(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dispatches (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL REFERENCES sellers(id),
    entry_date TEXT NOT NULL,
    sell_rate INTEGER NOT NULL,
    sell_cards INTEGER NOT NULL DEFAULT 0,
    bonus_cards INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS packets (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    cards INTEGER NOT NULL,
    rate_override INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL REFERENCES sellers(id),
    entry_date TEXT NOT NULL,
    discount_total INTEGER NOT NULL DEFAULT 0,
    allocation_mode TEXT NOT NULL CHECK(allocation_mode IN ('auto','manual','hybrid')),
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_wallet_lines (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_allocations (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    packet_id TEXT NOT NULL REFERENCES packets(id),
    amount INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS manager_bonus (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    cards INTEGER NOT NULL,
    rate_at_entry INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES expense_categories(id),
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS expense_wallet_lines (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    from_wallet_id TEXT NOT NULL REFERENCES wallets(id),
    to_wallet_id TEXT NOT NULL REFERENCES wallets(id),
    amount INTEGER NOT NULL,
    charge INTEGER NOT NULL DEFAULT 0,
    expense_id TEXT REFERENCES expenses(id),
    entry_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

const SEED_SQL = `
  INSERT OR IGNORE INTO wallets (id, type, name, opening_balance, created_at, updated_at)
  VALUES
    ('wallet-cash',  'cash', 'Cash',  0, datetime('now'), datetime('now')),
    ('wallet-bkash', 'mfs',  'bKash', 0, datetime('now'), datetime('now')),
    ('wallet-nagad', 'mfs',  'Nagad', 0, datetime('now'), datetime('now'));

  INSERT OR IGNORE INTO expense_categories (id, name, created_at, updated_at)
  VALUES
    ('cat-cashout',   'Cash-out',   datetime('now'), datetime('now')),
    ('cat-transport', 'Transport',  datetime('now'), datetime('now')),
    ('cat-packaging', 'Packaging',  datetime('now'), datetime('now')),
    ('cat-other',     'Other',      datetime('now'), datetime('now'));

  INSERT OR IGNORE INTO settings (key, value)
  VALUES
    ('source_rate', '19000'),
    ('sell_rate',   '30000');
`;

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure the migrations table exists
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);`,
  );

  const row = await db.getFirstAsync<{ max_version: number | null }>(
    `SELECT MAX(version) as max_version FROM schema_migrations;`,
  );
  const currentVersion = row?.max_version ?? 0;

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]!);
      if (i === 0) {
        // Run seed after first migration
        await db.execAsync(SEED_SQL);
      }
      await db.runAsync(
        `INSERT INTO schema_migrations (version) VALUES (?);`,
        [i + 1],
      );
    });
  }
}
