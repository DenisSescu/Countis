import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, radius, spacing, themeDisplayNames, type ThemeName } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { addRecurringTransaction, addTransaction, setSetting } from '../db/queries';

const STEPS = 4;

const THEME_PREVIEWS: Record<ThemeName, { bg: string; primary: string; accent: string }> = {
  default: { bg: '#FFFFFF', primary: '#534AB7', accent: '#EEEDFE' },
  pink: { bg: '#FFFBFC', primary: '#D6336C', accent: '#FCE4EC' },
  dark: { bg: '#121218', primary: '#8B7FE8', accent: '#2A2645' },
};

export default function OnboardingScreen() {
  const { colors, themeName, setTheme } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [initialBalance, setInitialBalance] = useState('');
  const [salaryDay, setSalaryDay] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');

  function handleFinish() {
    // Sold inițial
    const balance = parseFloat(initialBalance.replace(',', '.'));
    if (balance && balance > 0) {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      addTransaction({ amount: balance, categoryId: 11, note: 'Sold inițial', date: dateStr, type: 'income' });
    }

    // Ziua salariului
    const day = parseInt(salaryDay, 10);
    if (day >= 1 && day <= 31) {
      setSetting('salary_day', String(day));
    }

    // Salariu recurent
    const salary = parseFloat(salaryAmount.replace(',', '.'));
    if (salary > 0 && day >= 1 && day <= 31) {
      addRecurringTransaction({
        name: 'Salariu',
        amount: salary,
        categoryId: 11,
        frequency: 'monthly',
        dayOfMonth: day,
        type: 'income',
      });
    }

    setSetting('onboarding_done', 'true');
    router.replace('/');
  }

  function handleNext() {
    if (step === 2) {
      const day = parseInt(salaryDay, 10);
      if (salaryDay && (day < 1 || day > 31)) {
        Alert.alert('Zi invalidă', 'Introdu o zi între 1 și 31.');
        return;
      }
    }
    if (step < STEPS - 1) setStep(step + 1);
    else handleFinish();
  }

  function handleSkip() {
    setSetting('onboarding_done', 'true');
    router.replace('/');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === step ? colors.primary : colors.border }]} />
        ))}
      </View>

      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: colors.textTertiary }]}>Sari peste</Text>
      </TouchableOpacity>

      {/* Pas 1 — Bun venit */}
      {step === 0 && (
        <View style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Bun venit în Countis</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Aplicația care îți arată unde se duc banii, înainte să-i cheltui. Cu predicții AI personalizate și tracking simplu.
          </Text>
          <View style={[styles.featureList, { backgroundColor: colors.backgroundSecondary }]}>
            {[
              { icon: 'sparkles-outline', text: 'Predicții AI personalizate' },
              { icon: 'repeat-outline', text: 'Tranzacții recurente automate' },
              { icon: 'flag-outline', text: 'Obiective de economisire' },
              { icon: 'bar-chart-outline', text: 'Analiză detaliată' },
            ].map((f) => (
              <View key={f.text} style={styles.featureItem}>
                <Ionicons name={f.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Pas 2 — Sold inițial */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.incomeLight }]}>
            <Ionicons name="cash-outline" size={48} color={colors.income} />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Cât ai în cont acum?</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Setează soldul inițial ca să ai o imagine corectă de la început. Poți sări peste și adăuga mai târziu din Setări.
          </Text>
          <TextInput
            style={[styles.bigInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
            value={initialBalance}
            onChangeText={setInitialBalance}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.currency, { color: colors.textSecondary }]}>RON</Text>
        </View>
      )}

      {/* Pas 3 — Ziua salariului */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Când primești salariul?</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Aplicația va calcula automat câți RON pe zi îți permiți până la următorul salariu.
          </Text>

          <View style={styles.salaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ziua lunii</Text>
              <TextInput
                style={[styles.salaryInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={salaryDay}
                onChangeText={setSalaryDay}
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Suma (RON, opțional)</Text>
              <TextInput
                style={[styles.salaryInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={salaryAmount}
                onChangeText={setSalaryAmount}
                placeholder="3500"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                textAlign="center"
              />
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Dacă adaugi și suma, o vom seta ca venit recurent lunar automat.
          </Text>
        </View>
      )}

      {/* Pas 4 — Temă */}
      {step === 3 && (
        <View style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="color-palette-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Alege-ți tema</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>Poți schimba oricând din Setări.</Text>
          <View style={styles.themeRow}>
            {(['default', 'pink', 'dark'] as ThemeName[]).map((t) => {
              const preview = THEME_PREVIEWS[t];
              const isActive = t === themeName;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.themeOption, { backgroundColor: preview.bg, borderColor: isActive ? preview.primary : colors.border }, isActive && { borderWidth: 2.5 }]}
                  onPress={() => setTheme(t)}
                >
                  <View style={[styles.themeBar, { backgroundColor: preview.primary }]} />
                  <View style={[styles.themeAccent, { backgroundColor: preview.accent }]} />
                  <Text style={[styles.themeLabel, { color: t === 'dark' ? '#F0F0F5' : '#1A1A1A' }]}>{themeDisplayNames[t]}</Text>
                  {isActive && <Ionicons name="checkmark-circle" size={14} color={preview.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Buton Next/Finish */}
      <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={handleNext}>
        <Text style={styles.nextBtnText}>{step === STEPS - 1 ? 'Începe' : 'Continuă'}</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  skipBtn: { position: 'absolute', top: 60, right: spacing.xl, zIndex: 10 },
  skipText: { fontSize: fontSize.base },
  stepContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  heading: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
  description: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  bigInput: { fontSize: 48, fontWeight: '700', textAlign: 'center', borderBottomWidth: 3, paddingBottom: spacing.sm, minWidth: 150 },
  currency: { fontSize: fontSize.lg, marginTop: spacing.sm },
  salaryRow: { flexDirection: 'row', gap: spacing.md, width: '100%', marginBottom: spacing.sm },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs, textAlign: 'center' },
  salaryInput: { borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, fontSize: fontSize.xl, fontWeight: '700' },
  hint: { fontSize: fontSize.xs, textAlign: 'center', fontStyle: 'italic' },
  featureList: { width: '100%', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontSize: fontSize.base },
  themeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  themeOption: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, alignItems: 'center' },
  themeBar: { height: 20, width: '100%', borderRadius: radius.sm, marginBottom: spacing.xs },
  themeAccent: { height: 14, width: '100%', borderRadius: radius.sm, marginBottom: spacing.sm },
  themeLabel: { fontSize: fontSize.xs, fontWeight: '600', marginBottom: 2 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.xl },
  nextBtnText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFFFFF' },
});