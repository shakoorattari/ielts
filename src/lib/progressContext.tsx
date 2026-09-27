import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AttemptRecord, Grade, ItemProgress, MasteryStatus, PracticeMode, ProgressState } from '../types';
import { ALL_ITEMS, THEMES } from './collocations';
import { freshProgress, isDue, review, reviewFromResult } from './srs';
import { emptyState, exportProgressJSON, importProgressJSON, loadProgress, saveProgress } from './storage';
import { clearAllSessions } from './useSessionStorage';

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const MAX_ATTEMPTS_LOGGED = 300;

function makeAttemptId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ProgressContextValue {
  state: ProgressState;
  getProgress: (id: string) => ItemProgress;
  gradeItem: (id: string, grade: Grade) => void;
  recordResult: (id: string, correct: boolean) => void;
  setWritingNote: (topicKey: string, text: string) => void;
  toggleWritingCheck: (itemId: string) => void;
  logAttempt: (record: { mode: PracticeMode; themeId: number | null; total: number; correct: number }) => void;
  resetProgress: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  applySyncedState: (next: ProgressState) => void;
  dueCount: number;
  streak: number;
  studiedToday: boolean;
  statusCounts: Record<MasteryStatus, number>;
  themeMastery: { id: number; title: string; total: number; mastered: number; pct: number }[];
  overallPct: number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadProgress());

  useEffect(() => {
    saveProgress(state);
  }, [state]);

  const getProgress = useCallback(
    (id: string): ItemProgress => state.items[id] ?? freshProgress(id),
    [state.items],
  );

  const recordActivity = useCallback((s: ProgressState): ProgressState => {
    const key = todayKey();
    if (s.history[s.history.length - 1] === key) return s;
    return { ...s, history: [...s.history, key] };
  }, []);

  const gradeItem = useCallback(
    (id: string, grade: Grade) => {
      setState((prev) => {
        const current = prev.items[id] ?? freshProgress(id);
        const updated = review(current, grade);
        const next: ProgressState = {
          ...prev,
          items: { ...prev.items, [id]: updated },
          totalReviews: prev.totalReviews + 1,
        };
        return recordActivity(next);
      });
    },
    [recordActivity],
  );

  const recordResult = useCallback(
    (id: string, correct: boolean) => {
      setState((prev) => {
        const current = prev.items[id] ?? freshProgress(id);
        const updated = reviewFromResult(current, correct);
        const next: ProgressState = {
          ...prev,
          items: { ...prev.items, [id]: updated },
          totalReviews: prev.totalReviews + 1,
        };
        return recordActivity(next);
      });
    },
    [recordActivity],
  );

  const setWritingNote = useCallback((topicKey: string, text: string) => {
    setState((prev) => ({ ...prev, writingNotes: { ...prev.writingNotes, [topicKey]: text } }));
  }, []);

  const toggleWritingCheck = useCallback(
    (itemId: string) => {
      setState((prev) => {
        const wasChecked = !!prev.writingChecks[itemId];
        const nextChecked = !wasChecked;
        const items = { ...prev.items };
        if (nextChecked) {
          const current = items[itemId] ?? freshProgress(itemId);
          items[itemId] = review(current, 'good');
        }
        const next: ProgressState = {
          ...prev,
          items,
          writingChecks: { ...prev.writingChecks, [itemId]: nextChecked },
        };
        return recordActivity(next);
      });
    },
    [recordActivity],
  );

  const logAttempt = useCallback(
    (record: { mode: PracticeMode; themeId: number | null; total: number; correct: number }) => {
      setState((prev) => {
        const entry: AttemptRecord = { ...record, id: makeAttemptId(), finishedAt: Date.now() };
        const attempts = [...prev.attempts, entry].slice(-MAX_ATTEMPTS_LOGGED);
        return { ...prev, attempts };
      });
    },
    [],
  );

  const resetProgress = useCallback(() => {
    clearAllSessions();
    setState(emptyState());
  }, []);

  const exportJSON = useCallback(() => exportProgressJSON(state), [state]);

  const importJSON = useCallback((json: string) => setState(importProgressJSON(json)), []);

  const applySyncedState = useCallback((next: ProgressState) => setState(next), []);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return ALL_ITEMS.reduce((count, item) => {
      const p = state.items[item.id];
      if (!p) return count;
      return isDue(p, now) && p.reps > 0 ? count + 1 : count;
    }, 0);
  }, [state.items]);

  const streak = useMemo(() => {
    if (state.history.length === 0) return 0;
    const days = new Set(state.history);
    let count = 0;
    const cursor = new Date();
    const hasToday = days.has(todayKey(cursor));
    if (!hasToday) cursor.setDate(cursor.getDate() - 1);
    while (days.has(todayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [state.history]);

  const studiedToday = state.history[state.history.length - 1] === todayKey();

  const statusCounts = useMemo(() => {
    const counts: Record<MasteryStatus, number> = { new: 0, learning: 0, review: 0, mastered: 0 };
    for (const item of ALL_ITEMS) {
      const p = state.items[item.id];
      const status = p?.status ?? 'new';
      counts[status] += 1;
    }
    return counts;
  }, [state.items]);

  const themeMastery = useMemo(
    () =>
      THEMES.map((theme) => {
        const total = theme.itemIds.length;
        const mastered = theme.itemIds.filter((id) => state.items[id]?.status === 'mastered').length;
        return { id: theme.id, title: theme.title, total, mastered, pct: Math.round((mastered / total) * 100) };
      }),
    [state.items],
  );

  const overallPct = Math.round((statusCounts.mastered / ALL_ITEMS.length) * 100);

  const value: ProgressContextValue = {
    state,
    getProgress,
    gradeItem,
    recordResult,
    setWritingNote,
    toggleWritingCheck,
    logAttempt,
    resetProgress,
    exportJSON,
    importJSON,
    applySyncedState,
    dueCount,
    streak,
    studiedToday,
    statusCounts,
    themeMastery,
    overallPct,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
