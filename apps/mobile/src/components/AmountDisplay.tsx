import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatTaka } from '@pxo/core';
import { colours, typography } from '../theme';

interface AmountDisplayProps {
  paisa: number;
  size?: 'normal' | 'large';
  color?: string;
}

export function AmountDisplay({ paisa, size = 'normal', color }: AmountDisplayProps) {
  const style = size === 'large' ? styles.large : styles.normal;
  return (
    <Text style={[style, color ? { color } : undefined]}>
      ৳{formatTaka(paisa)}
    </Text>
  );
}

const styles = StyleSheet.create({
  normal: { ...typography.amount, color: colours.textPrimary },
  large: { ...typography.amountLarge, color: colours.textPrimary },
});
