/** Convert taka (number) to integer poisha. Rounds to nearest integer. */
export function takaToPaisa(taka: number): number {
  return Math.round(taka * 100);
}

/** Convert integer poisha to taka string with 2 decimal places. */
export function paisaToTaka(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

/**
 * Format integer poisha as a taka display string.
 * e.g. 30000 → "300.00"
 */
export function formatTaka(paisa: number): string {
  return paisaToTaka(paisa);
}
