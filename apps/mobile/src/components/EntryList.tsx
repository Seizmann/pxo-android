import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colours, spacing, typography, radius } from '../theme';
import { formatTimestamp } from '../utils/dateFormat';

export interface EntryItem {
  id: string;
  title: string;
  subtitle?: string;
  amount?: string;
  timestamp: string; // created_at or updated_at ISO
  archived?: boolean;
}

interface EntryListProps {
  items: EntryItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  emptyMessage?: string;
}

export function EntryList({ items, onEdit, onDelete, onRestore, emptyMessage = 'No entries yet.' }: EntryListProps) {
  if (items.length === 0) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={[styles.card, item.archived && styles.cardArchived]}>
          <TouchableOpacity style={styles.main} onPress={() => onEdit(item.id)} activeOpacity={0.7}>
            <View style={styles.textCol}>
              <Text style={styles.title}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
              <Text style={styles.ts}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            {item.amount ? <Text style={styles.amount}>{item.amount}</Text> : null}
          </TouchableOpacity>
          <View style={styles.actions}>
            {item.archived && onRestore ? (
              <TouchableOpacity style={styles.restoreBtn} onPress={() => onRestore(item.id)}>
                <Text style={styles.restoreText}>Restore</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id)}>
              <Text style={styles.deleteText}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { ...typography.body, color: colours.textMuted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.md,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardArchived: { opacity: 0.6, borderLeftWidth: 3, borderLeftColor: colours.archived },
  main: { flex: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textCol: { flex: 1 },
  title: { ...typography.bodyBold, color: colours.textPrimary },
  subtitle: { ...typography.caption, color: colours.textSecondary },
  ts: { ...typography.caption, color: colours.textMuted, marginTop: 2 },
  amount: { ...typography.bodyBold, color: colours.primary },
  actions: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { padding: spacing.md, minWidth: 48, alignItems: 'center' },
  deleteText: { fontSize: 18 },
  restoreBtn: {
    padding: spacing.sm,
    backgroundColor: colours.primaryLight,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
  },
  restoreText: { ...typography.captionBold, color: colours.textOnPrimary },
});
