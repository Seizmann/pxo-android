import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let _db: SQLite.SQLiteDatabase | null = null;

/** Open (or return the already-open) database and run migrations. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('pxo.db');
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(_db);
  return _db;
}
