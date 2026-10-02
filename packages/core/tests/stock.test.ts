import { describe, it, expect } from 'vitest';
import { computeStock } from '../src/stock';

describe('computeStock', () => {
  it('returns 0 when nothing bought', () => {
    expect(computeStock([], [], [])).toBe(0);
  });

  it('counts purchased cards', () => {
    expect(computeStock([{ id: '1', quantity: 100, archived_at: null }], [], [])).toBe(100);
  });

  it('subtracts sell_cards and bonus_cards from dispatches', () => {
    const purchases = [{ id: '1', quantity: 200, archived_at: null }];
    const dispatches = [{ id: 'd1', sell_cards: 25, bonus_cards: 2, archived_at: null }];
    expect(computeStock(purchases, dispatches, [])).toBe(200 - 25 - 2);
  });

  it('subtracts manager bonus cards', () => {
    const purchases = [{ id: '1', quantity: 100, archived_at: null }];
    const managerBonus = [{ id: 'm1', cards: 5, archived_at: null }];
    expect(computeStock(purchases, [], managerBonus)).toBe(95);
  });

  it('ignores archived purchases', () => {
    const purchases = [
      { id: '1', quantity: 100, archived_at: null },
      { id: '2', quantity: 50, archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(computeStock(purchases, [], [])).toBe(100);
  });

  it('ignores archived dispatches', () => {
    const purchases = [{ id: '1', quantity: 100, archived_at: null }];
    const dispatches = [
      { id: 'd1', sell_cards: 25, bonus_cards: 0, archived_at: null },
      { id: 'd2', sell_cards: 25, bonus_cards: 0, archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(computeStock(purchases, dispatches, [])).toBe(75);
  });

  it('ignores archived manager bonus', () => {
    const purchases = [{ id: '1', quantity: 100, archived_at: null }];
    const managerBonus = [
      { id: 'm1', cards: 5, archived_at: null },
      { id: 'm2', cards: 5, archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(computeStock(purchases, [], managerBonus)).toBe(95);
  });

  it('can go negative if data is inconsistent (no clamping)', () => {
    const purchases = [{ id: '1', quantity: 10, archived_at: null }];
    const dispatches = [{ id: 'd1', sell_cards: 20, bonus_cards: 0, archived_at: null }];
    expect(computeStock(purchases, dispatches, [])).toBe(-10);
  });
});
