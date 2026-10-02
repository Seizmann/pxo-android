/**
 * Backup/restore format for PXO.
 *
 * Backup JSON shape:
 * {
 *   app: "pxo",
 *   schemaVersion: 1,
 *   exportedAt: "<ISO 8601>",
 *   tables: { <tableName>: Row[] }
 * }
 *
 * PIN and recovery hash are NEVER included.
 */

export const CURRENT_SCHEMA_VERSION = 1;

export const BACKUP_TABLES = [
  'wallets',
  'sellers',
  'stock_purchases',
  'stock_purchase_payments',
  'dispatches',
  'packets',
  'payments',
  'payment_wallet_lines',
  'payment_allocations',
  'manager_bonus',
  'transfers',
  'expense_categories',
  'expenses',
  'expense_wallet_lines',
  'settings',
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

export interface BackupDoc {
  app: 'pxo';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTableName, Record<string, unknown>[]>;
}

/** Serialise a set of table snapshots into the backup JSON format. */
export function serializeBackup(
  tables: Record<BackupTableName, Record<string, unknown>[]>,
): BackupDoc {
  return {
    app: 'pxo',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate structure and schemaVersion of a parsed backup object. */
export function validateBackup(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, error: 'Not a JSON object' };
  }
  const doc = raw as Record<string, unknown>;

  if (doc.app !== 'pxo') {
    return { valid: false, error: 'Not a PXO backup (app field mismatch)' };
  }
  if (typeof doc.schemaVersion !== 'number') {
    return { valid: false, error: 'Missing schemaVersion' };
  }
  if (doc.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Backup schemaVersion ${doc.schemaVersion} is newer than app version ${CURRENT_SCHEMA_VERSION}`,
    };
  }
  if (typeof doc.tables !== 'object' || doc.tables === null) {
    return { valid: false, error: 'Missing tables object' };
  }
  for (const table of BACKUP_TABLES) {
    const t = (doc.tables as Record<string, unknown>)[table];
    if (!Array.isArray(t)) {
      return { valid: false, error: `Missing or invalid table: ${table}` };
    }
  }
  return { valid: true };
}

interface RowWithMeta {
  id?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
}

/**
 * Merge backup rows into local rows.
 * For each table, combine rows by id.
 * When the same id exists on both sides, keep the row with the newer updated_at.
 * Returns the merged table record set.
 */
export function mergeBackup(
  local: Record<BackupTableName, Record<string, unknown>[]>,
  backup: Record<BackupTableName, Record<string, unknown>[]>,
): Record<BackupTableName, Record<string, unknown>[]> {
  const result = {} as Record<BackupTableName, Record<string, unknown>[]>;

  for (const table of BACKUP_TABLES) {
    const localRows = local[table] ?? [];
    const backupRows = backup[table] ?? [];

    const merged = new Map<string, RowWithMeta>();

    for (const row of localRows) {
      const r = row as RowWithMeta;
      if (typeof r.id === 'string') merged.set(r.id, r);
    }

    for (const row of backupRows) {
      const r = row as RowWithMeta;
      if (typeof r.id !== 'string') {
        merged.set(String(Object.keys(merged).length), r);
        continue;
      }
      const existing = merged.get(r.id);
      if (!existing) {
        merged.set(r.id, r);
      } else {
        // Keep newer updated_at
        const existingTs = typeof existing.updated_at === 'string' ? existing.updated_at : '';
        const backupTs = typeof r.updated_at === 'string' ? r.updated_at : '';
        if (backupTs > existingTs) {
          merged.set(r.id, r);
        }
      }
    }

    result[table] = Array.from(merged.values()) as Record<string, unknown>[];
  }

  return result;
}
