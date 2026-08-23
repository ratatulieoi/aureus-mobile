import { useCallback, useEffect, useState } from 'react';

export type AureusTheme = 'light' | 'dark';

const THEME_EVENT = 'aureus-theme-change';

export function useTheme(): readonly [AureusTheme, () => void] {
  const [theme, setTheme] = useState<AureusTheme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event: Event) => setTheme((event as CustomEvent<AureusTheme>).detail);
    window.addEventListener(THEME_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_EVENT, syncTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent<AureusTheme>(THEME_EVENT, { detail: nextTheme }));
  }, []);

  return [theme, toggleTheme] as const;
}

function applyTheme(theme: AureusTheme) {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  try {
    window.localStorage.setItem('theme', theme);
  } catch {
    // Keep the selected theme in memory if storage is unavailable.
  }
}

function readInitialTheme(): AureusTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Fall back to the device preference when storage is unavailable.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}
