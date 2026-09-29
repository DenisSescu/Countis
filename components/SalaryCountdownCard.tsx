import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { type SalaryCountdown } from '../db/queries';

interface Props {
  data: SalaryCountdown;
  onSetSalaryDay: () => void;
}

export default function SalaryCountdownCard({ data, onSetSalaryDay }: Props) {
  const { colors } = useTheme();
  const progressPercent = Math.min((data.daysIntoMonth / data.totalDaysInMonth) * 100, 100);
  const budgetColor = data.dailyBudget < 50 ? colors.expense : data.dailyBudget < 100 ? '#BA7517' : colors.income;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textSecondary }]}>Până la salariu</Text>
        </View>
        <TouchableOpacity onPress={onSetSalaryDay} hitSlop={8}>
          <Ionicons name="settings-outline" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {data.daysUntilSalary === 0 ? (
        <Text style={[styles.salaryDay, { color: colors.income }]}>🎉 Azi e ziua salariului!</Text>
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{data.daysUntilSalary}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>zile rămase</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{data.availableAmount.toLocaleString('ro-RO')}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>RON disponibili</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: budgetColor }]}>{data.dailyBudget.toLocaleString('ro-RO')}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>RON/zi</Text>
          </View>
        </View>
      )}

      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
          Ziua {data.daysIntoMonth} din {data.totalDaysInMonth}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: fontSize.sm, fontWeight: '600' },
  salaryDay: { fontSize: fontSize.md, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: fontSize.xs, marginTop: 2 },
  divider: { width: 1, height: 36 },
  progressContainer: { gap: spacing.xs },
  progressBg: { height: 6, borderRadius: radius.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.sm },
  progressLabel: { fontSize: fontSize.xs, textAlign: 'right' },
});