import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, radius, spacing, themeDisplayNames, type ThemeName } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getDatabase } from '../../db/database';
import { getNotificationPreference, getRecentTransactions, getSetting, setSetting } from '../../db/queries';
import { convertToRON } from '../../services/exchangeRate';
import { cancelAllNotifications, requestNotificationPermissions, saveNotificationPreference, scheduleDailyReminder } from '../../services/notifications';

const THEME_LIST: ThemeName[] = ['default', 'pink', 'dark'];

const THEME_PREVIEW_COLORS: Record<ThemeName, { bg: string; primary: string; accent: string }> = {
  default: { bg: '#FFFFFF', primary: '#534AB7', accent: '#EEEDFE' },
  pink: { bg: '#FFFBFC', primary: '#D6336C', accent: '#FCE4EC' },
  dark: { bg: '#121218', primary: '#8B7FE8', accent: '#2A2645' },
};

const CURRENCIES = ['RON', 'EUR', 'USD', 'GBP'];

export default function SettingsScreen() {
  const { colors, themeName, setTheme } = useTheme();
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [currency, setCurrency] = useState('RON');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = getSetting('currency');
    if (saved) setCurrency(saved);
    setNotificationsEnabled(getNotificationPreference());
  }, []);

  function handleResetData() {
    Alert.alert(
      'Șterge toate datele',
      'Ești sigur? Toate tranzacțiile, obiectivele și predicțiile vor fi șterse permanent.',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge tot',
          style: 'destructive',
          onPress: () => {
            const db = getDatabase();
db.runSync('DELETE FROM goal_contributions;');
db.runSync('DELETE FROM goals;');
db.runSync('DELETE FROM transactions;');
db.runSync('DELETE FROM recurring_transactions;');
db.runSync('DELETE FROM ai_prediction_cache;');
db.runSync("DELETE FROM app_settings WHERE key = 'onboarding_done';");
Alert.alert('Gata', 'Toate datele au fost șterse.');
          },
        },
      ]
    );
  }

  async function handleSetInitialBalance() {
    const amount = parseFloat(balanceInput.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Sumă invalidă', 'Introdu o sumă mai mare decât 0.');
      return;
    }

    const db = getDatabase();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (currency === 'RON') {
      db.runSync(`DELETE FROM transactions WHERE note = 'Sold inițial';`);
      db.runSync(
        `INSERT INTO transactions (amount, category_id, note, date, type) VALUES (?, ?, ?, ?, ?);`,
        [amount, 11, 'Sold inițial', dateStr, 'income']
      );
      setBalanceInput('');
      setBalanceModalVisible(false);
      Alert.alert('Salvat', `Sold inițial: ${amount.toLocaleString('ro-RO')} RON`);
    } else {
      try {
        const { amountRON, rate } = await convertToRON(amount, currency);
        db.runSync(`DELETE FROM transactions WHERE note = 'Sold inițial';`);
        db.runSync(
          `INSERT INTO transactions (amount, category_id, note, date, type) VALUES (?, ?, ?, ?, ?);`,
          [amountRON, 11, `Sold inițial (${amount} ${currency} × ${rate.toFixed(4)})`, dateStr, 'income']
        );
        setBalanceInput('');
        setBalanceModalVisible(false);
        Alert.alert('Salvat', `${amount} ${currency} = ${amountRON.toLocaleString('ro-RO')} RON\n(curs: 1 ${currency} = ${rate.toFixed(4)} RON)`);
      } catch {
        Alert.alert('Eroare', 'Nu am putut lua cursul valutar. Verifică conexiunea la internet.');
      }
    }
  }

  function handleChangeCurrency(cur: string) {
    setCurrency(cur);
    setSetting('currency', cur);
  }

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permisiuni necesare', 'Activează notificările din Setările telefonului pentru Cashly.');
        return;
      }
      saveNotificationPreference(true);
      setNotificationsEnabled(true);
      await scheduleDailyReminder();
    } else {
      saveNotificationPreference(false);
      setNotificationsEnabled(false);
      await cancelAllNotifications();
    }
  }

  async function handleExportCSV() {
    const transactions = getRecentTransactions(1000);
    if (transactions.length === 0) {
      Alert.alert('Nicio tranzacție', 'Nu ai tranzacții de exportat.');
      return;
    }
    const header = 'Data,Tip,Categorie,Suma,Nota\n';
    const rows = transactions.map((t) =>
      `${t.date},${t.type === 'expense' ? 'Cheltuiala' : 'Venit'},${t.category_name},${t.amount},"${t.note ?? ''}"`
    ).join('\n');
    const csv = header + rows;
    try {
      await Share.share({ message: csv, title: 'Cashly - Export Tranzactii' });
    } catch {
      Alert.alert('Eroare', 'Nu am putut deschide opțiunile de share.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Setări</Text>

        {/* Temă */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Temă</Text>
          <View style={styles.themeGrid}>
            {THEME_LIST.map((t) => {
              const preview = THEME_PREVIEW_COLORS[t];
              const isActive = t === themeName;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.themeCard, { backgroundColor: preview.bg, borderColor: isActive ? preview.primary : colors.border }, isActive && { borderWidth: 2.5 }]}
                  onPress={() => setTheme(t)}
                >
                  <View style={styles.themePreview}>
                    <View style={[styles.previewHeader, { backgroundColor: preview.primary }]} />
                    <View style={[styles.previewCard, { backgroundColor: preview.accent }]}>
                      <View style={[styles.previewDot, { backgroundColor: preview.primary }]} />
                    </View>
                    <View style={styles.previewLines}>
                      <View style={[styles.previewLine, { backgroundColor: preview.primary, opacity: 0.3 }]} />
                      <View style={[styles.previewLine, { backgroundColor: preview.primary, opacity: 0.15, width: '60%' }]} />
                    </View>
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeName, { color: t === 'dark' ? '#F0F0F5' : '#1A1A1A' }]}>{themeDisplayNames[t]}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={16} color={preview.primary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Monedă */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Monedă</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((cur) => (
              <TouchableOpacity
                key={cur}
                style={[styles.currencyChip, { borderColor: currency === cur ? colors.primary : colors.border }, currency === cur && { backgroundColor: colors.primaryLight }]}
                onPress={() => handleChangeCurrency(cur)}
              >
                <Text style={[styles.currencyText, { color: currency === cur ? colors.primary : colors.textSecondary }]}>{cur}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.currencyHint, { color: colors.textTertiary }]}>
            Moneda implicită pentru tranzacții noi. Sumele sunt convertite automat la RON la cursul zilei.
          </Text>
        </View>

        {/* Cont */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Cont</Text>

          <View style={[styles.settingRow, { borderColor: colors.borderLight }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <View>
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>Notificări</Text>
                <Text style={[styles.settingHint, { color: colors.textTertiary }]}>Reminder zilnic + alerte recurente</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textTertiary}
            />
          </View>

          <TouchableOpacity style={[styles.settingRow, { borderColor: colors.borderLight }]} onPress={() => setBalanceModalVisible(true)}>
            <View style={styles.settingLeft}>
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.textPrimary }]}>Setează sold inițial</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingRow, { borderColor: colors.borderLight }]} onPress={handleExportCSV}>
            <View style={styles.settingLeft}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.textPrimary }]}>Export tranzacții (CSV)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingRow, { borderColor: colors.borderLight }]} onPress={handleResetData}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.expense} />
              <Text style={[styles.settingText, { color: colors.expense }]}>Șterge toate datele</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

                {/* Despre */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Despre</Text>
          <View style={[styles.aboutCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.appName, { color: colors.primary }]}>Countis</Text>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>Vezi banii înainte să-i cheltui.</Text>
            <Text style={[styles.appVersion, { color: colors.textTertiary }]}>Versiune 1.0.0</Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
              Cashly este o aplicație de buget personal care te ajută să îți urmărești cheltuielile, să îți setezi obiective de economisire, plus să primești predicții AI personalizate.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.changelogTitle, { color: colors.textPrimary }]}>Ce e nou:</Text>
            {[
              '🤖 Predicții AI personalizate',
              '🔄 Tranzacții recurente',
              '🎯 Obiective cu auto-economisire',
              '💰 Bugete lunare pe categorii',
              '💱 Conversie valutară automată',
              '⏳ Countdown până la salariu',
            ].map((item) => (
              <Text key={item} style={[styles.changelogItem, { color: colors.textSecondary }]}>{item}</Text>
            ))}
          </View>
        </View>
      </ScrollView>


      {/* Modal sold inițial */}
      <Modal visible={balanceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sold inițial</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Câți bani ai acum în cont? Soldul anterior va fi înlocuit.
            </Text>
            <TextInput
              style={[styles.balanceInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
              value={balanceInput}
              onChangeText={setBalanceInput}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>{currency}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setBalanceInput(''); setBalanceModalVisible(false); }}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleSetInitialBalance}>
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
  title: { fontSize: fontSize.xl, fontWeight: '700', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  themeGrid: { flexDirection: 'row', gap: spacing.sm },
  themeCard: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, overflow: 'hidden' },
  themePreview: { height: 80, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm },
  previewHeader: { height: 24, borderRadius: radius.sm, marginBottom: spacing.xs },
  previewCard: { height: 20, borderRadius: radius.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.xs, justifyContent: 'center' },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewLines: { gap: 4 },
  previewLine: { height: 4, borderRadius: 2, width: '80%' },
  themeInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  themeName: { fontSize: fontSize.sm, fontWeight: '600' },
  currencyRow: { flexDirection: 'row', gap: spacing.sm },
  currencyChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  currencyText: { fontSize: fontSize.base, fontWeight: '600' },
  currencyHint: { fontSize: fontSize.xs, marginTop: spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 0.5 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  settingText: { fontSize: fontSize.base, fontWeight: '500' },
  settingHint: { fontSize: fontSize.xs, marginTop: 2 },
  aboutCard: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  appName: { fontSize: fontSize.xl, fontWeight: '700', marginBottom: spacing.xs },
  appTagline: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  appVersion: { fontSize: fontSize.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  modalSubtitle: { fontSize: fontSize.sm, marginBottom: spacing.lg },
  balanceInput: { fontSize: 48, fontWeight: '700', textAlign: 'center', borderBottomWidth: 3, paddingBottom: spacing.sm },
  currencyLabel: { fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: fontSize.base, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  confirmText: { fontSize: fontSize.base, fontWeight: '600', color: '#FFFFFF' },
    divider: { height: 0.5, width: '100%', marginVertical: spacing.md },
  aboutDescription: { fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center' },
  changelogTitle: { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.sm },
  changelogItem: { fontSize: fontSize.sm, lineHeight: 22 },
});