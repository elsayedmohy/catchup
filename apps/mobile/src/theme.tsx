import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export interface Colors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  danger: string;
  dangerText: string;
  focus: string;
}

const light: Colors = {
  background: '#faf9f7',
  surface: '#ffffff',
  surfaceMuted: '#f4f2ee',
  text: '#1a1917',
  textMuted: '#6b6862',
  border: '#e7e4de',
  accent: '#2f6f4e',
  accentText: '#ffffff',
  danger: '#a8321f',
  dangerText: '#ffffff',
  focus: '#2f6f4e',
};

const dark: Colors = {
  background: '#121211',
  surface: '#1c1b19',
  surfaceMuted: '#252320',
  text: '#f2f0ec',
  textMuted: '#a8a49c',
  border: '#2e2c28',
  accent: '#7bc49a',
  accentText: '#10231a',
  danger: '#f2917f',
  dangerText: '#23120f',
  focus: '#7bc49a',
};

/** 4pt spacing scale, shared with the web design tokens. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  full: 999,
} as const;

const STORAGE_KEY = 'catchup-theme';

interface ThemeContextValue {
  colors: Colors;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // Preference is cosmetic: fall back to the system scheme.
      });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorScheme = preference === 'system' ? systemScheme : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: scheme === 'dark' ? dark : light, scheme, preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
