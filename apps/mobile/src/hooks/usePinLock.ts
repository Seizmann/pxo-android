import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import bcrypt from 'bcryptjs';
import {
  processPinAttempt,
  initialLockoutState,
  RECOVERY_SALT,
} from '@pxo/core';
import type { LockoutState } from '@pxo/core';

const PIN_KEY = 'pxo_pin';
const LOCKOUT_KEY = 'pxo_lockout';

export interface PinLockState {
  isLocked: boolean;
  lockSecondsRemaining: number;
  attemptsLeft: number;
}

export interface UsePinLock {
  lockState: PinLockState;
  hasPin: boolean;
  attemptPin: (pin: string) => Promise<'correct' | 'wrong' | 'locked'>;
  attemptRecovery: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  /** Call once per second while locked to decrement the timer */
  tick: () => void;
}

async function loadLockoutState(): Promise<LockoutState> {
  try {
    const raw = await SecureStore.getItemAsync(LOCKOUT_KEY);
    if (raw) return JSON.parse(raw) as LockoutState;
  } catch {}
  return initialLockoutState();
}

async function saveLockoutState(state: LockoutState): Promise<void> {
  await SecureStore.setItemAsync(LOCKOUT_KEY, JSON.stringify(state));
}

async function getStoredPin(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PIN_KEY);
  } catch {
    return null;
  }
}

async function savePin(pin: string): Promise<void> {
  const hash = bcrypt.hashSync(pin, 10);
  await SecureStore.setItemAsync(PIN_KEY, hash);
}

function getRecoveryHash(): string | null {
  try {
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const hash = extra?.recoveryPinHash;
    if (typeof hash === 'string' && hash.length > 0 && !hash.startsWith('$RECOVERY')) {
      return hash;
    }
    return null;
  } catch {
    return null;
  }
}

export function usePinLock(): UsePinLock {
  const [hasPin, setHasPin] = useState(false);
  const [lockoutState, setLockoutState] = useState<LockoutState>(initialLockoutState());
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  useEffect(() => {
    (async () => {
      const state = await loadLockoutState();
      setLockoutState(state);
      const pin = await getStoredPin();
      setHasPin(pin !== null);
    })();
  }, []);

  const tick = useCallback(() => {
    setLockSecondsRemaining((s) => Math.max(0, s - 1));
  }, []);

  const attemptPin = useCallback(
    async (pin: string): Promise<'correct' | 'wrong' | 'locked'> => {
      const storedHash = await getStoredPin();
      const isCorrect = storedHash ? bcrypt.compareSync(pin, storedHash) : false;
      const { result, nextState } = processPinAttempt(isCorrect, lockoutState);
      await saveLockoutState(nextState);
      setLockoutState(nextState);

      if ('success' in result && result.success) {
        setAttemptsLeft(5);
        setLockSecondsRemaining(0);
        return 'correct';
      }
      if ('locked' in result && result.locked) {
        setLockSecondsRemaining(result.durationSeconds);
        return 'locked';
      }
      if ('attemptsLeft' in result) {
        setAttemptsLeft(result.attemptsLeft);
      }
      return 'wrong';
    },
    [lockoutState],
  );

  const attemptRecovery = useCallback(async (pin: string): Promise<boolean> => {
    const hash = getRecoveryHash();
    if (!hash) return false;
    const match = bcrypt.compareSync(pin, hash);
    if (match) {
      // Reset lockout on successful recovery
      const reset = initialLockoutState();
      await saveLockoutState(reset);
      setLockoutState(reset);
      setLockSecondsRemaining(0);
    }
    return match;
  }, []);

  const setPin = useCallback(async (pin: string): Promise<void> => {
    await savePin(pin);
    setHasPin(true);
  }, []);

  return {
    lockState: {
      isLocked: lockSecondsRemaining > 0,
      lockSecondsRemaining,
      attemptsLeft,
    },
    hasPin,
    attemptPin,
    attemptRecovery,
    setPin,
    tick,
  };
}
