import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../constants/theme';

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius.sm, backgroundColor: colors.backgroundSecondary },
        { opacity },
        style,
      ]}
    />
  );
}

export default function HomeSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header skeleton */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <SkeletonBox width={120} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: spacing.sm }} />
        <SkeletonBox width={200} height={32} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
      </View>

      {/* AI card skeleton */}
      <View style={[styles.aiCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <SkeletonBox width={100} height={14} style={{ marginBottom: spacing.sm }} />
        <SkeletonBox width="100%" height={12} style={{ marginBottom: spacing.xs }} />
        <SkeletonBox width="80%" height={12} />
      </View>

      {/* Salary card skeleton */}
      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.row}>
          <SkeletonBox width={80} height={40} />
          <SkeletonBox width={80} height={40} />
          <SkeletonBox width={80} height={40} />
        </View>
        <SkeletonBox width="100%" height={6} style={{ marginTop: spacing.sm }} />
      </View>

      {/* Stats skeleton */}
      <View style={[styles.section]}>
        <SkeletonBox width={100} height={12} style={{ marginBottom: spacing.sm }} />
        <View style={styles.row}>
          <SkeletonBox width="48%" height={60} />
          <SkeletonBox width="48%" height={60} />
        </View>
      </View>

      {/* Transactions skeleton */}
      <View style={styles.section}>
        <SkeletonBox width={120} height={12} style={{ marginBottom: spacing.md }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.txRow, { borderBottomColor: colors.borderLight }]}>
            <SkeletonBox width={36} height={36} style={{ borderRadius: radius.sm }} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <SkeletonBox width="60%" height={12} />
              <SkeletonBox width="40%" height={10} />
            </View>
            <SkeletonBox width={70} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  aiCard: { marginHorizontal: spacing.lg, marginTop: -spacing.lg, borderRadius: radius.lg, borderWidth: 0.5, padding: spacing.md },
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, padding: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 0.5 },
});