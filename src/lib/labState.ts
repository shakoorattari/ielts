import { createLocalStore, isRecord, newId, num, str, useLocalStore } from './localStore';

/** The learner's Writing Lab data. Lives only in this browser (`ielts-lab:v1`) and is not part of the Gist sync. */
export interface LabAttempt {
  id: string;
  at: number;
  /** Prompt number from the prompt bank, or 0 for a question the learner typed. */
  promptN: number;
  words: number;
  /** Self-assessed writing band, or null when the learner did not rate it. */
  band: number | null;
}

export interface LabState {
  promptN: number;
  customPrompt: string;
  text: string;
  /** Self-assessed level per criterion (4 to 9), keyed by criterion name. */
  ratings: Record<string, number>;
  attempts: LabAttempt[];
}

const MAX_ATTEMPTS = 50;

function normalize(v: unknown): LabState {
  const p = isRecord(v) ? v : {};
  const ratings: Record<string, number> = {};
  if (isRecord(p.ratings)) for (const [k, l] of Object.entries(p.ratings)) if (typeof l === 'number' && l >= 4 && l <= 9) ratings[k] = l;
  const attempts = (Array.isArray(p.attempts) ? p.attempts : [])
    .filter(isRecord)
    .map((a) => ({
      id: str(a.id, newId()),
      at: num(a.at),
      promptN: num(a.promptN),
      words: num(a.words),
      band: typeof a.band === 'number' ? a.band : null,
    }))
    .slice(-MAX_ATTEMPTS);
  return { promptN: num(p.promptN), customPrompt: str(p.customPrompt), text: str(p.text), ratings, attempts };
}

const store = createLocalStore<LabState>('ielts-lab:v1', normalize);

/** Test helper: simulate a fresh page load. */
export const reloadLabState = () => store.reload();

export function useLabState() {
  const state = useLocalStore(store);
  return {
    state,
    setPrompt: (promptN: number) => store.set({ promptN }),
    setCustomPrompt: (customPrompt: string) => store.set({ customPrompt }),
    setText: (text: string) => store.set({ text }),
    setRating: (criterion: string, level: number) => store.set({ ratings: { ...store.get().ratings, [criterion]: level } }),
    clearDraft: () => store.set({ text: '', ratings: {} }),
    saveAttempt: (a: Omit<LabAttempt, 'id' | 'at'>) =>
      store.set({ attempts: [...store.get().attempts, { ...a, id: newId(), at: Date.now() }].slice(-MAX_ATTEMPTS) }),
    deleteAttempt: (id: string) => store.set({ attempts: store.get().attempts.filter((a) => a.id !== id) }),
  };
}
