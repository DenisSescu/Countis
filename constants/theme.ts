export type ThemeName = 'default' | 'pink' | 'dark';

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  backgroundSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  expense: string;
  expenseLight: string;
  income: string;
  incomeLight: string;
  categoryFood: string;
  categoryFoodLight: string;
  categoryTransport: string;
  categoryTransportLight: string;
  categorySubscription: string;
  categorySubscriptionLight: string;
  border: string;
  borderLight: string;
}

const defaultTheme: ColorPalette = {
  primary: '#534AB7', primaryLight: '#EEEDFE', primaryDark: '#26215C',
  background: '#FFFFFF', backgroundSecondary: '#F4F3FB',
  textPrimary: '#1A1A1A', textSecondary: '#6B6B6B', textTertiary: '#9B9B9B',
  expense: '#A32D2D', expenseLight: '#FCEBEB', income: '#3B6D11', incomeLight: '#EAF3DE',
  categoryFood: '#854F0B', categoryFoodLight: '#FAEEDA',
  categoryTransport: '#185FA5', categoryTransportLight: '#E6F1FB',
  categorySubscription: '#534AB7', categorySubscriptionLight: '#EEEDFE',
  border: '#E5E4ED', borderLight: '#F0EFF7',
};

const pinkTheme: ColorPalette = {
  primary: '#D6336C', primaryLight: '#FCE4EC', primaryDark: '#7A1F44',
  background: '#FFFBFC', backgroundSecondary: '#FFF0F5',
  textPrimary: '#3D1A28', textSecondary: '#8C5A6D', textTertiary: '#C18CA0',
  expense: '#C2255C', expenseLight: '#FDE7EE', income: '#0E8C6B', incomeLight: '#E3F7F0',
  categoryFood: '#D9762E', categoryFoodLight: '#FCEADC',
  categoryTransport: '#9C5FBF', categoryTransportLight: '#F2E6FA',
  categorySubscription: '#D6336C', categorySubscriptionLight: '#FCE4EC',
  border: '#F5D6E2', borderLight: '#FAEAF1',
};

const darkTheme: ColorPalette = {
  primary: '#8B7FE8', primaryLight: '#2A2645', primaryDark: '#C4BBFF',
  background: '#121218', backgroundSecondary: '#1C1C24',
  textPrimary: '#F0F0F5', textSecondary: '#A8A8B5', textTertiary: '#6E6E7A',
  expense: '#E07A7A', expenseLight: '#3A2424', income: '#7FBF6A', incomeLight: '#22311E',
  categoryFood: '#D9A05B', categoryFoodLight: '#332A1C',
  categoryTransport: '#6FA8DC', categoryTransportLight: '#1E2B38',
  categorySubscription: '#8B7FE8', categorySubscriptionLight: '#2A2645',
  border: '#2E2E38', borderLight: '#26262E',
};

export const themes: Record<ThemeName, ColorPalette> = { default: defaultTheme, pink: pinkTheme, dark: darkTheme };
export const themeDisplayNames: Record<ThemeName, string> = { default: 'Clasic', pink: 'Roz', dark: 'Întunecat' };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const fontSize = { xs: 11, sm: 12, base: 14, md: 15, lg: 18, xl: 22, xxl: 28 } as const;
