import type { ProgressState } from '../types';

const STORAGE_KEY = 'ielts-collocations-progress-v1';

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      items: parsed.items ?? {},
      history: parsed.history ?? [],
      writingNotes: parsed.writingNotes ?? {},
      writingChecks: parsed.writingChecks ?? {},
      totalReviews: parsed.totalReviews ?? 0,
    };
  } catch {
    return emptyState();
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode errors — progress simply won't persist
  }
}

export function emptyState(): ProgressState {
  return {
    items: {},
    history: [],
    writingNotes: {},
    writingChecks: {},
    totalReviews: 0,
  };
}

export function exportProgressJSON(state: ProgressState): string {
  return JSON.stringify(state, null, 2);
}

export function importProgressJSON(json: string): ProgressState {
  const parsed = JSON.parse(json) as Partial<ProgressState>;
  return {
    items: parsed.items ?? {},
    history: parsed.history ?? [],
    writingNotes: parsed.writingNotes ?? {},
    writingChecks: parsed.writingChecks ?? {},
    totalReviews: parsed.totalReviews ?? 0,
  };
}
