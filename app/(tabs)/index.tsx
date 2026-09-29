import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal,RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SalaryCountdownCard from '../../components/SalaryCountdownCard';
import HomeSkeleton from '../../components/SkeletonLoader';
import { fontSize, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import {
  getAllCategoryBudgets,
  getCachedPrediction,
  getCategoryTotalsForMonth, getMonthSummary, getRecentTransactions,
  getSalaryCountdown,
  savePredictionToCache,
  setSetting,
  type CategoryBudget,
  type SalaryCountdown,
  type TransactionWithCategory,
} from '../../db/queries';
import { fetchAIPrediction } from '../../services/predictionApi';


interface CategoryTotal { category_id: number; category_name: string; color: string; total: number }

function formatTxDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Azi';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0 });
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [aiPrediction, setAiPrediction] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [salaryCountdown, setSalaryCountdown] = useState<SalaryCountdown | null>(null);
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [salaryDayInput, setSalaryDayInput] = useState('');
const [isLoading, setIsLoading] = useState(true);
const hasLoadedRef = useRef(false);
const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  setTransactions(getRecentTransactions(5));
  setSummary(getMonthSummary(year, month));
  setCategoryTotals(getCategoryTotalsForMonth(year, month) as CategoryTotal[]);
  setAiPrediction(getCachedPrediction());
  setSalaryCountdown(getSalaryCountdown());
  setIsLoading(false);
  setBudgets(getAllCategoryBudgets());
}, []);

useFocusEffect(
  useCallback(() => {
    if (isLoading) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    setTransactions(getRecentTransactions(5));
    setSummary(getMonthSummary(year, month));
    setCategoryTotals(getCategoryTotalsForMonth(year, month) as CategoryTotal[]);
    setAiPrediction(getCachedPrediction());
    setSalaryCountdown(getSalaryCountdown());
    setBudgets(getAllCategoryBudgets());
  }, [isLoading])
);

  const balance = summary.income - summary.expenses;
  const maxCategoryTotal = categoryTotals[0]?.total ?? 1;

 const [aiErrorMessage, setAiErrorMessage] = useState<string>('');

  function handleGeneratePrediction() {
    setAiLoading(true);
    setAiError(false);
    setAiErrorMessage('');
    fetchAIPrediction({ balance, monthlyIncome: summary.income, monthlyExpenses: summary.expenses })
      .then((p) => { setAiPrediction(p); savePredictionToCache(p); })
      .catch((err) => {
        setAiError(true);
        setAiErrorMessage(err.message ?? 'Nu am putut genera predicția. Încearcă din nou.');
      })
      .finally(() => setAiLoading(false));
  }

  function handleSaveSalaryDay() {
    const day = parseInt(salaryDayInput, 10);
    if (!day || day < 1 || day > 31) {
      Alert.alert('Zi invalidă', 'Introdu o zi între 1 și 31.');
      return;
    }
    setSetting('salary_day', String(day));
    setSalaryDayInput('');
    setSalaryModalVisible(false);
    setSalaryCountdown(getSalaryCountdown());
  }

  function handleRefresh() {
  setRefreshing(true);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  setTransactions(getRecentTransactions(5));
  setSummary(getMonthSummary(year, month));
  setCategoryTotals(getCategoryTotalsForMonth(year, month) as CategoryTotal[]);
  setAiPrediction(getCachedPrediction());
  setSalaryCountdown(getSalaryCountdown());
  setBudgets(getAllCategoryBudgets());
  setRefreshing(false);
}

     return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {isLoading ? (
        <HomeSkeleton />
      ) : (
<ScrollView
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  }
>
            {/* Header cu sold */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerLabel}>Sold disponibil</Text>
            <Text style={styles.headerBalance}>{balance.toLocaleString('ro-RO')} RON</Text>
          </View>

          

          {/* Card predicție AI */}
          <View style={[styles.aiCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.aiCardHeader}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.aiBadge, { color: colors.primary, backgroundColor: colors.primaryLight }]}>Predicție AI</Text>
            </View>
            {aiLoading ? (
              <Text style={[styles.aiBody, { color: colors.textSecondary }]}>Generăm predicția...</Text>
           ) : aiError ? (
  <Text style={[styles.aiBody, { color: colors.textSecondary }]}>{aiErrorMessage || 'Nu am putut genera predicția. Încearcă din nou.'}</Text>
            ) : aiPrediction ? (
              <Text style={[styles.aiBody, { color: colors.textSecondary }]}>{aiPrediction}</Text>
            ) : (
              <Text style={[styles.aiBody, { color: colors.textTertiary }]}>Apasă butonul pentru o predicție personalizată.</Text>
            )}
            <TouchableOpacity style={[styles.aiButton, { backgroundColor: colors.primaryLight }]} onPress={handleGeneratePrediction} disabled={aiLoading}>
              <Ionicons name="refresh" size={14} color={colors.primary} />
              <Text style={[styles.aiButtonText, { color: colors.primary }]}>{aiPrediction ? 'Regenerează' : 'Generează predicție'}</Text>
            </TouchableOpacity>
          </View>

          {/* Card până la salariu */}
          {salaryCountdown && (
            <SalaryCountdownCard
              data={salaryCountdown}
              onSetSalaryDay={() => setSalaryModalVisible(true)}
            />
          )}

          {/* Buton setare zi salariu dacă nu există încă */}
          {!salaryCountdown && (
            <TouchableOpacity
              style={[styles.salarySetupBtn, { borderColor: colors.border }]}
              onPress={() => setSalaryModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.salarySetupText, { color: colors.primary }]}>Setează ziua salariului</Text>
            </TouchableOpacity>
          )}

          {/* Statistici venituri/cheltuieli */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Luna aceasta</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Venituri</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.income.toLocaleString('ro-RO')} RON</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cheltuieli</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.expenses.toLocaleString('ro-RO')} RON</Text>
              </View>
            </View>
          </View>

          {/* Categorii top */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Categorii top</Text>
            {categoryTotals.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nicio cheltuială înregistrată încă luna asta.</Text>
            ) : categoryTotals.slice(0, 3).map((cat) => (
              <View key={cat.category_id} style={styles.catBlock}>
                <View style={styles.catRow}>
                  <Text style={[styles.catName, { color: colors.textSecondary }]}>{cat.category_name}</Text>
                  <Text style={[styles.catValue, { color: colors.textPrimary }]}>{cat.total.toLocaleString('ro-RO')} RON</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={[styles.progressFill, { width: `${Math.min((cat.total / maxCategoryTotal) * 100, 100)}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            ))}
          </View>

         {/* Bugete lunare */}
          {budgets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bugete lunare</Text>
              <TouchableOpacity onPress={() => router.push('/budgets')}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>Vezi toate</Text>
              </TouchableOpacity>
            </View>
            {budgets.slice(0, 3).map((budget) => {
              const isOver = budget.percent > 100;
              const isWarning = budget.percent >= 80 && budget.percent <= 100;
              const barColor = isOver ? colors.expense : isWarning ? '#BA7517' : colors.income;
              return (
                <TouchableOpacity
                  key={budget.id}
                  style={[styles.budgetRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => router.push('/budgets')}
                >
                  <View style={[styles.budgetIcon, { backgroundColor: budget.category_color + '20' }]}>
                    <Ionicons name={budget.category_icon as any} size={16} color={budget.category_color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.budgetLabelRow}>
                      <Text style={[styles.budgetName, { color: colors.textPrimary }]}>{budget.category_name}</Text>
                      <Text style={[styles.budgetAmount, { color: isOver ? colors.expense : colors.textSecondary }]}>
                        {budget.spent_this_month.toLocaleString('ro-RO')} / {budget.monthly_limit.toLocaleString('ro-RO')} RON
                      </Text>
                    </View>
                    <View style={[styles.budgetBar, { backgroundColor: colors.backgroundSecondary }]}>
                      <View style={[styles.budgetBarFill, { width: `${Math.min(budget.percent, 100)}%`, backgroundColor: barColor }]} />
                    </View>
                  </View>
                  {isOver && <Ionicons name="warning-outline" size={16} color={colors.expense} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

          {/* Tranzacții recente */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tranzacții recente</Text>
            {transactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nu ai nicio tranzacție încă.</Text>
            ) : transactions.map((tx) => (
              <TouchableOpacity key={tx.id} style={[styles.txItem, { borderBottomColor: colors.borderLight }]} onPress={() => router.push({ pathname: '/add', params: { editId: tx.id.toString() } })}>
                <View style={[styles.txIcon, { backgroundColor: tx.category_color + '20' }]}>
                  <Ionicons name={tx.category_icon as any} size={18} color={tx.category_color} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txName, { color: colors.textPrimary }]}>{tx.note || tx.category_name}</Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>{formatTxDate(tx.date)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.income : colors.expense }]}>
                  {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ro-RO')} RON
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}

      {/* Modal setare zi salariu */}
      <Modal visible={salaryModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm }}>
              Ziua salariului
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg }}>
              Pe ce zi a lunii primești salariul?
            </Text>
            <TextInput
              style={{ fontSize: 48, fontWeight: '700', textAlign: 'center', color: colors.textPrimary, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: spacing.sm, marginBottom: spacing.lg }}
              value={salaryDayInput}
              onChangeText={setSalaryDayInput}
              placeholder="10"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={2}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                onPress={() => { setSalaryDayInput(''); setSalaryModalVisible(false); }}
              >
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: colors.textSecondary }}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' }}
                onPress={handleSaveSalaryDay}
              >
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#FFFFFF' }}>Salvează</Text>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  headerLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs },
  headerBalance: { fontSize: fontSize.xxl, fontWeight: '600', color: '#FFFFFF' },
  aiCard: { marginHorizontal: spacing.lg, marginTop: -spacing.lg, borderRadius: radius.lg, borderWidth: 0.5, padding: spacing.md },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  aiBadge: { fontSize: fontSize.xs, fontWeight: '600', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  aiBody: { fontSize: fontSize.sm, lineHeight: 18 },
  aiButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill },
  aiButtonText: { fontSize: fontSize.xs, fontWeight: '600' },
  salarySetupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed' },
  salarySetupText: { fontSize: fontSize.sm, fontWeight: '600' },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.md },
  statLabel: { fontSize: fontSize.xs, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.lg, fontWeight: '600' },
  catBlock: { marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  catName: { fontSize: fontSize.sm },
  catValue: { fontSize: fontSize.sm, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: radius.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.sm },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 0.5 },
  txIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txName: { fontSize: fontSize.base, fontWeight: '600' },
  txDate: { fontSize: fontSize.xs },
  txAmount: { fontSize: fontSize.base, fontWeight: '600' },
  emptyText: { fontSize: fontSize.sm, fontStyle: 'italic', paddingVertical: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionLink: { fontSize: fontSize.sm, fontWeight: '600' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 0.5 },
  budgetIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  budgetName: { fontSize: fontSize.sm, fontWeight: '600' },
  budgetAmount: { fontSize: fontSize.xs },
  budgetBar: { height: 4, borderRadius: radius.sm, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: radius.sm },
});