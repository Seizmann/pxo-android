import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colours, spacing, typography, radius } from '../theme';

interface DeleteConfirmSheetProps {
  visible: boolean;
  onPermanent: () => void;
  onArchive: () => void;
  onCancel: () => void;
  itemName?: string;
}

export function DeleteConfirmSheet({
  visible,
  onPermanent,
  onArchive,
  onCancel,
  itemName = 'this entry',
}: DeleteConfirmSheetProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Delete {itemName}?</Text>
        <Text style={styles.sub}>Choose how to remove it:</Text>

        <TouchableOpacity style={[styles.btn, styles.archiveBtn]} onPress={onArchive}>
          <Text style={styles.archiveText}>Archive</Text>
          <Text style={styles.btnSub}>Hidden from calculations, restorable from History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.permanentBtn]} onPress={onPermanent}>
          <Text style={styles.permanentText}>Permanent Delete</Text>
          <Text style={styles.btnSub}>Removes the record. Balances and stock update.</Text>
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
  btn: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  archiveBtn: { backgroundColor: colours.surfaceVariant },
  permanentBtn: { backgroundColor: '#FFEBEE' },
  archiveText: { ...typography.bodyBold, color: colours.textPrimary },
  permanentText: { ...typography.bodyBold, color: colours.error },
  btnSub: { ...typography.caption, color: colours.textMuted },
  cancelBtn: { alignItems: 'center', padding: spacing.md },
  cancelText: { ...typography.bodyBold, color: colours.textSecondary },
});
