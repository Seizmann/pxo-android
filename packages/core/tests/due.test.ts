import { describe, it, expect } from 'vitest';
import { packetAmount, packetDue, sellerDue, packetRate } from '../src/due';
import type { PacketRow, DispatchForDue, AllocationRow } from '../src/due';

const dispatch: DispatchForDue = { id: 'd1', sell_rate: 30000, archived_at: null };
const packet: PacketRow = { id: 'p1', dispatch_id: 'd1', cards: 25, rate_override: null };

describe('packetRate', () => {
  it('returns dispatch sell_rate when no override', () => {
    expect(packetRate(packet, dispatch)).toBe(30000);
  });

  it('returns rate_override when set', () => {
    const p: PacketRow = { ...packet, rate_override: 28000 };
    expect(packetRate(p, dispatch)).toBe(28000);
  });
});

describe('packetAmount', () => {
  it('computes cards × sell_rate', () => {
    expect(packetAmount(packet, dispatch)).toBe(25 * 30000);
  });

  it('uses rate_override when set', () => {
    const p: PacketRow = { ...packet, cards: 20, rate_override: 28000 };
    expect(packetAmount(p, dispatch)).toBe(20 * 28000);
  });
});

describe('packetDue', () => {
  it('returns full amount when no allocations', () => {
    expect(packetDue(packet, dispatch, [])).toBe(25 * 30000);
  });

  it('subtracts paid and discounted amounts', () => {
    const allocs: AllocationRow[] = [
      { packet_id: 'p1', amount: 500_00, discount: 50_00, payment_archived_at: null },
    ];
    const expected = 25 * 30000 - 50000 - 5000;
    expect(packetDue(packet, dispatch, allocs)).toBe(expected);
  });

  it('ignores archived payment allocations', () => {
    const allocs: AllocationRow[] = [
      { packet_id: 'p1', amount: 500_00, discount: 0, payment_archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(packetDue(packet, dispatch, allocs)).toBe(25 * 30000);
  });

  it('ignores allocations for other packets', () => {
    const allocs: AllocationRow[] = [
      { packet_id: 'p2', amount: 100_00, discount: 0, payment_archived_at: null },
    ];
    expect(packetDue(packet, dispatch, allocs)).toBe(25 * 30000);
  });
});

describe('sellerDue', () => {
  it('sums due across all active packets', () => {
    const packets: PacketRow[] = [
      { id: 'p1', dispatch_id: 'd1', cards: 25, rate_override: null },
      { id: 'p2', dispatch_id: 'd1', cards: 25, rate_override: null },
    ];
    const dispatches: DispatchForDue[] = [dispatch];
    expect(sellerDue(packets, dispatches, [])).toBe(2 * 25 * 30000);
  });

  it('excludes packets whose dispatch is archived', () => {
    const packets: PacketRow[] = [
      { id: 'p1', dispatch_id: 'd1', cards: 25, rate_override: null },
      { id: 'p2', dispatch_id: 'd2', cards: 25, rate_override: null },
    ];
    const dispatches: DispatchForDue[] = [
      { id: 'd1', sell_rate: 30000, archived_at: null },
      { id: 'd2', sell_rate: 30000, archived_at: '2024-01-01T00:00:00Z' },
    ];
    expect(sellerDue(packets, dispatches, [])).toBe(25 * 30000);
  });
});
