import { useSyncExternalStore } from 'react';

/** Number of model essays in the library (kept here so lightweight pages needn't load the essay data). */
export const TOTAL_ESSAYS = 202;

export interface EssayState {
  read: number[];
  saved: number[];
  /** The learner's own written answer per essay question, keyed by essay number. */
  drafts: Record<string, string>;
  fontSize: number;
  highlights: boolean;
}

const KEY = 'ielts-essays:v1';

const DEFAULT: EssayState = { read: [], saved: [], drafts: {}, fontSize: 17, highlights: true };

function load(): EssayState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<EssayState>) };
  } catch {
    // fall back to defaults
  }
  return DEFAULT;
}

let state: EssayState = load();
const listeners = new Set<() => void>();

function set(patch: Partial<EssayState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode errors
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep several open tabs in step.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

function toggle(list: number[], n: number): number[] {
  return list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b);
}

export function useEssayState() {
  const s = useSyncExternalStore(subscribe, () => state);
  return {
    state: s,
    isRead: (n: number) => s.read.includes(n),
    isSaved: (n: number) => s.saved.includes(n),
    toggleRead: (n: number) => set({ read: toggle(state.read, n) }),
    markRead: (n: number) => {
      if (!state.read.includes(n)) set({ read: toggle(state.read, n) });
    },
    toggleSaved: (n: number) => set({ saved: toggle(state.saved, n) }),
    setDraft: (n: number, text: string) => {
      const drafts = { ...state.drafts };
      if (text) drafts[String(n)] = text;
      else delete drafts[String(n)];
      set({ drafts });
    },
    setFontSize: (fontSize: number) => set({ fontSize: Math.min(26, Math.max(14, fontSize)) }),
    setHighlights: (highlights: boolean) => set({ highlights }),
  };
}

/** First essay number the learner hasn't read yet (or null once all are read). */
export function nextUnread(read: number[]): number | null {
  const done = new Set(read);
  for (let n = 1; n <= TOTAL_ESSAYS; n++) if (!done.has(n)) return n;
  return null;
}
