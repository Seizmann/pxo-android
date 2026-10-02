/**
 * PIN lockout state machine (pure — no side effects, no storage).
 *
 * Rules:
 * - Track wrongAttempts and lockLevel independently.
 * - 5 consecutive wrong attempts → locked.
 *   Lock duration = 30 × 3^lockLevel seconds (30s, 90s, 270s, 810s, …).
 *   After each lock, lockLevel increments for the next lock.
 * - Correct PIN resets both wrongAttempts and lockLevel to 0.
 *
 * State is persisted externally (expo-secure-store in the mobile app).
 * This module exposes pure arithmetic + the state machine only.
 */

export const RECOVERY_SALT = '$2a$10$pxo_recovery_salt_____';

export interface LockoutState {
  wrongAttempts: number;
  lockLevel: number;
}

export type AttemptResult =
  | { success: true }
  | { success: false; attemptsLeft: number }
  | { locked: true; durationSeconds: number };

export function initialLockoutState(): LockoutState {
  return { wrongAttempts: 0, lockLevel: 0 };
}

/** Duration in seconds for a given lock level. */
export function lockDuration(level: number): number {
  return 30 * Math.pow(3, level);
}

/**
 * Process a PIN attempt.
 * @param isCorrect - whether the entered PIN matches the stored PIN
 * @param state - current lockout state (mutated copy is returned)
 * @returns result and the next state
 */
export function processPinAttempt(
  isCorrect: boolean,
  state: LockoutState,
): { result: AttemptResult; nextState: LockoutState } {
  if (isCorrect) {
    return {
      result: { success: true },
      nextState: { wrongAttempts: 0, lockLevel: 0 },
    };
  }

  const newWrongAttempts = state.wrongAttempts + 1;

  if (newWrongAttempts >= 5) {
    const duration = lockDuration(state.lockLevel);
    return {
      result: { locked: true, durationSeconds: duration },
      nextState: { wrongAttempts: 0, lockLevel: state.lockLevel + 1 },
    };
  }

  return {
    result: { success: false, attemptsLeft: 5 - newWrongAttempts },
    nextState: { wrongAttempts: newWrongAttempts, lockLevel: state.lockLevel },
  };
}
