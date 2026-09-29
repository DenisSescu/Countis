import { getDatabase } from './database';

export type TransactionType = 'expense' | 'income';
export type RecurringFrequency = 'weekly' | 'monthly';

export interface Category { id: number; name: string; icon: string; color: string; type: TransactionType; }
export interface Transaction { id: number; amount: number; category_id: number; note: string | null; date: string; type: TransactionType; recurring_id: number | null; created_at: string; }
export interface TransactionWithCategory extends Transaction { category_name: string; category_icon: string; category_color: string; }
export interface RecurringTransaction { id: number; name: string; amount: number; category_id: number; frequency: RecurringFrequency; day_of_month: number | null; type: TransactionType; is_active: number; }
export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string;
  color: string;
  monthly_auto_amount: number | null;
  created_at: string;
}
export interface MonthlyTrend { year: number; month: number; label: string; income: number; expenses: number; }

// ─── Categorii ───────────────────────────────────────────────

export function getAllCategories(): Category[] {
  const db = getDatabase();
  return db.getAllSync<Category>('SELECT * FROM categories ORDER BY type, name;');
}

export function getCategoriesByType(type: TransactionType): Category[] {
  const db = getDatabase();
  return db.getAllSync<Category>('SELECT * FROM categories WHERE type = ? ORDER BY name;', [type]);
}

// ─── Tranzacții ──────────────────────────────────────────────

export function addTransaction(params: { amount: number; categoryId: number; note?: string; date: string; type: TransactionType; recurringId?: number; }): number {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO transactions (amount, category_id, note, date, type, recurring_id) VALUES (?, ?, ?, ?, ?, ?);`,
    [params.amount, params.categoryId, params.note ?? null, params.date, params.type, params.recurringId ?? null]
  );
  return result.lastInsertRowId;
}

export function updateTransaction(params: { id: number; amount: number; categoryId: number; note?: string; date: string; type: TransactionType; }): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE transactions SET amount = ?, category_id = ?, note = ?, date = ?, type = ? WHERE id = ?;`,
    [params.amount, params.categoryId, params.note ?? null, params.date, params.type, params.id]
  );
}

export function getRecentTransactions(limit: number = 10): TransactionWithCategory[] {
  const db = getDatabase();
  return db.getAllSync<TransactionWithCategory>(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM transactions t JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC LIMIT ?;`, [limit]
  );
}

export function getTransactionsForMonth(year: number, month: number): TransactionWithCategory[] {
  const db = getDatabase();
  const prefix = `${year}-${month.toString().padStart(2, '0')}`;
  return db.getAllSync<TransactionWithCategory>(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.date LIKE ? ORDER BY t.date DESC;`,
    [`${prefix}%`]
  );
}

export function getMonthSummary(year: number, month: number): { income: number; expenses: number } {
  const db = getDatabase();
  const prefix = `${year}-${month.toString().padStart(2, '0')}`;
  const income = db.getFirstSync<{ total: number | null }>(`SELECT SUM(amount) as total FROM transactions WHERE date LIKE ? AND type = 'income';`, [`${prefix}%`]);
  const expenses = db.getFirstSync<{ total: number | null }>(`SELECT SUM(amount) as total FROM transactions WHERE date LIKE ? AND type = 'expense';`, [`${prefix}%`]);
  return { income: income?.total ?? 0, expenses: expenses?.total ?? 0 };
}

export function getCategoryTotalsForMonth(year: number, month: number): { category_id: number; category_name: string; color: string; total: number }[] {
  const db = getDatabase();
  const prefix = `${year}-${month.toString().padStart(2, '0')}`;
  return db.getAllSync(
    `SELECT c.id as category_id, c.name as category_name, c.color, SUM(t.amount) as total
     FROM transactions t JOIN categories c ON t.category_id = c.id
     WHERE t.date LIKE ? AND t.type = 'expense' GROUP BY c.id ORDER BY total DESC;`, [`${prefix}%`]
  );
}

export function deleteTransaction(id: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM transactions WHERE id = ?;', [id]);
}

// ─── Recurente ───────────────────────────────────────────────

export function addRecurringTransaction(params: { name: string; amount: number; categoryId: number; frequency: RecurringFrequency; dayOfMonth?: number; type: TransactionType; }): number {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO recurring_transactions (name, amount, category_id, frequency, day_of_month, type) VALUES (?, ?, ?, ?, ?, ?);`,
    [params.name, params.amount, params.categoryId, params.frequency, params.dayOfMonth ?? null, params.type]
  );
  return result.lastInsertRowId;
}

export function getActiveRecurringTransactions(): RecurringTransaction[] {
  const db = getDatabase();
  return db.getAllSync<RecurringTransaction>('SELECT * FROM recurring_transactions WHERE is_active = 1 ORDER BY day_of_month;');
}

export function deleteRecurringTransaction(id: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM recurring_transactions WHERE id = ?;', [id]);
}

export function generateRecurringForCurrentMonth(): number {
  const db = getDatabase();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = `${year}-${month.toString().padStart(2, '0')}`;
  const activeRecurring = db.getAllSync<RecurringTransaction>('SELECT * FROM recurring_transactions WHERE is_active = 1;');
  let generated = 0;

  for (const rec of activeRecurring) {
    const exists = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM transactions WHERE recurring_id = ? AND date LIKE ?;`, [rec.id, `${prefix}%`]);
    if (exists && exists.count === 0) {
      const day = rec.day_of_month ?? 1;
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      db.runSync(
        `INSERT INTO transactions (amount, category_id, note, date, type, recurring_id) VALUES (?, ?, ?, ?, ?, ?);`,
        [rec.amount, rec.category_id, rec.name, dateStr, rec.type, rec.id]
      );
      generated++;
    }
  }
  return generated;
}

// ─── Trend lunar ─────────────────────────────────────────────

const MONTH_LABELS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMonthlyTrend(monthsCount: number = 6): MonthlyTrend[] {
  const db = getDatabase();
  const result: MonthlyTrend[] = [];
  const now = new Date();
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const prefix = `${year}-${month.toString().padStart(2, '0')}`;
    const income = db.getFirstSync<{ total: number | null }>(`SELECT SUM(amount) as total FROM transactions WHERE date LIKE ? AND type = 'income';`, [`${prefix}%`]);
    const expenses = db.getFirstSync<{ total: number | null }>(`SELECT SUM(amount) as total FROM transactions WHERE date LIKE ? AND type = 'expense';`, [`${prefix}%`]);
    result.push({ year, month, label: MONTH_LABELS_RO[d.getMonth()], income: income?.total ?? 0, expenses: expenses?.total ?? 0 });
  }
  return result;
}

// ─── Cache AI ────────────────────────────────────────────────

const PREDICTION_CACHE_HOURS = 4;

export function getCachedPrediction(): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ prediction: string; generated_at: string }>('SELECT prediction, generated_at FROM ai_prediction_cache WHERE id = 1;');
  if (!row) return null;
  const hoursElapsed = (Date.now() - new Date(row.generated_at).getTime()) / (1000 * 60 * 60);
  if (hoursElapsed > PREDICTION_CACHE_HOURS) return null;
  return row.prediction;
}

export function savePredictionToCache(prediction: string): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO ai_prediction_cache (id, prediction, generated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET prediction = excluded.prediction, generated_at = excluded.generated_at;`,
    [prediction, new Date().toISOString()]
  );
}

// ─── Obiective ───────────────────────────────────────────────

export function getAllGoals(): Goal[] {
  const db = getDatabase();
  return db.getAllSync<Goal>('SELECT * FROM goals ORDER BY created_at DESC;');
}

export function addGoal(params: {
  name: string;
  targetAmount: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  monthlyAutoAmount?: number;
}): number {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO goals (name, target_amount, target_date, icon, color, monthly_auto_amount) VALUES (?, ?, ?, ?, ?, ?);`,
    [
      params.name,
      params.targetAmount,
      params.targetDate ?? null,
      params.icon ?? 'flag-outline',
      params.color ?? '#534AB7',
      params.monthlyAutoAmount ?? null,
    ]
  );

  // Dacă are auto-economisire, creează și o recurentă vizibilă
  if (params.monthlyAutoAmount && params.monthlyAutoAmount > 0) {
    db.runSync(
      `INSERT INTO recurring_transactions (name, amount, category_id, frequency, day_of_month, type)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [`Economisire: ${params.name}`, params.monthlyAutoAmount, 10, 'monthly', 1, 'expense']
    );
  }

  return result.lastInsertRowId;
}

export function addAmountToGoal(goalId: number, amount: number): void {
  const db = getDatabase();
  db.runSync('UPDATE goals SET current_amount = current_amount + ? WHERE id = ?;', [amount, goalId]);
}

export function deleteGoal(goalId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM goals WHERE id = ?;', [goalId]);
}

export function processMonthlyGoalContributions(): number {
  const db = getDatabase();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = `${year}-${month.toString().padStart(2, '0')}`;

  const goals = db.getAllSync<Goal>(
    'SELECT * FROM goals WHERE monthly_auto_amount IS NOT NULL AND monthly_auto_amount > 0;'
  );

  let processed = 0;

  for (const goal of goals) {
    const alreadyDone = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM goal_contributions WHERE goal_id = ? AND month_prefix = ?;`,
      [goal.id, prefix]
    );

    if (alreadyDone && alreadyDone.count === 0) {
      const remaining = goal.target_amount - goal.current_amount;
      if (remaining <= 0) continue;

      const contribution = Math.min(goal.monthly_auto_amount!, remaining);

      // Adaugă la progresul obiectivului
      db.runSync('UPDATE goals SET current_amount = current_amount + ? WHERE id = ?;', [contribution, goal.id]);

      // Creează și o tranzacție reală — scade din sold
      const day = now.getDate();
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      db.runSync(
        `INSERT INTO transactions (amount, category_id, note, date, type) VALUES (?, ?, ?, ?, ?);`,
        [contribution, 10, `Economisire: ${goal.name}`, dateStr, 'expense']
      );

      // Marchează luna ca procesată
      db.runSync(
        'INSERT INTO goal_contributions (goal_id, amount, month_prefix) VALUES (?, ?, ?);',
        [goal.id, contribution, prefix]
      );
      processed++;
    }
  }
  return processed;
}

// ─── Settings generale ───────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?;', [key]);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value]
  );
}

export function getNotificationPreference(): boolean {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'notifications_enabled';"
  );
  return row?.value === 'true';
}

// ─── Calcul "până la salariu" ────────────────────────────────

export interface SalaryCountdown {
  daysUntilSalary: number;
  availableAmount: number;
  dailyBudget: number;
  salaryDay: number;
  daysIntoMonth: number;
  totalDaysInMonth: number;
}

export function getSalaryCountdown(): SalaryCountdown | null {
  const db = getDatabase();

  // Căutăm cel mai mare venit recurent (probabil salariul)
  const salaryRec = db.getFirstSync<{ day_of_month: number; amount: number }>(
    `SELECT day_of_month, amount FROM recurring_transactions
     WHERE type = 'income' AND is_active = 1 AND day_of_month IS NOT NULL
     ORDER BY amount DESC LIMIT 1;`
  );

  // Sau ziua setată manual în settings
  const savedDay = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'salary_day';"
  );

  const salaryDay = salaryRec?.day_of_month ?? parseInt(savedDay?.value ?? '0', 10);
  if (!salaryDay || salaryDay < 1 || salaryDay > 31) return null;

  const now = new Date();
  const today = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  let daysUntilSalary: number;
  if (today < salaryDay) {
    daysUntilSalary = salaryDay - today;
  } else if (today === salaryDay) {
    daysUntilSalary = 0;
  } else {
    // Salariul vine luna viitoare
    const nextMonth = new Date(year, month, salaryDay);
    const diff = nextMonth.getTime() - now.getTime();
    daysUntilSalary = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Soldul curent
  const allIncome = db.getFirstSync<{ total: number | null }>(
    'SELECT SUM(amount) as total FROM transactions WHERE type = \'income\';'
  );
  const allExpense = db.getFirstSync<{ total: number | null }>(
    'SELECT SUM(amount) as total FROM transactions WHERE type = \'expense\';'
  );
  const availableAmount = (allIncome?.total ?? 0) - (allExpense?.total ?? 0);

  const dailyBudget = daysUntilSalary > 0
    ? parseFloat((availableAmount / daysUntilSalary).toFixed(2))
    : 0;

  return {
    daysUntilSalary,
    availableAmount,
    dailyBudget,
    salaryDay,
    daysIntoMonth: today,
    totalDaysInMonth,
  };
}

// ─── Bugete categorii ────────────────────────────────────────

export interface CategoryBudget {
  id: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  monthly_limit: number;
  spent_this_month: number;
  percent: number;
}

export function getAllCategoryBudgets(): CategoryBudget[] {
  const db = getDatabase();
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return db.getAllSync<CategoryBudget>(
    `SELECT cb.id, cb.category_id, c.name as category_name, c.icon as category_icon,
            c.color as category_color, cb.monthly_limit,
            COALESCE(SUM(t.amount), 0) as spent_this_month,
            ROUND(COALESCE(SUM(t.amount), 0) * 100.0 / cb.monthly_limit, 0) as percent
     FROM category_budgets cb
     JOIN categories c ON cb.category_id = c.id
     LEFT JOIN transactions t ON t.category_id = cb.category_id
       AND t.type = 'expense' AND t.date LIKE ?
     GROUP BY cb.id
     ORDER BY percent DESC;`,
    [`${prefix}%`]
  );
}

export function setCategoryBudget(categoryId: number, monthlyLimit: number): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO category_budgets (category_id, monthly_limit) VALUES (?, ?)
     ON CONFLICT(category_id) DO UPDATE SET monthly_limit = excluded.monthly_limit;`,
    [categoryId, monthlyLimit]
  );
}

export function deleteCategoryBudget(categoryId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM category_budgets WHERE category_id = ?;', [categoryId]);
}

export function getBudgetAlerts(): CategoryBudget[] {
  return getAllCategoryBudgets().filter((b) => b.percent >= 80);
}