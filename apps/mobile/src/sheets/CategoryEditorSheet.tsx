import React from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ExpenseCategory } from '../types';
import { colours, spacing, typography, radius } from '../theme';

interface CategoryEditorSheetProps {
  visible: boolean;
  categories: ExpenseCategory[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function CategoryEditorSheet({
  visible,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: CategoryEditorSheetProps) {
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Expense Categories</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Add new */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="New category name…"
              placeholderTextColor={colours.textMuted}
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(''); } }}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {categories.filter((c) => c.archived_at === null).map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              {editingId === cat.id ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => { onEdit(cat.id, editingName); setEditingId(null); }}>
                    <Text style={styles.saveBtn}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={styles.cancelBtn}>✕</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <TouchableOpacity onPress={() => { setEditingId(cat.id); setEditingName(cat.name); }}>
                    <Text style={styles.editBtn}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(cat.id)}>
                    <Text style={styles.deleteBtn}>🗑</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colours.divider },
  title: { ...typography.h3, color: colours.textPrimary },
  closeBtn: { ...typography.bodyBold, color: colours.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  addInput: { flex: 1, borderWidth: 1, borderColor: colours.border, borderRadius: radius.md, padding: spacing.sm, ...typography.body, color: colours.textPrimary, minHeight: 44 },
  addBtn: { backgroundColor: colours.primary, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md, justifyContent: 'center' },
  addBtnText: { ...typography.button, color: colours.textOnPrimary },
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colours.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  catName: { ...typography.body, color: colours.textPrimary, flex: 1 },
  editInput: { flex: 1, borderWidth: 1, borderColor: colours.primaryLight, borderRadius: radius.sm, padding: spacing.xs, ...typography.body, color: colours.textPrimary },
  saveBtn: { ...typography.bodyBold, color: colours.primary, paddingHorizontal: spacing.sm },
  cancelBtn: { ...typography.body, color: colours.textMuted, paddingHorizontal: spacing.sm },
  editBtn: { fontSize: 18, paddingHorizontal: spacing.xs },
  deleteBtn: { fontSize: 18, paddingHorizontal: spacing.xs },
});
