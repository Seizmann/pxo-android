import type { PaymentAllocation } from './allocation';

/**
 * Total discount allocated to a specific packet across all payment allocations.
 */
export function discountForPacket(
  allocations: PaymentAllocation[],
  packetId: string,
): number {
  return allocations
    .filter((a) => a.packet_id === packetId)
    .reduce((sum, a) => sum + a.discount, 0);
}

/**
 * Total payment (excluding discount) allocated to a specific packet.
 */
export function paymentForPacket(
  allocations: PaymentAllocation[],
  packetId: string,
): number {
  return allocations
    .filter((a) => a.packet_id === packetId)
    .reduce((sum, a) => sum + a.amount, 0);
}
