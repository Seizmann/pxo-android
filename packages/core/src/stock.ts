export interface StockPurchaseRow {
  id: string;
  quantity: number;
  archived_at: string | null;
}

export interface DispatchRow {
  id: string;
  sell_cards: number;
  bonus_cards: number;
  archived_at: string | null;
}

export interface ManagerBonusRow {
  id: string;
  cards: number;
  archived_at: string | null;
}

/**
 * Compute current stock (cards) from raw DB rows.
 * Only active (non-archived) rows count.
 *
 * Stock = total bought − sell cards given − bonus cards given − manager bonus cards
 */
export function computeStock(
  purchases: StockPurchaseRow[],
  dispatches: DispatchRow[],
  managerBonus: ManagerBonusRow[],
): number {
  const bought = purchases
    .filter((p) => p.archived_at === null)
    .reduce((sum, p) => sum + p.quantity, 0);

  const soldAndBonus = dispatches
    .filter((d) => d.archived_at === null)
    .reduce((sum, d) => sum + d.sell_cards + d.bonus_cards, 0);

  const managerOut = managerBonus
    .filter((m) => m.archived_at === null)
    .reduce((sum, m) => sum + m.cards, 0);

  return bought - soldAndBonus - managerOut;
}
