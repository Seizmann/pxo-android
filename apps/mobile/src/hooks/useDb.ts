import { useEffect, useRef, useState } from 'react';
import { getDb } from '../db/client';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Opens and initialises the SQLite DB on first call.
 * Returns null while initialising, the DB instance once ready.
 */
export function useDb(): SQLiteDatabase | null {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    getDb().then(setDb).catch(console.error);
  }, []);

  return db;
}
