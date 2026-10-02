import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { formatTaka } from '@pxo/core';
import { colours, spacing, typography, radius } from '../theme';

interface AmountInputProps {
  value: number; // integer poisha
  onChange: (paisa: number) => void;
  label?: string;
  placeholder?: string;
}

export function AmountInput({ value, onChange, label, placeholder = '0.00' }: AmountInputProps) {
  // Display as taka (2 decimal places), edit as taka, store as poisha
  const displayValue = value === 0 ? '' : formatTaka(value);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const float = parseFloat(cleaned);
    if (isNaN(float)) {
      onChange(0);
    } else {
      onChange(Math.round(float * 100));
    }
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.prefix}>৳</Text>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colours.textMuted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  prefix: { ...typography.body, color: colours.textMuted, marginRight: spacing.xs },
  input: { flex: 1, ...typography.bodyBold, color: colours.textPrimary },
});
