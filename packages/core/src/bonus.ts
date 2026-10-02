/**
 * Bonus value for a set of bonus cards.
 * Value = cards × rate_at_entry (in poisha).
 * This is informational only — never affects due or payment calculations.
 */
export function bonusValue(cards: number, rateAtEntry: number): number {
  return cards * rateAtEntry;
}
