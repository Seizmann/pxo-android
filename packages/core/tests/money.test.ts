import { describe, it, expect } from 'vitest';
import { takaToPaisa, paisaToTaka, formatTaka } from '../src/money';

describe('money', () => {
  it('takaToPaisa converts taka to poisha', () => {
    expect(takaToPaisa(300)).toBe(30000);
    expect(takaToPaisa(190)).toBe(19000);
    expect(takaToPaisa(1)).toBe(100);
  });

  it('takaToPaisa rounds to nearest integer', () => {
    // 1.005 * 100 = 100.49999... in IEEE 754 → rounds to 100, not 101
    expect(takaToPaisa(1.005)).toBe(100);
    expect(takaToPaisa(0.1)).toBe(10);
    expect(takaToPaisa(1.506)).toBe(151); // 1.506 * 100 = 150.6 → rounds to 151
  });

  it('paisaToTaka converts poisha to taka string', () => {
    expect(paisaToTaka(30000)).toBe('300.00');
    expect(paisaToTaka(19000)).toBe('190.00');
    expect(paisaToTaka(150)).toBe('1.50');
    expect(paisaToTaka(0)).toBe('0.00');
  });

  it('formatTaka is same as paisaToTaka', () => {
    expect(formatTaka(75050)).toBe('750.50');
  });
});
