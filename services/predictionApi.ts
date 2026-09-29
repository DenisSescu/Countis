import { getActiveRecurringTransactions } from '../db/queries';
import { getDatabase } from '../db/database';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

interface PredictionResponse { prediction: string; }

function getRecentTransactionsForPrompt(limit: number = 15) {
  const db = getDatabase();
  return db.getAllSync<{ category_name: string; amount: number; date: string }>(
    `SELECT c.name as category_name, t.amount, t.date FROM transactions t JOIN categories c ON t.category_id = c.id ORDER BY t.date DESC LIMIT ?;`,
    [limit]
  );
}

export async function fetchAIPrediction(params: {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}): Promise<string> {
  const recurring = getActiveRecurringTransactions();
  const recent = getRecentTransactionsForPrompt();

  const body = {
    balance: params.balance,
    monthlyIncome: params.monthlyIncome,
    monthlyExpenses: params.monthlyExpenses,
    recurringTransactions: recurring.map((r) => ({
      name: r.name,
      amount: r.amount,
      dayOfMonth: r.day_of_month ?? 1,
      type: r.type,
    })),
    recentTransactions: recent.map((t) => ({
      categoryName: t.category_name,
      amount: t.amount,
      date: t.date,
    })),
  };

  let response: Response;

  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Nu există conexiune la internet. Verifică wifi-ul sau datele mobile.');
  }

  if (response.status === 503 || response.status === 502) {
    throw new Error('Serverul e temporar indisponibil. Încearcă din nou în câteva minute.');
  }

  if (!response.ok) {
    throw new Error('Ceva nu a mers bine. Încearcă din nou mai târziu.');
  }

  const data: PredictionResponse = await response.json();
  return data.prediction;
}
