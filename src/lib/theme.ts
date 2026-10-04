import { useSyncExternalStore } from 'react';

export type ThemeKey = 'auto' | 'light' | 'sepia' | 'mint' | 'dark' | 'black';

export interface ThemeOption {
  key: ThemeKey;
  label: string;
  /** Swatch colours: [page, text, accent] */
  swatch: [string, string, string];
}

export const THEMES: ThemeOption[] = [
  { key: 'auto', label: 'Auto', swatch: ['linear-gradient(135deg,#f7f6f3 50%,#131218 50%)', '#625f6e', '#6d4fd6'] },
  { key: 'light', label: 'Light', swatch: ['#f7f6f3', '#1b1a22', '#6d4fd6'] },
  { key: 'sepia', label: 'Sepia', swatch: ['#f1e7d0', '#3b2f20', '#9a5b2e'] },
  { key: 'mint', label: 'Mint', swatch: ['#e6f0e8', '#1d2b22', '#2f7d56'] },
  { key: 'dark', label: 'Dark', swatch: ['#131218', '#f1eff8', '#9683e8'] },
  { key: 'black', label: 'Black', swatch: ['#000000', '#ececf1', '#9a88ee'] },
];

const KEY = 'ielts-theme';
const VALID = new Set<string>(THEMES.map((t) => t.key));

function load(): ThemeKey {
  try {
    const v = localStorage.getItem(KEY);
    if (v && VALID.has(v)) return v as ThemeKey;
  } catch {
    // ignore
  }
  return 'auto';
}

function apply(theme: ThemeKey) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

let current: ThemeKey = load();
apply(current);
const listeners = new Set<() => void>();

export function setTheme(theme: ThemeKey) {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  return { theme, setTheme };
}
