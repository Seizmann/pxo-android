import { describe, it, expect } from 'vitest';
import {
  serializeBackup,
  validateBackup,
  mergeBackup,
  BACKUP_TABLES,
  CURRENT_SCHEMA_VERSION,
} from '../src/backup-format';
import type { BackupDoc, BackupTableName } from '../src/backup-format';

function emptyTables(): Record<BackupTableName, Record<string, unknown>[]> {
  return Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as Record<
    BackupTableName,
    Record<string, unknown>[]
  >;
}

describe('serializeBackup', () => {
  it('sets app and schemaVersion', () => {
    const doc = serializeBackup(emptyTables());
    expect(doc.app).toBe('pxo');
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('includes exportedAt as ISO string', () => {
    const doc = serializeBackup(emptyTables());
    expect(new Date(doc.exportedAt).toISOString()).toBe(doc.exportedAt);
  });
});

describe('validateBackup', () => {
  it('valid backup passes', () => {
    const doc = serializeBackup(emptyTables());
    expect(validateBackup(doc).valid).toBe(true);
  });

  it('rejects null', () => {
    expect(validateBackup(null).valid).toBe(false);
  });

  it('rejects wrong app field', () => {
    const doc = { ...serializeBackup(emptyTables()), app: 'other' };
    expect(validateBackup(doc).valid).toBe(false);
  });

  it('rejects missing tables', () => {
    const doc: Record<string, unknown> = {
      app: 'pxo',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
    };
    expect(validateBackup(doc).valid).toBe(false);
  });

  it('rejects newer schemaVersion', () => {
    const doc = { ...serializeBackup(emptyTables()), schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(validateBackup(doc).valid).toBe(false);
  });

  it('rejects missing table key', () => {
    const tables = emptyTables();
    const { wallets: _w, ...withoutWallets } = tables;
    const doc = {
      app: 'pxo',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tables: withoutWallets,
    };
    expect(validateBackup(doc).valid).toBe(false);
  });
});

describe('mergeBackup', () => {
  it('keeps local rows when backup has different ids', () => {
    const local = emptyTables();
    local.sellers = [{ id: 'local-1', name: 'Alice', updated_at: '2024-01-01T00:00:00Z' }];

    const backup = emptyTables();
    backup.sellers = [{ id: 'backup-1', name: 'Bob', updated_at: '2024-01-02T00:00:00Z' }];

    const result = mergeBackup(local, backup);
    expect(result.sellers).toHaveLength(2);
  });

  it('keeps newer updated_at on conflict (backup wins)', () => {
    const local = emptyTables();
    local.sellers = [{ id: 's1', name: 'OldName', updated_at: '2024-01-01T00:00:00Z' }];

    const backup = emptyTables();
    backup.sellers = [{ id: 's1', name: 'NewName', updated_at: '2024-06-01T00:00:00Z' }];

    const result = mergeBackup(local, backup);
    expect(result.sellers).toHaveLength(1);
    expect((result.sellers[0] as { name: string }).name).toBe('NewName');
  });

  it('keeps local row when local updated_at is newer', () => {
    const local = emptyTables();
    local.sellers = [{ id: 's1', name: 'LocalNew', updated_at: '2024-06-01T00:00:00Z' }];

    const backup = emptyTables();
    backup.sellers = [{ id: 's1', name: 'BackupOld', updated_at: '2024-01-01T00:00:00Z' }];

    const result = mergeBackup(local, backup);
    expect((result.sellers[0] as { name: string }).name).toBe('LocalNew');
  });

  it('includes rows from backup not in local', () => {
    const local = emptyTables();
    const backup = emptyTables();
    backup.sellers = [{ id: 's1', name: 'New', updated_at: '2024-01-01T00:00:00Z' }];

    const result = mergeBackup(local, backup);
    expect(result.sellers).toHaveLength(1);
  });
});
