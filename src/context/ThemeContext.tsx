import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'SYSTEM',
  resolvedTheme: 'light',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('eduguard_theme');
    if (saved === 'LIGHT' || saved === 'DARK' || saved === 'SYSTEM') return saved;
    return 'LIGHT';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' = mode === 'DARK' ? 'dark' : mode === 'LIGHT' ? 'light' : systemDark ? 'dark' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem('eduguard_theme', next);
  };

  return <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
