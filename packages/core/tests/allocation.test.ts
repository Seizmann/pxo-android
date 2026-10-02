import { describe, it, expect } from 'vitest';
import { autoAllocate, manualAllocate } from '../src/allocation';
import type { PacketForAllocation } from '../src/allocation';

const makePacket = (
  id: string,
  amount: number,
  dispatchDate: string,
  seq = 1,
  paidSoFar = 0,
  discountSoFar = 0,
): PacketForAllocation => ({ id, amount, dispatchDate, seq, paidSoFar, discountSoFar });

describe('autoAllocate', () => {
  it('allocates to oldest packet first', () => {
    const packets = [
      makePacket('p2', 7500, '2024-02-01'),
      makePacket('p1', 7500, '2024-01-01'),
    ];
    const result = autoAllocate(packets, 7500, 0);
    const p1 = result.find((r) => r.packet_id === 'p1')!;
    const p2 = result.find((r) => r.packet_id === 'p2')!;
    expect(p1.amount).toBe(7500);
    expect(p2.amount).toBe(0);
  });

  it('spills over to next packet when first is covered', () => {
    const packets = [
      makePacket('p1', 5000, '2024-01-01'),
      makePacket('p2', 5000, '2024-02-01'),
    ];
    const result = autoAllocate(packets, 8000, 0);
    const p1 = result.find((r) => r.packet_id === 'p1')!;
    const p2 = result.find((r) => r.packet_id === 'p2')!;
    expect(p1.amount).toBe(5000);
    expect(p2.amount).toBe(3000);
  });

  it('applies discount after payment against remaining due', () => {
    const packets = [makePacket('p1', 7500, '2024-01-01')];
    const result = autoAllocate(packets, 7000, 500);
    expect(result[0].amount).toBe(7000);
    expect(result[0].discount).toBe(500);
  });

  it('respects paidSoFar when computing remaining due', () => {
    const packets = [makePacket('p1', 7500, '2024-01-01', 1, 3000, 0)];
    const result = autoAllocate(packets, 4500, 0);
    expect(result[0].amount).toBe(4500);
  });

  it('returns zero allocation for packets with no remaining due', () => {
    const packets = [makePacket('p1', 5000, '2024-01-01', 1, 5000, 0)];
    const result = autoAllocate(packets, 1000, 0);
    expect(result[0].amount).toBe(0);
    expect(result[0].discount).toBe(0);
  });

  it('uses seq as tiebreaker within same dispatch date', () => {
    const packets = [
      makePacket('pb', 3000, '2024-01-01', 2),
      makePacket('pa', 3000, '2024-01-01', 1),
    ];
    const result = autoAllocate(packets, 3000, 0);
    const pa = result.find((r) => r.packet_id === 'pa')!;
    const pb = result.find((r) => r.packet_id === 'pb')!;
    expect(pa.amount).toBe(3000);
    expect(pb.amount).toBe(0);
  });
});

describe('manualAllocate', () => {
  it('passes through values unchanged', () => {
    const input = [
      { packet_id: 'p1', amount: 3000, discount: 500 },
      { packet_id: 'p2', amount: 2000, discount: 0 },
    ];
    expect(manualAllocate(input)).toEqual(input);
  });
});
