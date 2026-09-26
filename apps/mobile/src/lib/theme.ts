import { useAuthStore } from './store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  isDark: boolean;
  backgroundGradient: [string, string, string];
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerLow: string;
  card: string;
  cardSubtle: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  accent: string;
  cyan: string;
  yellow: string;
  red: string;
  border: string;
  borderSubtle: string;
  inputBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  statusChipBg: string;
}

export const darkColors: ThemeColors = {
  isDark: true,
  backgroundGradient: ['#051424', '#0d1c2d', '#010f1f'],
  background: '#051424',
  surface: '#0d1c2d',
  surfaceContainer: '#132337',
  surfaceContainerHigh: '#1e293b',
  surfaceContainerLow: '#071626',
  card: 'rgba(30, 41, 59, 0.55)',
  cardSubtle: 'rgba(5, 20, 36, 0.45)',
  cardBorder: '#334155',
  text: '#ffffff',
  textMuted: '#64748B',
  textSecondary: '#94a3b8',
  primary: '#c3f400',
  primaryContainer: 'rgba(195, 244, 0, 0.15)',
  onPrimary: '#051424',
  accent: '#c3f400',
  cyan: '#38bdf8',
  yellow: '#eab308',
  red: '#ff4a4a',
  border: '#334155',
  borderSubtle: '#1e293b',
  inputBg: 'rgba(5, 20, 36, 0.6)',
  tabBarBg: '#051424',
  tabBarBorder: '#1e293b',
  tabBarActive: '#c3f400',
  tabBarInactive: '#64748B',
  statusChipBg: 'rgba(195, 244, 0, 0.12)',
};

export const lightColors: ThemeColors = {
  isDark: false,
  backgroundGradient: ['#f8fafc', '#f1f5f9', '#e2e8f0'],
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceContainer: '#f1f5f9',
  surfaceContainerHigh: '#e2e8f0',
  surfaceContainerLow: '#ffffff',
  card: '#ffffff',
  cardSubtle: '#f8fafc',
  cardBorder: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textSecondary: '#475569',
  primary: '#c3f400',
  primaryContainer: 'rgba(195, 244, 0, 0.25)',
  onPrimary: '#051424',
  accent: '#65a30d',
  cyan: '#0284c7',
  yellow: '#d97706',
  red: '#ef4444',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  inputBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  tabBarActive: '#0f172a',
  tabBarInactive: '#94a3b8',
  statusChipBg: 'rgba(101, 163, 13, 0.12)',
};

export const THEME_STORAGE_KEY = 'fitpulse_app_theme';

export function useAppTheme(): {
  theme: 'dark' | 'light';
  colors: ThemeColors;
  isDark: boolean;
  isLight: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
} {
  const { theme, setTheme: setZustandTheme } = useAuthStore();
  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setTheme = async (newTheme: 'dark' | 'light') => {
    setZustandTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return {
    theme,
    colors,
    isDark,
    isLight: !isDark,
    setTheme,
    toggleTheme,
  };
}
