import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { usePinLock } from '../src/hooks/usePinLock';
import { PinKeypad } from '../src/components/PinKeypad';
import { CountdownTimer } from '../src/components/CountdownTimer';
import { colours, spacing, typography } from '../src/theme';

type Mode = 'pin' | 'locked' | 'recovery' | 'set-pin' | 'confirm-pin';

export default function LockScreen() {
  const { lockState, hasPin, attemptPin, attemptRecovery, setPin, tick } = usePinLock();
  const [mode, setMode] = useState<Mode>('pin');
  const [error, setError] = useState<string | undefined>();
  const [newPin, setNewPin] = useState('');
  const [keypadKey, setKeypadKey] = useState(0); // increment to reset keypad

  // On first launch with no PIN set → go to set-pin mode
  useEffect(() => {
    if (!hasPin) setMode('set-pin');
  }, [hasPin]);

  // If locked externally (e.g. on first render), switch mode
  useEffect(() => {
    if (lockState.isLocked) setMode('locked');
  }, [lockState.isLocked]);

  const resetKeypad = useCallback(() => {
    setKeypadKey((k) => k + 1);
    setError(undefined);
  }, []);

  /* ── PIN entry ── */
  const handlePinComplete = useCallback(async (pin: string) => {
    const result = await attemptPin(pin);
    if (result === 'correct') {
      router.replace('/');
    } else if (result === 'locked') {
      setMode('locked');
      resetKeypad();
    } else {
      setError('Wrong PIN');
      resetKeypad();
    }
  }, [attemptPin, resetKeypad]);

  /* ── Recovery ── */
  const handleRecoveryComplete = useCallback(async (pin: string) => {
    const ok = await attemptRecovery(pin);
    if (ok) {
      setMode('set-pin');
      resetKeypad();
    } else {
      setError('Wrong recovery PIN');
      resetKeypad();
    }
  }, [attemptRecovery, resetKeypad]);

  /* ── Set new PIN ── */
  const handleSetPin = useCallback((pin: string) => {
    setNewPin(pin);
    setMode('confirm-pin');
    resetKeypad();
  }, [resetKeypad]);

  const handleConfirmPin = useCallback(async (pin: string) => {
    if (pin !== newPin) {
      setError('PINs do not match');
      setMode('set-pin');
      setNewPin('');
      resetKeypad();
      return;
    }
    await setPin(pin);
    router.replace('/');
  }, [newPin, setPin, resetKeypad]);

  const renderContent = () => {
    if (mode === 'locked') {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Too many attempts</Text>
          <CountdownTimer
            seconds={lockState.lockSecondsRemaining}
            onTick={tick}
          />
          <Text style={styles.sub}>Try again after the timer expires</Text>
        </View>
      );
    }

    if (mode === 'recovery') {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Recovery PIN</Text>
          <Text style={styles.sub}>Enter your fixed recovery PIN</Text>
          <PinKeypad
            key={keypadKey}
            onComplete={handleRecoveryComplete}
            error={error}
          />
          <TouchableOpacity onPress={() => { setMode('pin'); resetKeypad(); }}>
            <Text style={styles.link}>Back to PIN entry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'set-pin') {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Set PIN</Text>
          <Text style={styles.sub}>Choose a 4-digit PIN</Text>
          <PinKeypad key={keypadKey} onComplete={handleSetPin} error={error} />
        </View>
      );
    }

    if (mode === 'confirm-pin') {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Confirm PIN</Text>
          <Text style={styles.sub}>Enter your PIN again to confirm</Text>
          <PinKeypad key={keypadKey} onComplete={handleConfirmPin} error={error} />
        </View>
      );
    }

    // Default: pin entry
    return (
      <View style={styles.center}>
        <Text style={styles.title}>PXO</Text>
        <Text style={styles.sub}>Enter your PIN</Text>
        <PinKeypad
          key={keypadKey}
          onComplete={handlePinComplete}
          disabled={lockState.isLocked}
          error={error}
        />
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => { setMode('recovery'); resetKeypad(); }}
        >
          <Text style={styles.link}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.primary },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  title: { ...typography.h1, color: colours.textOnPrimary },
  sub: { ...typography.body, color: colours.textOnPrimary, opacity: 0.8, textAlign: 'center' },
  forgotBtn: { marginTop: spacing.md },
  link: { ...typography.body, color: colours.textOnPrimary, textDecorationLine: 'underline' },
});
