import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { colours, spacing, typography, MIN_TAP_TARGET } from '../theme';

interface PinKeypadProps {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: string;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export function PinKeypad({ onComplete, disabled = false, error }: PinKeypadProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const submitted = useRef(false);

  useEffect(() => {
    if (digits.length === 4 && !submitted.current) {
      submitted.current = true;
      onComplete(digits.join(''));
    }
  }, [digits, onComplete]);

  const handleKey = useCallback((key: string) => {
    if (disabled) return;
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1));
      submitted.current = false;
      return;
    }
    if (key === '') return;
    setDigits((d) => {
      if (d.length >= 4) return d;
      return [...d, key];
    });
  }, [disabled]);

  const reset = useCallback(() => {
    setDigits([]);
    submitted.current = false;
  }, []);

  // Expose reset via ref pattern — parent calls it by re-mounting or via key prop change
  useEffect(() => {
    if (error) {
      Vibration.vibrate(200);
      const t = setTimeout(() => { reset(); }, 500);
      return () => clearTimeout(t);
    }
  }, [error, reset]);

  return (
    <View style={styles.container}>
      {/* PIN dots */}
      <View style={styles.dotsRow}>
        {[0,1,2,3].map((i) => (
          <View
            key={i}
            style={[styles.dot, i < digits.length && styles.dotFilled]}
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : <View style={styles.errorPlaceholder} />}

      {/* Keypad grid */}
      <View style={styles.grid}>
        {KEYS.map((key, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.keyBtn, key === '' && styles.keyBtnEmpty]}
            onPress={() => handleKey(key)}
            disabled={disabled || key === ''}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, key === '⌫' && styles.keyBackspace]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.lg },
  dotsRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: colours.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colours.primary },
  errorText: { ...typography.caption, color: colours.error, height: 16 },
  errorPlaceholder: { height: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: MIN_TAP_TARGET * 3 + spacing.md * 2, gap: spacing.md },
  keyBtn: {
    width: MIN_TAP_TARGET, height: MIN_TAP_TARGET,
    borderRadius: MIN_TAP_TARGET / 2,
    backgroundColor: colours.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  keyBtnEmpty: { backgroundColor: 'transparent' },
  keyText: { ...typography.h3, color: colours.textPrimary },
  keyBackspace: { fontSize: 20 },
});
