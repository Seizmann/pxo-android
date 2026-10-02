import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, typography } from '../theme';

interface CountdownTimerProps {
  seconds: number;
  onTick?: () => void;
}

export function CountdownTimer({ seconds, onTick }: CountdownTimerProps) {
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => { onTick?.(); }, 1000);
    return () => clearInterval(id);
  }, [seconds, onTick]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = mins > 0
    ? `${mins}m ${String(secs).padStart(2, '0')}s`
    : `${secs}s`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Locked for</Text>
      <Text style={styles.timer}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  label: { ...typography.caption, color: colours.textMuted },
  timer: { ...typography.h2, color: colours.error },
});
