import { getDatabase } from './database';
import { addRecurringTransaction, getActiveRecurringTransactions } from './queries';

interface DetectedPattern { categoryId: number; categoryName: string; amount: number; type: 'expense' | 'income'; occurrences: number; avgDayOfMonth: number; }

function findCandidatePatterns(monthsToScan: number = 3): DetectedPattern[] {
  const db = getDatabase();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsToScan);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-01`;

  const rows = db.getAllSync<{ category_id: number; category_name: string; type: string; rounded_amount: number; occurrences: number; avg_day: number; }>(
    `SELECT t.category_id, c.name as category_name, t.type, ROUND(t.amount) as rounded_amount,
       COUNT(DISTINCT strftime('%Y-%m', t.date)) as occurrences,
       AVG(CAST(strftime('%d', t.date) AS INTEGER)) as avg_day
     FROM transactions t JOIN categories c ON t.category_id = c.id
     WHERE t.date >= ? AND t.recurring_id IS NULL
     GROUP BY t.category_id, ROUND(t.amount), t.type HAVING occurrences >= 2;`,
    [cutoffStr]
  );

  return rows.map((r) => ({ categoryId: r.category_id, categoryName: r.category_name, amount: r.rounded_amount, type: r.type as 'expense' | 'income', occurrences: r.occurrences, avgDayOfMonth: Math.round(r.avg_day) }));
}

export function detectAndSaveRecurringTransactions(): number {
  const patterns = findCandidatePatterns();
  const existing = getActiveRecurringTransactions();
  let newCount = 0;

  for (const pattern of patterns) {
    const alreadyExists = existing.some((r) => r.category_id === pattern.categoryId && Math.round(r.amount) === pattern.amount && r.type === pattern.type);
    if (!alreadyExists) {
      addRecurringTransaction({ name: `${pattern.categoryName} (auto-detectat)`, amount: pattern.amount, categoryId: pattern.categoryId, frequency: 'monthly', dayOfMonth: pattern.avgDayOfMonth, type: pattern.type });
      newCount++;
    }
  }
  return newCount;
}
