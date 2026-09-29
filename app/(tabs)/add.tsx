import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import {
  addRecurringTransaction,
  addTransaction,
  CategoryBudget,
  deleteCategoryBudget,
  deleteRecurringTransaction,
  deleteTransaction,
  getActiveRecurringTransactions,
  getAllCategoryBudgets,
  getCategoriesByType, getRecentTransactions,
  getSetting,
  setCategoryBudget as saveCategoryBudget,
  updateTransaction,
  type Category,
  type RecurringTransaction,
  type TransactionType,
  type TransactionWithCategory,
} from '../../db/queries';
import { convertToRON } from '../../services/exchangeRate';


const CURRENCIES = ['RON', 'EUR', 'USD', 'GBP'];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RON');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingTx, setEditingTx] = useState<TransactionWithCategory | null>(null);

  // Recurente
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [recurringCategories, setRecurringCategories] = useState<Category[]>([]);
  const [recModalVisible, setRecModalVisible] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDay, setRecDay] = useState('1');
  const [recType, setRecType] = useState<TransactionType>('expense');
  const [recCategoryId, setRecCategoryId] = useState<number | null>(null);
  const [dayInput, setDayInput] = useState(String(parseInt(todayISO().split('-')[2], 10)));
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [showBudgets, setShowBudgets] = useState(false);
  const [budgetLimitInput, setBudgetLimitInput] = useState('');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<Category | null>(null);

  // Citim moneda salvată în setări
  useEffect(() => {
    const saved = getSetting('currency');
    if (saved) setCurrency(saved);
  }, []);

  useEffect(() => {
  setDayInput(String(parseInt(date.split('-')[2], 10)));
}, []);

  useEffect(() => {
    if (params.editId) {
      const allRecent = getRecentTransactions(100);
      const tx = allRecent.find((t) => t.id === parseInt(params.editId!, 10));
      if (tx) {
        setEditingTx(tx);
        setType(tx.type);
        setAmount(tx.amount.toString());
        setNote(tx.note ?? '');
        setDate(tx.date);
        setSelectedCategoryId(tx.category_id);
        setBudgets(getAllCategoryBudgets());
      }
    }
  }, [params.editId]);

  useFocusEffect(
    useCallback(() => {
      const cats = getCategoriesByType(type);
      setCategories(cats);
      if (!selectedCategoryId) setSelectedCategoryId(cats[0]?.id ?? null);
      setRecurring(getActiveRecurringTransactions());
      const rcats = getCategoriesByType('expense');
      setRecurringCategories(rcats);
      if (!recCategoryId && rcats.length > 0) setRecCategoryId(rcats[0].id);
    }, [type])
  );

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    const cats = getCategoriesByType(newType);
    setCategories(cats);
    setSelectedCategoryId(cats[0]?.id ?? null);
  }

  function handleRecTypeChange(newType: TransactionType) {
    setRecType(newType);
    const cats = getCategoriesByType(newType);
    setRecurringCategories(cats);
    setRecCategoryId(cats[0]?.id ?? null);
  }

  async function handleSubmit() {
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) { Alert.alert('Sumă invalidă', 'Introdu o sumă mai mare decât 0.'); return; }
    if (!selectedCategoryId) { Alert.alert('Categorie lipsă', 'Selectează o categorie.'); return; }

    let finalAmount = numericAmount;
    let finalNote = note.trim();

    // Conversie valutară dacă nu e RON
    if (currency !== 'RON') {
      try {
        const { amountRON, rate } = await convertToRON(numericAmount, currency);
        finalAmount = amountRON;
        finalNote = finalNote
          ? `${finalNote} (${numericAmount} ${currency} × ${rate.toFixed(4)})`
          : `${numericAmount} ${currency} × ${rate.toFixed(4)}`;
      } catch {
        Alert.alert('Eroare curs valutar', 'Nu am putut lua cursul valutar. Verifică conexiunea și încearcă din nou.');
        return;
      }
    }

    if (editingTx) {
      updateTransaction({ id: editingTx.id, amount: finalAmount, categoryId: selectedCategoryId, note: finalNote || undefined, date, type });
      Alert.alert('Actualizat', 'Tranzacția a fost modificată.', [{ text: 'OK', onPress: () => { resetForm(); router.push('/'); } }]);
    } else {
      addTransaction({ amount: finalAmount, categoryId: selectedCategoryId, note: finalNote || undefined, date, type });
      Alert.alert(
        'Salvat',
        currency !== 'RON' ? `${numericAmount} ${currency} = ${finalAmount.toLocaleString('ro-RO')} RON` : 'Tranzacția a fost adăugată.',
        [{ text: 'OK', onPress: () => resetForm() }]
      );
    }
  }

  function handleDelete() {
    if (!editingTx) return;
    Alert.alert('Șterge tranzacția', 'Sigur vrei să o ștergi?', [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Șterge', style: 'destructive', onPress: () => { deleteTransaction(editingTx.id); resetForm(); router.push('/'); } },
    ]);
  }

  function handleAddRecurring() {
    const amt = parseFloat(recAmount.replace(',', '.'));
    const day = parseInt(recDay, 10);
    if (!recName.trim()) { Alert.alert('Nume lipsă', 'Dă un nume recurentei.'); return; }
    if (!amt || amt <= 0) { Alert.alert('Sumă invalidă', 'Introdu o sumă validă.'); return; }
    if (!day || day < 1 || day > 31) { Alert.alert('Zi invalidă', 'Introdu o zi între 1 și 31.'); return; }
    if (!recCategoryId) { Alert.alert('Categorie lipsă', 'Selectează o categorie.'); return; }
    addRecurringTransaction({ name: recName.trim(), amount: amt, categoryId: recCategoryId, frequency: 'monthly', dayOfMonth: day, type: recType });
    setRecName(''); setRecAmount(''); setRecDay('1');
    setRecModalVisible(false);
    setRecurring(getActiveRecurringTransactions());
  }

  function handleDeleteRecurring(rec: RecurringTransaction) {
    Alert.alert('Șterge recurenta', `Sigur vrei să ștergi "${rec.name}"?`, [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Șterge', style: 'destructive', onPress: () => { deleteRecurringTransaction(rec.id); setRecurring(getActiveRecurringTransactions()); } },
    ]);
  }

  function resetForm() {
    setEditingTx(null);
    setAmount('');
    setNote('');
    setDate(todayISO());
    setType('expense');
    const saved = getSetting('currency');
    setCurrency(saved ?? 'RON');
  }

  function handleSaveBudget() {
  const limit = parseFloat(budgetLimitInput.replace(',', '.'));
  if (!selectedBudgetCategory) { Alert.alert('Selectează o categorie'); return; }
  if (!limit || limit <= 0) { Alert.alert('Sumă invalidă', 'Introdu un buget mai mare decât 0.'); return; }
  saveCategoryBudget(selectedBudgetCategory.id, limit);
  setBudgetLimitInput('');
  setSelectedBudgetCategory(null);
  setBudgetModalVisible(false);
  setBudgets(getAllCategoryBudgets());
}

function handleDeleteBudget(categoryId: number) {
  deleteCategoryBudget(categoryId);
  setBudgets(getAllCategoryBudgets());
}

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={80}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editingTx ? 'Editează tranzacție' : 'Adaugă tranzacție'}
            </Text>
            {editingTx && (
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color={colors.expense} />
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle Cheltuială / Venit */}
          <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity style={[styles.typeButton, type === 'expense' && { backgroundColor: colors.expenseLight }]} onPress={() => handleTypeChange('expense')}>
              <Text style={[styles.typeButtonText, { color: colors.textSecondary }, type === 'expense' && { color: colors.textPrimary, fontWeight: '700' }]}>Cheltuială</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeButton, type === 'income' && { backgroundColor: colors.incomeLight }]} onPress={() => handleTypeChange('income')}>
              <Text style={[styles.typeButtonText, { color: colors.textSecondary }, type === 'income' && { color: colors.textPrimary, fontWeight: '700' }]}>Venit</Text>
            </TouchableOpacity>
          </View>

          {/* Sumă + Selector monedă */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sumă</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.amountInput, { color: colors.textPrimary, borderBottomColor: colors.border, flex: 1 }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
              <View style={styles.currencySelector}>
                {CURRENCIES.map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    style={[
                      styles.currencyChip,
                      { borderColor: currency === cur ? colors.primary : colors.border },
                      currency === cur && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setCurrency(cur)}
                  >
                    <Text style={[styles.currencyChipText, { color: currency === cur ? colors.primary : colors.textSecondary }]}>
                      {cur}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {currency !== 'RON' && (
              <Text style={[styles.currencyHint, { color: colors.textTertiary }]}>
                Suma va fi convertită automat la RON la cursul zilei.
              </Text>
            )}
          </View>

                    {/* Dată */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Dată</Text>
            <View style={styles.datePickerRow}>
                             {/* Zi */}
              <View style={[styles.datePickerBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.datePickerLabel, { color: colors.textTertiary }]}>Zi</Text>
                <TextInput
                  style={[styles.datePickerInput, { color: colors.textPrimary }]}
                  value={dayInput}
                  onChangeText={(val) => {
                    if (val === '') { setDayInput(''); return; }
                    const day = parseInt(val, 10);
                    if (isNaN(day)) return;
                    if (day > 31) return;
                    setDayInput(String(day));
                    if (day >= 1) {
                      const parts = date.split('-');
                      setDate(`${parts[0]}-${parts[1]}-${String(day).padStart(2, '0')}`);
                    }
                  }}
                  onBlur={() => {
                    const day = parseInt(dayInput, 10);
                    const validDay = (!isNaN(day) && day >= 1 && day <= 31) ? day : 1;
                    setDayInput(String(validDay));
                    const parts = date.split('-');
                    setDate(`${parts[0]}-${parts[1]}-${String(validDay).padStart(2, '0')}`);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  textAlign="center"
                />
              </View>

                                        {/* Lună */}
              <View style={[styles.datePickerBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.datePickerLabel, { color: colors.textTertiary }]}>Lună</Text>
                <View style={styles.datePickerArrows}>
                  <Pressable onPress={() => {
                    const parts = date.split('-');
                    let m = parseInt(parts[1], 10) - 1;
                    let y = parseInt(parts[0], 10);
                    if (m < 1) { m = 12; y--; }
                    setDate(`${y}-${String(m).padStart(2, '0')}-${parts[2]}`);
                  }} hitSlop={8}>
                    <Ionicons name="chevron-back" size={16} color={colors.primary} />
                  </Pressable>
                  <Text style={[styles.datePickerValue, { color: colors.textPrimary }]}>
                    {parseInt(date.split('-')[1], 10)}
                  </Text>
                  <Pressable onPress={() => {
                    const parts = date.split('-');
                    let m = parseInt(parts[1], 10) + 1;
                    let y = parseInt(parts[0], 10);
                    if (m > 12) { m = 1; y++; }
                    const now = new Date();
                    const curYear = now.getFullYear();
                    const curMonth = now.getMonth() + 1;
                    if (y < curYear || (y === curYear && m <= curMonth)) {
                      setDate(`${y}-${String(m).padStart(2, '0')}-${parts[2]}`);
                    }
                  }} hitSlop={8}>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              </View>

              {/* An */}
              <View style={[styles.datePickerBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.datePickerLabel, { color: colors.textTertiary }]}>An</Text>
                <View style={styles.datePickerArrows}>
                  <Pressable onPress={() => {
                    const parts = date.split('-');
                    setDate(`${parseInt(parts[0], 10) - 1}-${parts[1]}-${parts[2]}`);
                  }}>
                    <Ionicons name="chevron-back" size={16} color={colors.primary} />
                  </Pressable>
                  <Text style={[styles.datePickerValue, { color: colors.textPrimary }]}>
                    {date.split('-')[0]}
                  </Text>
                  <Pressable onPress={() => {
                    const parts = date.split('-');
                    const newDate = `${parseInt(parts[0], 10) + 1}-${parts[1]}-${parts[2]}`;
                    if (newDate <= todayISO()) setDate(newDate);
                  }}>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Categorie */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, { borderColor: colors.border }, isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Ionicons name={cat.icon as any} size={16} color={isSelected ? cat.color : colors.textSecondary} />
                    <Text style={[styles.categoryChipText, { color: colors.textSecondary }, isSelected && { color: cat.color, fontWeight: '600' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notă */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Notă (opțional)</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border }]}
              value={note}
              onChangeText={setNote}
              placeholder="ex: Glovo, cină cu prietenii..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Buton salvare */}
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>{editingTx ? 'Salvează modificările' : 'Salvează'}</Text>
          </TouchableOpacity>

          {editingTx && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={() => { resetForm(); router.push('/'); }}>
              <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>Anulează editarea</Text>
            </TouchableOpacity>
          )}

          {/* Secțiunea Recurente */}
          <TouchableOpacity style={[styles.recurringToggle, { borderColor: colors.border }]} onPress={() => setShowRecurring(!showRecurring)}>
            <View style={styles.recurringToggleLeft}>
              <Ionicons name="repeat-outline" size={18} color={colors.primary} />
              <Text style={[styles.recurringToggleText, { color: colors.textPrimary }]}>Tranzacții recurente</Text>
              <View style={[styles.recurringBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.recurringBadgeText, { color: colors.primary }]}>{recurring.length}</Text>
              </View>
            </View>
            <Ionicons name={showRecurring ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {showRecurring && (
            <View style={styles.recurringSection}>
              {recurring.length === 0 ? (
                <Text style={[styles.recurringEmpty, { color: colors.textTertiary }]}>
                  Nicio recurentă adăugată. Adaugă chirie, Netflix, salariu — orice se repetă lunar.
                </Text>
              ) : (
                recurring.map((rec) => (
                  <View key={rec.id} style={[styles.recCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recName, { color: colors.textPrimary }]}>{rec.name}</Text>
                      <Text style={[styles.recDetail, { color: colors.textSecondary }]}>
                        {rec.amount.toLocaleString('ro-RO')} RON · pe {rec.day_of_month} ale lunii · {rec.type === 'expense' ? 'cheltuială' : 'venit'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteRecurring(rec)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity style={[styles.addRecurringBtn, { backgroundColor: colors.primaryLight }]} onPress={() => setRecModalVisible(true)}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addRecurringText, { color: colors.primary }]}>Adaugă recurentă</Text>
              </TouchableOpacity>
            </View>
          )}
                    {/* Secțiunea Bugete */}
          <TouchableOpacity
            style={[styles.recurringToggle, { borderColor: colors.border, marginTop: spacing.sm }]}
            onPress={() => setShowBudgets(!showBudgets)}
          >
            <View style={styles.recurringToggleLeft}>
              <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
              <Text style={[styles.recurringToggleText, { color: colors.textPrimary }]}>Bugete lunare</Text>
              <View style={[styles.recurringBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.recurringBadgeText, { color: colors.primary }]}>{budgets.length}</Text>
              </View>
            </View>
            <Ionicons name={showBudgets ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {showBudgets && (
            <View style={styles.recurringSection}>
              {budgets.length === 0 ? (
                <Text style={[styles.recurringEmpty, { color: colors.textTertiary }]}>
                  Niciun buget setat. Adaugă limite lunare pe categorii.
                </Text>
              ) : (
                budgets.map((budget) => {
                  const isOver = budget.percent > 100;
                  const isWarning = budget.percent >= 80;
                  const barColor = isOver ? colors.expense : isWarning ? '#BA7517' : colors.income;
                  return (
                    <View key={budget.id} style={[styles.recCard, { backgroundColor: colors.backgroundSecondary }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={[styles.recName, { color: colors.textPrimary }]}>{budget.category_name}</Text>
                          <Text style={[styles.recDetail, { color: isOver ? colors.expense : colors.textSecondary }]}>
                            {budget.spent_this_month.toLocaleString('ro-RO')} / {budget.monthly_limit.toLocaleString('ro-RO')} RON
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: colors.background, borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ width: `${Math.min(budget.percent, 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: 2 }} />
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteBudget(budget.category_id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
              <TouchableOpacity
                style={[styles.addRecurringBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setBudgetModalVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addRecurringText, { color: colors.primary }]}>Adaugă buget</Text>
              </TouchableOpacity>
            </View>
          )}
                {/* Modal adaugă buget */}
      <Modal visible={budgetModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Buget nou</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {categories.filter((c) => !budgets.find((b) => b.category_id === c.id)).map((cat) => {
                  const isSelected = selectedBudgetCategory?.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, { borderColor: isSelected ? cat.color : colors.border }, isSelected && { backgroundColor: cat.color + '20' }]}
                      onPress={() => setSelectedBudgetCategory(cat)}
                    >
                      <Ionicons name={cat.icon as any} size={14} color={isSelected ? cat.color : colors.textSecondary} />
                      <Text style={[styles.categoryChipText, { color: isSelected ? cat.color : colors.textSecondary }, isSelected && { fontWeight: '600' }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Limită lunară (RON)</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border, marginBottom: spacing.md }]}
              value={budgetLimitInput}
              onChangeText={setBudgetLimitInput}
              placeholder="ex: 500"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.cancelEditButton, { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md }]}
                onPress={() => { setBudgetLimitInput(''); setSelectedBudgetCategory(null); setBudgetModalVisible(false); }}
              >
                <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { flex: 1, marginHorizontal: 0, marginTop: 0 }]}
                onPress={handleSaveBudget}
              >
                <Text style={styles.submitButtonText}>Salvează</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal adaugă recurentă */}
      <Modal visible={recModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Recurentă nouă</Text>

            <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity style={[styles.typeButton, recType === 'expense' && { backgroundColor: colors.expenseLight }]} onPress={() => handleRecTypeChange('expense')}>
                <Text style={[styles.typeButtonText, { color: recType === 'expense' ? colors.textPrimary : colors.textSecondary }, recType === 'expense' && { fontWeight: '700' }]}>Cheltuială</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, recType === 'income' && { backgroundColor: colors.incomeLight }]} onPress={() => handleRecTypeChange('income')}>
                <Text style={[styles.typeButtonText, { color: recType === 'income' ? colors.textPrimary : colors.textSecondary }, recType === 'income' && { fontWeight: '700' }]}>Venit</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Nume</Text>
            <TextInput style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border }]} value={recName} onChangeText={setRecName} placeholder="ex: Netflix, Chirie, Salariu" placeholderTextColor={colors.textTertiary} />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Sumă (RON)</Text>
                <TextInput style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border }]} value={recAmount} onChangeText={setRecAmount} placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
              </View>
              <View style={{ width: 80 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Ziua</Text>
                <TextInput style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border, textAlign: 'center' }]} value={recDay} onChangeText={setRecDay} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
            <View style={[styles.categoryGrid, { marginBottom: spacing.md }]}>
              {recurringCategories.map((cat) => {
                const sel = cat.id === recCategoryId;
                return (
                  <TouchableOpacity key={cat.id} style={[styles.categoryChip, { borderColor: sel ? cat.color : colors.border }, sel && { backgroundColor: cat.color + '20' }]} onPress={() => setRecCategoryId(cat.id)}>
                    <Ionicons name={cat.icon as any} size={14} color={sel ? cat.color : colors.textSecondary} />
                    <Text style={[styles.categoryChipText, { color: sel ? cat.color : colors.textSecondary }, sel && { fontWeight: '600' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={[styles.cancelEditButton, { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md }]} onPress={() => setRecModalVisible(false)}>
                <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { flex: 1, marginHorizontal: 0, marginTop: 0 }]} onPress={handleAddRecurring}>
                <Text style={styles.submitButtonText}>Adaugă</Text>
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  typeToggle: { flexDirection: 'row', marginHorizontal: spacing.lg, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  typeButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  typeButtonText: { fontSize: fontSize.base, fontWeight: '500' },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm, marginTop: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  amountInput: { fontSize: 36, fontWeight: '700', paddingVertical: spacing.sm, borderBottomWidth: 2 },
  currencySelector: { flexDirection: 'column', gap: 4, paddingBottom: spacing.sm },
  currencyChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  currencyChipText: { fontSize: fontSize.xs, fontWeight: '600' },
  currencyHint: { fontSize: fontSize.xs, marginTop: spacing.xs, fontStyle: 'italic' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  datePickerRow: { flexDirection: 'row', gap: spacing.sm },
  datePickerBox: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  datePickerLabel: { fontSize: fontSize.xs, marginBottom: 4 },
  datePickerInput: { fontSize: fontSize.lg, fontWeight: '700', width: '100%', textAlign: 'center' },
  datePickerArrows: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  datePickerValue: { fontSize: fontSize.md, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  dateText: { flex: 1, fontSize: fontSize.md, fontWeight: '600', textAlign: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  categoryChipText: { fontSize: fontSize.sm },
  noteInput: { fontSize: fontSize.base, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  submitButton: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: '#534AB7' },
  submitButtonText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' },
  cancelEditButton: { marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  cancelEditText: { fontSize: fontSize.base },
  recurringToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.md },
  recurringToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recurringToggleText: { fontSize: fontSize.base, fontWeight: '600' },
  recurringBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  recurringBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  recurringSection: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  recurringEmpty: { fontSize: fontSize.sm, fontStyle: 'italic', paddingVertical: spacing.sm },
  recCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  recName: { fontSize: fontSize.base, fontWeight: '600' },
  recDetail: { fontSize: fontSize.sm, marginTop: 2 },
  addRecurringBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.sm },
  addRecurringText: { fontSize: fontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
});