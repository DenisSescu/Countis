import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { spacing, radius, fontSize } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getCategoryTotalsForMonth, getMonthSummary, getMonthlyTrend, type MonthlyTrend } from '../../db/queries';
import DonutChart from '../../components/DonutChart';
import TrendBarChart from '../../components/TrendBarChart';
import { Ionicons } from '@expo/vector-icons';


interface CategoryTotal { category_id: number; category_name: string; color: string; total: number }
const MONTH_NAMES_RO = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0 });
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    setCategoryTotals(getCategoryTotalsForMonth(year, month) as CategoryTotal[]);
    setSummary(getMonthSummary(year, month));
    setTrend(getMonthlyTrend(6));
  }, [year, month]));

  function goToPreviousMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function goToNextMonth() {
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrent) return;
    if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const totalExpenses = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Analiză</Text>

        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{MONTH_NAMES_RO[month - 1]} {year}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow} disabled={isCurrentMonth}>
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.textTertiary : colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Cheltuieli pe categorii</Text>
          {categoryTotals.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nicio cheltuială în luna selectată.</Text>
          ) : (
            <View style={styles.donutSection}>
              <DonutChart data={categoryTotals.map((c) => ({ value: c.total, color: c.color }))} centerValue={`${totalExpenses.toLocaleString('ro-RO')}`} centerLabel="RON" />
              <View style={styles.categoryList}>
                {categoryTotals.map((cat) => {
                  const percent = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;
                  return (
                    <View key={cat.category_id} style={styles.categoryRow}>
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>{cat.category_name}</Text>
                      <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>{percent}%</Text>
                      <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>{cat.total.toLocaleString('ro-RO')} RON</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

               <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.incomeLight }]}
            onPress={() => router.push({ pathname: '/transactions', params: { type: 'income', year: String(year), month: String(month) } })}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Venituri</Text>
            <Text style={[styles.statValue, { color: colors.income }]}>{summary.income.toLocaleString('ro-RO')} RON</Text>
            <Text style={[styles.statHint, { color: colors.income }]}>Vezi toate →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.expenseLight }]}
            onPress={() => router.push({ pathname: '/transactions', params: { type: 'expense', year: String(year), month: String(month) } })}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cheltuieli</Text>
            <Text style={[styles.statValue, { color: colors.expense }]}>{summary.expenses.toLocaleString('ro-RO')} RON</Text>
            <Text style={[styles.statHint, { color: colors.expense }]}>Vezi toate →</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Trend ultimele 6 luni</Text>
          <TrendBarChart data={trend} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: fontSize.xl, fontWeight: '700', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.md },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  monthArrow: { padding: spacing.xs },
  monthLabel: { fontSize: fontSize.md, fontWeight: '600', minWidth: 140, textAlign: 'center' },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  donutSection: { alignItems: 'center' },
  categoryList: { width: '100%', marginTop: spacing.lg },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { flex: 1, fontSize: fontSize.sm },
  categoryPercent: { fontSize: fontSize.xs, width: 36, textAlign: 'right' },
  categoryAmount: { fontSize: fontSize.sm, fontWeight: '600', width: 90, textAlign: 'right' },
  emptyText: { fontSize: fontSize.sm, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.md },
  statHint: { fontSize: fontSize.xs, marginTop: 2, fontWeight: '500' },
  statLabel: { fontSize: fontSize.xs, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.md, fontWeight: '700' },
});
