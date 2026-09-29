import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface TrendBarChartProps { data: { label: string; income: number; expenses: number }[]; }

export default function TrendBarChart({ data }: TrendBarChartProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1);
  const chartHeight = 120;

  return (
    <View>
      <View style={styles.chartRow}>
        {data.map((item, i) => (
          <View key={i} style={styles.barGroup}>
            <View style={[styles.barsContainer, { height: chartHeight }]}>
              <View style={[styles.bar, { backgroundColor: colors.income, height: Math.max((item.income / maxValue) * chartHeight, 2) }]} />
              <View style={[styles.bar, { backgroundColor: colors.expense, height: Math.max((item.expenses / maxValue) * chartHeight, 2) }]} />
            </View>
            <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.income }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>Venituri</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.expense }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>Cheltuieli</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.xs },
  barGroup: { alignItems: 'center', flex: 1 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: spacing.xs },
  bar: { width: 8, borderRadius: 3 },
  barLabel: { fontSize: fontSize.xs },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs },
});
