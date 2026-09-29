import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getActiveRecurringTransactions, addRecurringTransaction, deleteRecurringTransaction, getCategoriesByType, type RecurringTransaction, type Category, type TransactionType } from '../db/queries';

export default function RecurringScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDay, setNewDay] = useState('1');
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    setRecurring(getActiveRecurringTransactions());
    const cats = getCategoriesByType('expense');
    setCategories(cats);
    if (!newCategoryId && cats.length > 0) setNewCategoryId(cats[0].id);
  }, []));

  function handleTypeChange(type: TransactionType) {
    setNewType(type);
    const cats = getCategoriesByType(type);
    setCategories(cats);
    setNewCategoryId(cats[0]?.id ?? null);
  }

  function handleAdd() {
    const amount = parseFloat(newAmount.replace(',', '.'));
    const day = parseInt(newDay, 10);
    if (!newName.trim()) { Alert.alert('Nume lipsă', 'Dă un nume.'); return; }
    if (!amount || amount <= 0) { Alert.alert('Sumă invalidă', 'Introdu o sumă validă.'); return; }
    if (!day || day < 1 || day > 31) { Alert.alert('Zi invalidă', 'Introdu o zi între 1 și 31.'); return; }
    if (!newCategoryId) { Alert.alert('Categorie lipsă', 'Selectează o categorie.'); return; }
    addRecurringTransaction({ name: newName.trim(), amount, categoryId: newCategoryId, frequency: 'monthly', dayOfMonth: day, type: newType });
    setNewName(''); setNewAmount(''); setNewDay('1');
    setModalVisible(false);
    setRecurring(getActiveRecurringTransactions());
  }

  function handleDelete(rec: RecurringTransaction) {
    Alert.alert('Șterge recurenta', `Sigur vrei să ștergi "${rec.name}"?`, [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Șterge', style: 'destructive', onPress: () => { deleteRecurringTransaction(rec.id); setRecurring(getActiveRecurringTransactions()); } },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Recurente</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Cheltuielile și veniturile recurente se adaugă automat în fiecare lună.</Text>

        {recurring.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nicio recurentă setată.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Adaugă chirie, abonamente, salariu.</Text>
          </View>
        ) : (
          recurring.map((rec) => (
            <View key={rec.id} style={[styles.recCard, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recName, { color: colors.textPrimary }]}>{rec.name}</Text>
                <Text style={[styles.recDetail, { color: colors.textSecondary }]}>
                  {rec.amount.toLocaleString('ro-RO')} RON · pe {rec.day_of_month} ale lunii · {rec.type === 'expense' ? 'cheltuială' : 'venit'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(rec)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Recurentă nouă</Text>

            <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity style={[styles.typeBtn, newType === 'expense' && { backgroundColor: colors.expenseLight }]} onPress={() => handleTypeChange('expense')}>
                <Text style={[styles.typeBtnText, { color: newType === 'expense' ? colors.textPrimary : colors.textSecondary }]}>Cheltuială</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, newType === 'income' && { backgroundColor: colors.incomeLight }]} onPress={() => handleTypeChange('income')}>
                <Text style={[styles.typeBtnText, { color: newType === 'income' ? colors.textPrimary : colors.textSecondary }]}>Venit</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Nume</Text>
            <TextInput style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} value={newName} onChangeText={setNewName} placeholder="ex: Netflix, Chirie" placeholderTextColor={colors.textTertiary} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Sumă (RON)</Text>
                <TextInput style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} value={newAmount} onChangeText={setNewAmount} placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
              </View>
              <View style={{ width: 80 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Ziua</Text>
                <TextInput style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, textAlign: 'center' }]} value={newDay} onChangeText={setNewDay} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const sel = cat.id === newCategoryId;
                return (
                  <TouchableOpacity key={cat.id} style={[styles.chip, { borderColor: sel ? cat.color : colors.border }, sel && { backgroundColor: cat.color + '20' }]} onPress={() => setNewCategoryId(cat.id)}>
                    <Ionicons name={cat.icon as any} size={14} color={sel ? cat.color : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: sel ? cat.color : colors.textSecondary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
                <Text style={styles.confirmText}>Adaugă</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: fontSize.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs },
  recCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg },
  recName: { fontSize: fontSize.md, fontWeight: '600' },
  recDetail: { fontSize: fontSize.sm, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  typeToggle: { flexDirection: 'row', borderRadius: radius.md, padding: 4, marginBottom: spacing.md },
  typeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  typeBtnText: { fontSize: fontSize.base, fontWeight: '500' },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { fontSize: fontSize.base, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { fontSize: fontSize.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: fontSize.base, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  confirmText: { fontSize: fontSize.base, fontWeight: '600', color: '#FFFFFF' },
});
