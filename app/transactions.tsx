import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getTransactionsForMonth, type TransactionWithCategory } from '../db/queries';
import { useFocusEffect } from 'expo-router';

const MONTH_NAMES_RO = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; year: string; month: string }>();
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);

  const type = params.type as 'income' | 'expense';
  const year = parseInt(params.year ?? String(new Date().getFullYear()), 10);
  const month = parseInt(params.month ?? String(new Date().getMonth() + 1), 10);

  useFocusEffect(
    useCallback(() => {
      const all = getTransactionsForMonth(year, month);
      setTransactions(all.filter((t) => t.type === type));
    }, [year, month, type])
  );

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const title = type === 'income' ? 'Venituri' : 'Cheltuieli';
  const titleColor = type === 'income' ? colors.income : colors.expense;

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {MONTH_NAMES_RO[month - 1]} {year}
          </Text>
        </View>
        <Text style={[styles.total, { color: titleColor }]}>
          {total.toLocaleString('ro-RO')} RON
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={type === 'income' ? 'trending-up-outline' : 'trending-down-outline'} size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nicio {type === 'income' ? 'sursă de venit' : 'cheltuială'} în {MONTH_NAMES_RO[month - 1]}.
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={[styles.txItem, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.txIcon, { backgroundColor: tx.category_color + '20' }]}>
                <Ionicons name={tx.category_icon as any} size={18} color={tx.category_color} />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txName, { color: colors.textPrimary }]}>{tx.note || tx.category_name}</Text>
                <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.category_name} · {formatDate(tx.date)}</Text>
              </View>
              <Text style={[styles.txAmount, { color: titleColor }]}>
                {tx.amount.toLocaleString('ro-RO')} RON
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 0.5 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { fontSize: fontSize.sm },
  total: { fontSize: fontSize.lg, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, marginTop: spacing.md },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderBottomWidth: 0.5 },
  txIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txName: { fontSize: fontSize.base, fontWeight: '600' },
  txDate: { fontSize: fontSize.xs },
  txAmount: { fontSize: fontSize.base, fontWeight: '600' },
});