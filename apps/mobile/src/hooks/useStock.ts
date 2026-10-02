import { useCallback, useEffect, useState } from 'react';
import { computeStock } from '@pxo/core';
import type { SQLiteDatabase } from 'expo-sqlite';
import { listStockPurchases } from '../db/repos/stock-purchases';
import { listDispatches } from '../db/repos/dispatches';
import { listManagerBonus } from '../db/repos/manager-bonus';

export function useStock(db: SQLiteDatabase | null): number {
  const [stock, setStock] = useState(0);

  const refresh = useCallback(async () => {
    if (!db) return;
    const [purchases, dispatches, managerBonus] = await Promise.all([
      listStockPurchases(db, 'all'),
      listDispatches(db, 'all'),
      listManagerBonus(db, 'all'),
    ]);
    setStock(computeStock(purchases, dispatches, managerBonus));
  }, [db]);

  useEffect(() => { refresh(); }, [refresh]);

  return stock;
}
