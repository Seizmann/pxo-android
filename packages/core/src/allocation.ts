export interface PacketForAllocation {
  id: string;
  /** Total amount owed for this packet in poisha */
  amount: number;
  /** Poisha already paid against this packet (sum of existing allocations) */
  paidSoFar: number;
  /** Poisha discount already applied */
  discountSoFar: number;
  /** entry_date of the dispatch this packet belongs to (ISO string, for age ordering) */
  dispatchDate: string;
  /** seq within its dispatch, for stable secondary ordering */
  seq: number;
}

export interface PaymentAllocation {
  packet_id: string;
  amount: number;
  discount: number;
}

/**
 * Auto-allocate payment and discount across packets, oldest dispatch first.
 * Remaining due on a packet = amount − paidSoFar − discountSoFar.
 * Applies payment first, then discount against the same remaining due.
 */
export function autoAllocate(
  packets: PacketForAllocation[],
  totalPayment: number,
  totalDiscount: number,
): PaymentAllocation[] {
  const sorted = [...packets].sort((a, b) => {
    if (a.dispatchDate !== b.dispatchDate) {
      return a.dispatchDate < b.dispatchDate ? -1 : 1;
    }
    return a.seq - b.seq;
  });

  let remainingPayment = totalPayment;
  let remainingDiscount = totalDiscount;

  return sorted.map((packet) => {
    const due = Math.max(0, packet.amount - packet.paidSoFar - packet.discountSoFar);

    const paymentApplied = Math.min(remainingPayment, due);
    remainingPayment -= paymentApplied;

    const dueAfterPayment = due - paymentApplied;
    const discountApplied = Math.min(remainingDiscount, dueAfterPayment);
    remainingDiscount -= discountApplied;

    return { packet_id: packet.id, amount: paymentApplied, discount: discountApplied };
  });
}

/**
 * Manual allocation: caller provides explicit amount and discount per packet.
 * Values are passed through unchanged; caller is responsible for validation.
 */
export function manualAllocate(
  entries: PaymentAllocation[],
): PaymentAllocation[] {
  return entries.map((e) => ({
    packet_id: e.packet_id,
    amount: e.amount,
    discount: e.discount,
  }));
}
