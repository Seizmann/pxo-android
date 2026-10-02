import { describe, it, expect } from 'vitest';
import { processPinAttempt, lockDuration, initialLockoutState } from '../src/pin-lockout';

describe('lockDuration', () => {
  it('returns 30s at level 0', () => expect(lockDuration(0)).toBe(30));
  it('returns 90s at level 1', () => expect(lockDuration(1)).toBe(90));
  it('returns 270s at level 2', () => expect(lockDuration(2)).toBe(270));
  it('returns 810s at level 3', () => expect(lockDuration(3)).toBe(810));
});

describe('processPinAttempt', () => {
  it('correct PIN returns success and resets both counters', () => {
    const state = { wrongAttempts: 3, lockLevel: 2 };
    const { result, nextState } = processPinAttempt(true, state);
    expect(result).toEqual({ success: true });
    expect(nextState).toEqual({ wrongAttempts: 0, lockLevel: 0 });
  });

  it('4 wrong attempts → not locked yet, reports attemptsLeft', () => {
    let state = initialLockoutState();
    let result;
    for (let i = 0; i < 4; i++) {
      ({ result, nextState: state } = processPinAttempt(false, state));
    }
    expect(result).toEqual({ success: false, attemptsLeft: 1 });
    expect(state.wrongAttempts).toBe(4);
  });

  it('5th wrong attempt triggers lock at 30s (level 0)', () => {
    let state = initialLockoutState();
    let result;
    for (let i = 0; i < 5; i++) {
      ({ result, nextState: state } = processPinAttempt(false, state));
    }
    expect(result).toEqual({ locked: true, durationSeconds: 30 });
    expect(state.lockLevel).toBe(1);
    expect(state.wrongAttempts).toBe(0);
  });

  it('second lock is 90s (level 1)', () => {
    let state = { wrongAttempts: 0, lockLevel: 1 };
    let result;
    for (let i = 0; i < 5; i++) {
      ({ result, nextState: state } = processPinAttempt(false, state));
    }
    expect(result).toEqual({ locked: true, durationSeconds: 90 });
    expect(state.lockLevel).toBe(2);
  });

  it('third lock is 270s', () => {
    let state = { wrongAttempts: 0, lockLevel: 2 };
    let result;
    for (let i = 0; i < 5; i++) {
      ({ result, nextState: state } = processPinAttempt(false, state));
    }
    expect(result).toEqual({ locked: true, durationSeconds: 270 });
  });

  it('correct PIN after partial wrong streak resets counters fully', () => {
    let state = initialLockoutState();
    // 3 wrong
    for (let i = 0; i < 3; i++) {
      ({ nextState: state } = processPinAttempt(false, state));
    }
    // correct
    const { result, nextState } = processPinAttempt(true, state);
    expect(result).toEqual({ success: true });
    expect(nextState).toEqual({ wrongAttempts: 0, lockLevel: 0 });
  });
});
