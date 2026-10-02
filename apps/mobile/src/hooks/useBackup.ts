import { useCallback } from 'react';
import { exportBackup, importBackup } from '../utils/backup';
import type { SQLiteDatabase } from 'expo-sqlite';

export function useBackup(db: SQLiteDatabase | null) {
  const doExport = useCallback(async () => {
    if (!db) throw new Error('Database not ready.');
    await exportBackup(db);
  }, [db]);

  const doImport = useCallback(
    async (mode: 'replace' | 'merge') => {
      if (!db) throw new Error('Database not ready.');
      await importBackup(db, mode);
    },
    [db],
  );

  return { exportBackup: doExport, importBackup: doImport };
}
