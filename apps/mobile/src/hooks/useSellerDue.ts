import { useCallback, useEffect, useState } from 'react';
import { sellerDue } from '@pxo/core';
import type { SQLiteDatabase } from 'expo-sqlite';
import { listSellers } from '../db/repos/sellers';
import { listDispatchesBySeller, listPacketsByDispatches } from '../db/repos/dispatches';
import { listAllocationsForPackets } from '../db/repos/payments';
import type { PacketRow, DispatchForDue, AllocationRow } from '@pxo/core';

export function useSellerDue(db: SQLiteDatabase | null): number {
  const [totalDue, setTotalDue] = useState(0);

  const refresh = useCallback(async () => {
    if (!db) return;

    const sellers = await listSellers(db);
    let grand = 0;

    for (const seller of sellers) {
      const dispatches = await listDispatchesBySeller(db, seller.id, 'all');
      const packetRows = await listPacketsByDispatches(db, dispatches.map((d) => d.id));

      const allAllocs = await listAllocationsForPackets(db, packetRows.map((p) => p.id));

      // Join allocation rows with payment archived_at
      const allocsWithMeta: AllocationRow[] = await Promise.all(
        allAllocs.map(async (a) => {
          const payRow = await db.getFirstAsync<{ archived_at: string | null }>(
            `SELECT archived_at FROM payments WHERE id=?;`,
            [a.payment_id],
          );
          return { ...a, payment_archived_at: payRow?.archived_at ?? null };
        }),
      );

      const dispatchesForDue: DispatchForDue[] = dispatches.map((d) => ({
        id: d.id,
        sell_rate: d.sell_rate,
        archived_at: d.archived_at,
      }));

      const packets: PacketRow[] = packetRows.map((p) => ({
        id: p.id,
        dispatch_id: p.dispatch_id,
        cards: p.cards,
        rate_override: p.rate_override,
      }));

      grand += sellerDue(packets, dispatchesForDue, allocsWithMeta);
    }

    setTotalDue(grand);
  }, [db]);

  useEffect(() => { refresh(); }, [refresh]);

  return totalDue;
}
