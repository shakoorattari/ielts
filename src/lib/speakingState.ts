import { createLocalStore, isRecord, newId, num, str, useLocalStore } from './localStore';

export type SpeakingMode = 'part1' | 'part2' | 'part3' | 'mock';

export interface SpeakingAttempt {
  id: string;
  at: number;
  mode: SpeakingMode;
  answers: number;
  /** Total time spoken, in seconds. */
  seconds: number;
  /** Self-assessed band, or null if not rated. */
  band: number | null;
}

export interface SpeakingState {
  /** Remember the learner's microphone choices between visits. Audio itself is never stored. */
  record: boolean;
  transcribe: boolean;
  attempts: SpeakingAttempt[];
}

const MAX_ATTEMPTS = 50;
const MODES: SpeakingMode[] = ['part1', 'part2', 'part3', 'mock'];

function normalize(v: unknown): SpeakingState {
  const p = isRecord(v) ? v : {};
  const attempts = (Array.isArray(p.attempts) ? p.attempts : [])
    .filter(isRecord)
    .map((a) => ({
      id: str(a.id, newId()),
      at: num(a.at),
      mode: (MODES as string[]).includes(str(a.mode)) ? (a.mode as SpeakingMode) : 'part1',
      answers: num(a.answers),
      seconds: num(a.seconds),
      band: typeof a.band === 'number' ? a.band : null,
    }))
    .slice(-MAX_ATTEMPTS);
  return { record: p.record === true, transcribe: p.transcribe === true, attempts };
}

const store = createLocalStore<SpeakingState>('ielts-speaking:v1', normalize);
export const reloadSpeakingState = () => store.reload();

export function useSpeakingState() {
  const state = useLocalStore(store);
  return {
    state,
    setRecord: (record: boolean) => store.set({ record }),
    setTranscribe: (transcribe: boolean) => store.set({ transcribe }),
    saveAttempt: (a: Omit<SpeakingAttempt, 'id' | 'at'>) =>
      store.set({ attempts: [...store.get().attempts, { ...a, id: newId(), at: Date.now() }].slice(-MAX_ATTEMPTS) }),
    deleteAttempt: (id: string) => store.set({ attempts: store.get().attempts.filter((a) => a.id !== id) }),
  };
}
