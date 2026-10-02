import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colours, spacing, typography, radius } from '../theme';

interface RestoreModeSheetProps {
  visible: boolean;
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export function RestoreModeSheet({ visible, onReplace, onMerge, onCancel }: RestoreModeSheetProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Restore Backup</Text>
        <Text style={styles.sub}>Choose how to restore:</Text>

        <TouchableOpacity style={[styles.btn, styles.mergeBtn]} onPress={onMerge}>
          <Text style={styles.mergeBtnText}>Merge</Text>
          <Text style={styles.btnSub}>Add backup records to current data. Newer record wins on conflict.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.replaceBtn]} onPress={onReplace}>
          <Text style={styles.replaceBtnText}>Replace All</Text>
          <Text style={styles.btnSub}>Wipe current data and load backup. This cannot be undone.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: colours.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.h3, color: colours.textPrimary },
  sub: { ...typography.body, color: colours.textSecondary },
  btn: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
  mergeBtn: { backgroundColor: colours.surfaceVariant },
  replaceBtn: { backgroundColor: '#FFEBEE' },
  mergeBtnText: { ...typography.bodyBold, color: colours.textPrimary },
  replaceBtnText: { ...typography.bodyBold, color: colours.error },
  btnSub: { ...typography.caption, color: colours.textMuted },
  cancelBtn: { alignItems: 'center', padding: spacing.md },
  cancelText: { ...typography.bodyBold, color: colours.textSecondary },
});
