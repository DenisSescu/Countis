import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) db = SQLite.openDatabaseSync('cashly.db');
  return db;
}

const DEFAULT_CATEGORIES = [
  { name: 'Mâncare & restaurante', icon: 'restaurant-outline', color: '#854F0B', type: 'expense' },
  { name: 'Transport', icon: 'car-outline', color: '#185FA5', type: 'expense' },
  { name: 'Abonamente', icon: 'play-outline', color: '#534AB7', type: 'expense' },
  { name: 'Locuință', icon: 'home-outline', color: '#A32D2D', type: 'expense' },
  { name: 'Utilități', icon: 'flash-outline', color: '#BA7517', type: 'expense' },
  { name: 'Sănătate', icon: 'medkit-outline', color: '#0F766E', type: 'expense' },
  { name: 'Cumpărături', icon: 'bag-outline', color: '#9333EA', type: 'expense' },
  { name: 'Divertisment', icon: 'game-controller-outline', color: '#DB2777', type: 'expense' },
  { name: 'Educație', icon: 'book-outline', color: '#0369A1', type: 'expense' },
  { name: 'Altele', icon: 'ellipsis-horizontal-outline', color: '#6B6B6B', type: 'expense' },
  { name: 'Salariu', icon: 'cash-outline', color: '#3B6D11', type: 'income' },
  { name: 'Alte venituri', icon: 'trending-up-outline', color: '#3B6D11', type: 'income' },
];

export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income'))
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL, category_id INTEGER NOT NULL, note TEXT,
      date TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      recurring_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, amount REAL NOT NULL, category_id INTEGER NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
      day_of_month INTEGER, type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_prediction_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1), prediction TEXT NOT NULL, generated_at TEXT NOT NULL
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, target_amount REAL NOT NULL, current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT, icon TEXT NOT NULL DEFAULT 'flag-outline', color TEXT NOT NULL DEFAULT '#534AB7',
      monthly_auto_amount REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS goal_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL, amount REAL NOT NULL, month_prefix TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );
  `);

    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS category_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL UNIQUE,
      monthly_limit REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    );
  `);

  // ALTER TABLE pentru utilizatori care aveau deja baza de date fără coloana nouă
  await database.execAsync(`ALTER TABLE goals ADD COLUMN monthly_auto_amount REAL;`).catch(() => {});

  const result = database.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (result && result.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      database.runSync(
        'INSERT INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?);',
        [cat.name, cat.icon, cat.color, cat.type]
      );
    }
  }
}