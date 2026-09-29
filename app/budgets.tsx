import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  getAllCategoryBudgets, setCategoryBudget, deleteCategoryBudget,
  getAllCategories, type CategoryBudget, type Category,
} from '../db/queries';

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [limitInput, setLimitInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      setBudgets(getAllCategoryBudgets());
      setCategories(getAllCategories().filter((c) => c.type === 'expense'));
    }, [])
  );

  function handleSaveBudget() {
    const limit = parseFloat(limitInput.replace(',', '.'));
    if (!selectedCategory) { Alert.alert('Selectează o categorie'); return; }
    if (!limit || limit <= 0) { Alert.alert('Sumă invalidă', 'Introdu un buget mai mare decât 0.'); return; }
    setCategoryBudget(selectedCategory.id, limit);
    setLimitInput('');
    setSelectedCategory(null);
    setModalVisible(false);
    setBudgets(getAllCategoryBudgets());
  }

  function handleDeleteBudget(budget: CategoryBudget) {
    Alert.alert('Șterge bugetul', `Sigur vrei să ștergi bugetul pentru ${budget.category_name}?`, [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Șterge', style: 'destructive', onPress: () => {
        deleteCategoryBudget(budget.category_id);
        setBudgets(getAllCategoryBudgets());
      }},
    ]);
  }

  const categoriesWithoutBudget = categories.filter(
    (c) => !budgets.find((b) => b.category_id === c.id)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bugete lunare</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Setează limite lunare pe categorii și urmărește cheltuielile.
        </Text>

        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Niciun buget setat.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Apasă + ca să adaugi limite de cheltuieli pe categorii.
            </Text>
          </View>
        ) : (
          budgets.map((budget) => {
            const isOver = budget.percent > 100;
            const isWarning = budget.percent >= 80 && budget.percent <= 100;
            const barColor = isOver ? colors.expense : isWarning ? '#BA7517' : colors.income;
            const remaining = budget.monthly_limit - budget.spent_this_month;

            return (
              <View key={budget.id} style={[styles.budgetCard, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.budgetHeader}>
                  <View style={[styles.budgetIcon, { backgroundColor: budget.category_color + '20' }]}>
                    <Ionicons name={budget.category_icon as any} size={18} color={budget.category_color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.budgetName, { color: colors.textPrimary }]}>{budget.category_name}</Text>
                    <Text style={[styles.budgetAmounts, { color: colors.textSecondary }]}>
                      {budget.spent_this_month.toLocaleString('ro-RO')} / {budget.monthly_limit.toLocaleString('ro-RO')} RON
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteBudget(budget)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.progressBg, { backgroundColor: colors.background }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(budget.percent, 100)}%`, backgroundColor: barColor }]} />
                </View>

                <View style={styles.budgetFooter}>
                  <Text style={[styles.budgetPercent, { color: barColor }]}>{budget.percent}%</Text>
                  {isOver ? (
                    <Text style={[styles.budgetStatus, { color: colors.expense }]}>
                      ⚠️ Depășit cu {Math.abs(remaining).toLocaleString('ro-RO')} RON
                    </Text>
                  ) : isWarning ? (
                    <Text style={[styles.budgetStatus, { color: '#BA7517' }]}>
                      Atenție — mai ai {remaining.toLocaleString('ro-RO')} RON
                    </Text>
                  ) : (
                    <Text style={[styles.budgetStatus, { color: colors.textTertiary }]}>
                      Mai ai {remaining.toLocaleString('ro-RO')} RON
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Buget nou</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {categoriesWithoutBudget.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, { borderColor: isSelected ? cat.color : colors.border }, isSelected && { backgroundColor: cat.color + '20' }]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Ionicons name={cat.icon as any} size={14} color={isSelected ? cat.color : colors.textSecondary} />
                      <Text style={[styles.catChipText, { color: isSelected ? cat.color : colors.textSecondary }, isSelected && { fontWeight: '600' }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {categoriesWithoutBudget.length === 0 && (
                  <Text style={[styles.catChipText, { color: colors.textTertiary }]}>Toate categoriile au buget setat.</Text>
                )}
              </View>
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Limită lunară (RON)</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={limitInput}
              onChangeText={setLimitInput}
              placeholder="ex: 500"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setLimitInput(''); setSelectedCategory(null); setModalVisible(false); }}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleSaveBudget}>
                <Text style={styles.confirmText}>Salvează</Text>
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
  budgetCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  budgetIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  budgetName: { fontSize: fontSize.md, fontWeight: '600' },
  budgetAmounts: { fontSize: fontSize.sm, marginTop: 2 },
  progressBg: { height: 8, borderRadius: radius.sm, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', borderRadius: radius.sm },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetPercent: { fontSize: fontSize.sm, fontWeight: '700' },
  budgetStatus: { fontSize: fontSize.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: { fontSize: fontSize.base, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  catChipText: { fontSize: fontSize.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: fontSize.base, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  confirmText: { fontSize: fontSize.base, fontWeight: '600', color: '#FFFFFF' },
});