import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  serializeBackup,
  validateBackup,
  mergeBackup,
  BACKUP_TABLES,
  type BackupDoc,
  type BackupTableName,
} from '@pxo/core';
import { backupFileName } from './dateFormat';

/** Read all rows from every backup table. */
async function snapshotTables(
  db: SQLiteDatabase,
): Promise<Record<BackupTableName, Record<string, unknown>[]>> {
  const tables = {} as Record<BackupTableName, Record<string, unknown>[]>;
  for (const table of BACKUP_TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table};`);
  }
  return tables;
}

/** Export backup to sharing sheet. Throws on error. */
export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const tables = await snapshotTables(db);
  const doc = serializeBackup(tables);
  const json = JSON.stringify(doc, null, 2);

  const fileName = backupFileName();
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save PXO Backup' });
}

/** Pick a backup file and restore it. Throws on validation or DB error. */
export async function importBackup(
  db: SQLiteDatabase,
  mode: 'replace' | 'merge',
): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return;
  const uri = result.assets[0]?.uri;
  if (!uri) throw new Error('No file selected.');

  const json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const raw = JSON.parse(json) as unknown;

  const { valid, error } = validateBackup(raw);
  if (!valid) throw new Error(`Invalid backup: ${error}`);

  const doc = raw as BackupDoc;

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      // Delete all data in reverse dependency order
      const reverseTables = [...BACKUP_TABLES].reverse();
      for (const table of reverseTables) {
        await db.execAsync(`DELETE FROM ${table};`);
      }
      // Insert backup rows
      for (const table of BACKUP_TABLES) {
        for (const row of doc.tables[table]) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;
          const cols = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          await db.runAsync(
            `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders});`,
            Object.values(row) as (string | number | null)[],
          );
        }
      }
    } else {
      // Merge: newer updated_at wins
      const local = await snapshotTables(db);
      const merged = mergeBackup(local, doc.tables);

      for (const table of BACKUP_TABLES) {
        for (const row of merged[table]) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;
          const cols = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const updates = keys.map((k) => `${k}=excluded.${k}`).join(', ');
          await db.runAsync(
            `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
             ON CONFLICT(id) DO UPDATE SET ${updates};`,
            Object.values(row) as (string | number | null)[],
          );
        }
      }
    }
  });
}
