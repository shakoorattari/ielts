import { useSyncExternalStore } from 'react';
import type { Grade, ItemProgress } from '../types';
import { freshProgress, review } from './srs';

/** Number of base words in the guide (kept here so light pages needn't load the data). */
export const TOTAL_WORDS = 50;
export const MY_LIST_MAX = 5;
export const NEW_CARDS_PER_DAY = 8;

export interface TimedSession {
  at: number;
  minutes: number;
  prompt: number;
  words: number;
  targets: number[];
  used: number[];
  upgrades: number;
}

export type SynMode = 'flashcards' | 'quiz' | 'type' | 'rewrite' | 'timed';

export interface SynAttempt {
  mode: SynMode;
  correct: number;
  total: number;
  at: number;
}

export interface SynState {
  /** The learner's current "starting five". */
  my: number[];
  learned: number[];
  cards: Record<string, ItemProgress>;
  /** Right and wrong answers per word number, across every practice mode. */
  stats: Record<string, { ok: number; bad: number }>;
  sentences: Record<string, string[]>;
  timed: TimedSession[];
  attempts: SynAttempt[];
  /** New cards introduced today, so a session doesn't bury the learner. */
  intro: { day: string; count: number };
}

const KEY = 'ielts-synonyms:v1';
const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT: SynState = {
  my: [],
  learned: [],
  cards: {},
  stats: {},
  sentences: {},
  timed: [],
  attempts: [],
  intro: { day: today(), count: 0 },
};

function load(): SynState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<SynState>) };
  } catch {
    // fall back to defaults
  }
  return DEFAULT;
}

let state: SynState = load();
const listeners = new Set<() => void>();

function set(patch: Partial<SynState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode errors
  }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const toggleIn = (list: number[], n: number) => (list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b));

export const WORD_STAGES = ['Learn', 'Context', 'Pressure', 'Integrate'] as const;

/** How far a word has travelled through the guide's four steps (0 to 4). */
export function stagesFor(s: SynState, n: number): boolean[] {
  const stat = s.stats[String(n)];
  const timedUses = s.timed.filter((t) => t.used.includes(n)).length;
  const own = (s.sentences[String(n)] ?? []).length;
  return [
    s.learned.includes(n),
    (stat?.ok ?? 0) >= 3 || own >= 1,
    timedUses >= 1,
    timedUses >= 3,
  ];
}

export const stageCount = (s: SynState, n: number) => stagesFor(s, n).filter(Boolean).length;

export function dueCardCount(s: SynState, now = Date.now()): number {
  return Object.values(s.cards).filter((c) => c.due <= now).length;
}

export function useSynState() {
  const s = useSyncExternalStore(subscribe, () => state);
  return {
    state: s,
    inMy: (n: number) => s.my.includes(n),
    /** Returns false when the list is full. */
    toggleMy: (n: number): boolean => {
      if (state.my.includes(n)) {
        set({ my: state.my.filter((x) => x !== n) });
        return true;
      }
      if (state.my.length >= MY_LIST_MAX) return false;
      set({ my: [...state.my, n] });
      return true;
    },
    setMy: (my: number[]) => set({ my: my.slice(0, MY_LIST_MAX) }),
    toggleLearned: (n: number) => set({ learned: toggleIn(state.learned, n) }),
    markLearned: (n: number) => {
      if (!state.learned.includes(n)) set({ learned: toggleIn(state.learned, n) });
    },
    record: (n: number, correct: boolean) => {
      const key = String(n);
      const cur = state.stats[key] ?? { ok: 0, bad: 0 };
      set({ stats: { ...state.stats, [key]: { ok: cur.ok + (correct ? 1 : 0), bad: cur.bad + (correct ? 0 : 1) } } });
    },
    gradeCard: (id: string, grade: Grade) => {
      const prev = state.cards[id] ?? freshProgress(id);
      const isNew = prev.reps === 0 && prev.lastReviewed === null;
      const intro = state.intro.day === today() ? state.intro : { day: today(), count: 0 };
      set({
        cards: { ...state.cards, [id]: review(prev, grade) },
        intro: isNew ? { day: intro.day, count: intro.count + 1 } : intro,
      });
    },
    addSentence: (n: number, text: string) => {
      const key = String(n);
      set({ sentences: { ...state.sentences, [key]: [text, ...(state.sentences[key] ?? [])].slice(0, 20) } });
    },
    removeSentence: (n: number, index: number) => {
      const key = String(n);
      const list = (state.sentences[key] ?? []).filter((_, i) => i !== index);
      const sentences = { ...state.sentences };
      if (list.length) sentences[key] = list;
      else delete sentences[key];
      set({ sentences });
    },
    addTimed: (t: TimedSession) => set({ timed: [t, ...state.timed].slice(0, 50) }),
    logAttempt: (a: SynAttempt) => set({ attempts: [a, ...state.attempts].slice(0, 60) }),
    resetAll: () => set({ ...DEFAULT, intro: { day: today(), count: 0 } }),
  };
}

export function newCardsLeftToday(s: SynState): number {
  const used = s.intro.day === today() ? s.intro.count : 0;
  return Math.max(0, NEW_CARDS_PER_DAY - used);
}
