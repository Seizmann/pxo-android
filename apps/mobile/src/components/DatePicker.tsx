import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colours, spacing, typography, radius } from '../theme';
import { formatEntryDate } from '../utils/dateFormat';

interface DatePickerProps {
  value: string; // ISO date YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
}

export function DatePicker({ value, onChange, label = 'Date' }: DatePickerProps) {
  const [show, setShow] = useState(false);

  const dateObj = new Date(value + 'T00:00:00');

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Text style={styles.text}>{formatEntryDate(value)}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShow(false);
            if (selected) onChange(selected.toISOString().slice(0, 10));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colours.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  text: { ...typography.body, color: colours.textPrimary },
  icon: { fontSize: 16 },
});
