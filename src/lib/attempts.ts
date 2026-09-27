import { THEMES } from './collocations';
import type { PracticeMode } from '../types';

export const MODE_META: Record<PracticeMode, { label: string; icon: string }> = {
  flashcards: { label: 'Flashcards', icon: '🗂️' },
  'fill-blank': { label: 'Fill the Blank', icon: '✍️' },
  quiz: { label: 'Quick Quiz', icon: '⚡' },
};

export function themeName(themeId: number | null): string {
  if (themeId === null) return 'All themes';
  return THEMES.find((t) => t.id === themeId)?.title ?? 'All themes';
}

export function formatWhen(ms: number): string {
  const diff = Date.now() - ms;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function scoreTone(pct: number): string {
  if (pct >= 80) return 'text-mint-500 bg-mint-100';
  if (pct >= 50) return 'text-amber-500 bg-amber-100';
  return 'text-rose-500 bg-rose-100';
}
