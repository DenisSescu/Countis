import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { addAmountToGoal, addGoal, deleteGoal, getAllGoals, processMonthlyGoalContributions, type Goal } from '../../db/queries';


const GOAL_COLORS = ['#534AB7', '#185FA5', '#3B6D11', '#BA7517', '#A32D2D', '#9333EA'];
const GOAL_ICONS = ['flag-outline', 'airplane-outline', 'home-outline', 'car-outline', 'shield-checkmark-outline', 'gift-outline'];

export default function GoalsScreen() {
  const { colors } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [addMoneyGoal, setAddMoneyGoal] = useState<Goal | null>(null);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newIcon, setNewIcon] = useState(GOAL_ICONS[0]);
  const [newColor, setNewColor] = useState(GOAL_COLORS[0]);
  const [addAmount, setAddAmount] = useState('');
  const [newMonthlyAuto, setNewMonthlyAuto] = useState('');

  useFocusEffect(useCallback(() => { setGoals(getAllGoals()); }, []));

  function resetForm() {
    setNewName('');
    setNewTarget('');
    setNewIcon(GOAL_ICONS[0]);
    setNewColor(GOAL_COLORS[0]);
    setNewMonthlyAuto('');
  }

 function handleCreateGoal() {
  const targetAmount = parseFloat(newTarget.replace(',', '.'));
  const monthlyAuto = parseFloat(newMonthlyAuto.replace(',', '.'));
  if (!newName.trim()) { Alert.alert('Nume lipsă', 'Dă un nume obiectivului.'); return; }
  if (!targetAmount || targetAmount <= 0) { Alert.alert('Sumă invalidă', 'Introdu o sumă țintă validă.'); return; }
  addGoal({
    name: newName.trim(),
    targetAmount,
    icon: newIcon,
    color: newColor,
    monthlyAutoAmount: monthlyAuto > 0 ? monthlyAuto : undefined,
  });
  processMonthlyGoalContributions();
  resetForm();
  setCreateModalVisible(false);
  setGoals(getAllGoals());
}

  function handleAddMoney() {
    if (!addMoneyGoal) return;
    const amount = parseFloat(addAmount.replace(',', '.'));
    if (!amount || amount <= 0) { Alert.alert('Sumă invalidă', 'Introdu o sumă mai mare decât 0.'); return; }
    addAmountToGoal(addMoneyGoal.id, amount);
    setAddAmount(''); setAddMoneyGoal(null); setGoals(getAllGoals());
  }

  function handleDeleteGoal(goal: Goal) {
    Alert.alert('Șterge obiectiv', `Sigur vrei să ștergi "${goal.name}"?`, [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Șterge', style: 'destructive', onPress: () => { deleteGoal(goal.id); setGoals(getAllGoals()); } },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Obiective</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nu ai niciun obiectiv încă.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Apasă + ca să-ți setezi primul obiectiv de economisire.</Text>
          </View>
        ) : goals.map((goal) => {
          const percent = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
          const isComplete = goal.current_amount >= goal.target_amount;
          return (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                  <Ionicons name={goal.icon as any} size={20} color={goal.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalName, { color: colors.textPrimary }]}>{goal.name}</Text>
                  <Text style={[styles.goalAmounts, { color: colors.textSecondary }]}>
                    {goal.current_amount.toLocaleString('ro-RO')} / {goal.target_amount.toLocaleString('ro-RO')} RON
                  </Text>
                  {goal.monthly_auto_amount && goal.monthly_auto_amount > 0 && (
                    <Text style={{ fontSize: fontSize.xs, color: colors.primary, marginTop: 2 }}>
                      ↻ {goal.monthly_auto_amount.toLocaleString('ro-RO')} RON/lună automat
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDeleteGoal(goal)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.progressBg, { backgroundColor: colors.background }]}>
                <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: goal.color }]} />
              </View>
              <View style={styles.goalFooter}>
                <Text style={[styles.goalPercent, { color: colors.textSecondary }]}>{Math.round(percent)}%</Text>
                {isComplete ? (
                  <Text style={[styles.goalPercent, { color: colors.income }]}>Atins!</Text>
                ) : (
                  <TouchableOpacity style={styles.addMoneyBtn} onPress={() => setAddMoneyGoal(goal)}>
                    <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                    <Text style={[styles.addMoneyText, { color: colors.primary }]}>Adaugă bani</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

           <Modal visible={createModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Obiectiv nou</Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Nume</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="ex: Vacanță Grecia"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Sumă țintă (RON)</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={newTarget}
                onChangeText={setNewTarget}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Auto-economisire lunară (RON, opțional)</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={newMonthlyAuto}
                onChangeText={setNewMonthlyAuto}
                placeholder="ex: 500 — se adaugă automat în fiecare lună"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Iconiță</Text>
              <View style={styles.pickerRow}>
                {GOAL_ICONS.map((icon) => (
                  <TouchableOpacity key={icon} style={[styles.iconOpt, { borderColor: colors.border }, newIcon === icon && { borderColor: newColor, borderWidth: 2 }]} onPress={() => setNewIcon(icon)}>
                    <Ionicons name={icon as any} size={18} color={newIcon === icon ? newColor : colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Culoare</Text>
              <View style={styles.pickerRow}>
                {GOAL_COLORS.map((c) => (
                  <TouchableOpacity key={c} style={[styles.colorOpt, { backgroundColor: c }, newColor === c && { borderWidth: 3, borderColor: colors.textPrimary }]} onPress={() => setNewColor(c)} />
                ))}
              </View>

              <View style={[styles.modalActions, { marginBottom: spacing.xl }]}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { resetForm(); setCreateModalVisible(false); }}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleCreateGoal}>
                  <Text style={styles.confirmText}>Creează</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addMoneyGoal !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Adaugă bani la "{addMoneyGoal?.name}"</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sumă (RON)</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={addAmount}
              onChangeText={setAddAmount}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setAddAmount(''); setAddMoneyGoal(null); }}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleAddMoney}>
                <Text style={styles.confirmText}>Adaugă</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs },
  goalCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  goalIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: fontSize.md, fontWeight: '600' },
  goalAmounts: { fontSize: fontSize.sm, marginTop: 2 },
  progressBg: { height: 8, borderRadius: radius.sm, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', borderRadius: radius.sm },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalPercent: { fontSize: fontSize.sm, fontWeight: '600' },
  addMoneyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMoneyText: { fontSize: fontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { fontSize: fontSize.base, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOpt: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorOpt: { width: 32, height: 32, borderRadius: 16 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: fontSize.base, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  confirmText: { fontSize: fontSize.base, fontWeight: '600', color: '#FFFFFF' },
});