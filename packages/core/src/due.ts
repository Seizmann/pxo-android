export interface PacketRow {
  id: string;
  dispatch_id: string;
  cards: number;
  rate_override: number | null;
}

export interface DispatchForDue {
  id: string;
  sell_rate: number;
  archived_at: string | null;
}

export interface AllocationRow {
  packet_id: string;
  amount: number;
  discount: number;
  /** archived_at of the parent payment */
  payment_archived_at: string | null;
}

/**
 * Effective rate for a packet: rate_override if set, else dispatch sell_rate.
 */
export function packetRate(packet: PacketRow, dispatch: DispatchForDue): number {
  return packet.rate_override ?? dispatch.sell_rate;
}

/**
 * Gross amount owed for a packet (cards × effective rate), in poisha.
 */
export function packetAmount(packet: PacketRow, dispatch: DispatchForDue): number {
  return packet.cards * packetRate(packet, dispatch);
}

/**
 * Due remaining for a single packet, in poisha.
 * due = packetAmount − sum of active payment allocations − sum of active discount allocations
 */
export function packetDue(
  packet: PacketRow,
  dispatch: DispatchForDue,
  allocations: AllocationRow[],
): number {
  const active = allocations.filter((a) => a.payment_archived_at === null);
  const forPacket = active.filter((a) => a.packet_id === packet.id);
  const paid = forPacket.reduce((s, a) => s + a.amount, 0);
  const discounted = forPacket.reduce((s, a) => s + a.discount, 0);
  return packetAmount(packet, dispatch) - paid - discounted;
}

/**
 * Total due across all active (non-archived) dispatches for one seller.
 */
export function sellerDue(
  packets: PacketRow[],
  dispatches: DispatchForDue[],
  allocations: AllocationRow[],
): number {
  const dispatchMap = new Map(dispatches.map((d) => [d.id, d]));

  return packets.reduce((sum, packet) => {
    const dispatch = dispatchMap.get(packet.dispatch_id);
    if (!dispatch || dispatch.archived_at !== null) return sum;
    return sum + packetDue(packet, dispatch, allocations);
  }, 0);
}
