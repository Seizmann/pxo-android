import React, { useCallback, useEffect, useState } from 'react';
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
import type { SQLiteDatabase } from 'expo-sqlite';
import { listSellers } from '../db/repos/sellers';
import type { Seller } from '../types';
import { colours, spacing, typography, radius } from '../theme';

interface SellerPickerProps {
  db: SQLiteDatabase;
  value: string | null; // seller id
  onChange: (id: string, name: string) => void;
  label?: string;
}

export function SellerPicker({ db, value, onChange, label = 'Seller' }: SellerPickerProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const list = await listSellers(db);
    setSellers(list);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const selectedName = sellers.find((s) => s.id === value)?.name ?? 'Select seller…';
  const filtered = sellers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <View>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setVisible(true)} activeOpacity={0.7}>
          <Text style={[styles.text, !value && styles.placeholder]}>{selectedName}</Text>
          <Text>▾</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Seller</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search sellers…"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <ScrollView>
            {filtered.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.option}
                onPress={() => { onChange(s.id, s.name); setVisible(false); setSearch(''); }}
              >
                <Text style={styles.optionText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colours.textMuted, marginBottom: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colours.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colours.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 48,
  },
  text: { ...typography.body, color: colours.textPrimary },
  placeholder: { color: colours.textMuted },
  modal: { flex: 1, backgroundColor: colours.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  modalTitle: { ...typography.h3, color: colours.textPrimary },
  closeBtn: { fontSize: 20, color: colours.textMuted, padding: spacing.sm },
  search: {
    margin: spacing.md, borderWidth: 1, borderColor: colours.border,
    borderRadius: radius.md, padding: spacing.md, ...typography.body,
  },
  option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colours.divider },
  optionText: { ...typography.body, color: colours.textPrimary },
});
