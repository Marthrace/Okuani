import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '../utils/constants';

const STORAGE_KEY = 'okuani_theme_mode';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setModeState(saved);
      } catch (e) {
        // Unreadable cache — fall back to light rather than block the app.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setMode = (next) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const value = useMemo(() => ({ mode, colors, setMode, toggleMode, hydrated }), [mode, colors, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
