import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themes, type ThemeName, type ColorPalette } from '../constants/theme';
import { getDatabase } from '../db/database';

interface ThemeContextValue { themeName: ThemeName; colors: ColorPalette; setTheme: (name: ThemeName) => void; }

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSavedTheme(): ThemeName {
  try {
    const db = getDatabase();
    const row = db.getFirstSync<{ value: string }>("SELECT value FROM app_settings WHERE key = 'theme';");
    if (row && (row.value === 'default' || row.value === 'pink' || row.value === 'dark')) return row.value;
  } catch {}
  return 'default';
}

function persistTheme(name: ThemeName): void {
  const db = getDatabase();
  db.runSync(`INSERT INTO app_settings (key, value) VALUES ('theme', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`, [name]);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('default');

  useEffect(() => { setThemeName(getSavedTheme()); }, []);

  function setTheme(name: ThemeName) {
    setThemeName(name);
    persistTheme(name);
  }

  return <ThemeContext.Provider value={{ themeName, colors: themes[themeName], setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
