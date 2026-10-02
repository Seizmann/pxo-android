import type { SQLiteDatabase } from 'expo-sqlite';
import type { Dispatch, Packet } from '../../types';
import { newId, nowIso } from '../../utils/uuid';

export interface PacketInput {
  seq: number;
  cards: number;
  rate_override?: number;
}

export async function listDispatches(
  db: SQLiteDatabase,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<Dispatch[]> {
  const where =
    filter === 'active'
      ? 'WHERE archived_at IS NULL'
      : filter === 'archived'
        ? 'WHERE archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<Dispatch>(
    `SELECT * FROM dispatches ${where} ORDER BY entry_date DESC, created_at DESC;`,
  );
}

export async function listDispatchesBySeller(
  db: SQLiteDatabase,
  sellerId: string,
  filter: 'active' | 'archived' | 'all' = 'active',
): Promise<Dispatch[]> {
  const extra =
    filter === 'active'
      ? 'AND archived_at IS NULL'
      : filter === 'archived'
        ? 'AND archived_at IS NOT NULL'
        : '';
  return db.getAllAsync<Dispatch>(
    `SELECT * FROM dispatches WHERE seller_id=? ${extra} ORDER BY entry_date DESC, created_at DESC;`,
    [sellerId],
  );
}

export async function getDispatch(db: SQLiteDatabase, id: string): Promise<Dispatch | null> {
  return db.getFirstAsync<Dispatch>(`SELECT * FROM dispatches WHERE id=?;`, [id]);
}

export async function insertDispatch(
  db: SQLiteDatabase,
  data: {
    seller_id: string;
    entry_date: string;
    sell_rate: number;
    bonus_cards: number;
    note?: string;
  },
  packets: PacketInput[],
): Promise<Dispatch> {
  const id = newId();
  const now = nowIso();
  const sell_cards = packets.reduce((s, p) => s + p.cards, 0);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO dispatches (id, seller_id, entry_date, sell_rate, sell_cards, bonus_cards, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, data.seller_id, data.entry_date, data.sell_rate, sell_cards, data.bonus_cards, data.note ?? null, now, now],
    );
    for (const p of packets) {
      await db.runAsync(
        `INSERT INTO packets (id, dispatch_id, seq, cards, rate_override, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [newId(), id, p.seq, p.cards, p.rate_override ?? null, now, now],
      );
    }
  });
  return (await getDispatch(db, id))!;
}

export async function updateDispatch(
  db: SQLiteDatabase,
  id: string,
  data: {
    seller_id: string;
    entry_date: string;
    sell_rate: number;
    bonus_cards: number;
    note?: string;
  },
  packets: PacketInput[],
): Promise<void> {
  const now = nowIso();
  const sell_cards = packets.reduce((s, p) => s + p.cards, 0);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE dispatches SET seller_id=?, entry_date=?, sell_rate=?, sell_cards=?, bonus_cards=?, note=?, updated_at=? WHERE id=?;`,
      [data.seller_id, data.entry_date, data.sell_rate, sell_cards, data.bonus_cards, data.note ?? null, now, id],
    );
    await db.runAsync(`DELETE FROM packets WHERE dispatch_id=?;`, [id]);
    for (const p of packets) {
      await db.runAsync(
        `INSERT INTO packets (id, dispatch_id, seq, cards, rate_override, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [newId(), id, p.seq, p.cards, p.rate_override ?? null, now, now],
      );
    }
  });
}

export async function archiveDispatch(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE dispatches SET archived_at=?, updated_at=? WHERE id=?;`,
    [now, now, id],
  );
}

export async function restoreDispatch(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE dispatches SET archived_at=NULL, updated_at=? WHERE id=?;`,
    [nowIso(), id],
  );
}

export async function deleteDispatch(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM dispatches WHERE id=?;`, [id]);
}

export async function listPacketsByDispatch(
  db: SQLiteDatabase,
  dispatchId: string,
): Promise<Packet[]> {
  return db.getAllAsync<Packet>(
    `SELECT * FROM packets WHERE dispatch_id=? ORDER BY seq;`,
    [dispatchId],
  );
}

export async function listPacketsByDispatches(
  db: SQLiteDatabase,
  dispatchIds: string[],
): Promise<Packet[]> {
  if (dispatchIds.length === 0) return [];
  const placeholders = dispatchIds.map(() => '?').join(',');
  return db.getAllAsync<Packet>(
    `SELECT * FROM packets WHERE dispatch_id IN (${placeholders}) ORDER BY dispatch_id, seq;`,
    dispatchIds,
  );
}
