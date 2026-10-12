/** Measures taken from a spoken answer's transcript and length. Pure functions. */
import { wordsOf } from './writingAnalysis';

/** Single-word fillers, plus phrases. Matching is on whole words only. */
const FILLER_WORDS = ['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'like', 'basically', 'actually', 'literally'];
const FILLER_PHRASES = ['you know', 'i mean', 'sort of', 'kind of', 'you see'];

export interface Filler {
  filler: string;
  count: number;
}

export function countFillers(transcript: string): Filler[] {
  const tokens = wordsOf(transcript).map((w) => w.toLowerCase());
  const out: Filler[] = [];
  // Work on word tokens (not a joined string) so back-to-back fillers such as "um um" are each counted.
  for (const f of [...FILLER_PHRASES, ...FILLER_WORDS]) {
    const parts = f.split(' ');
    let count = 0;
    for (let i = 0; i + parts.length <= tokens.length; i++) {
      if (parts.every((p, j) => tokens[i + j] === p)) count++;
    }
    // "like" is a normal word too; only report it when it is clearly a habit (3+).
    if (count > 0 && (f !== 'like' || count >= 3)) out.push({ filler: f, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

/** Words per minute, or null when the length is too short to mean anything. */
export function wordsPerMinute(words: number, seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds < 10 || words < 0) return null;
  return Math.round((words / seconds) * 60);
}

export type PaceVerdict = 'slow' | 'natural' | 'fast';

/** Fluent English speech sits around 110 to 170 words a minute; the exam does not reward speed. */
export function paceVerdict(wpm: number): PaceVerdict {
  if (wpm < 100) return 'slow';
  if (wpm > 175) return 'fast';
  return 'natural';
}

export type Part = 1 | 2 | 3;

/** Suggested speaking length in seconds [min, max] for a single answer. */
export const TARGET_SECONDS: Record<Part, [number, number]> = { 1: [15, 40], 2: [90, 120], 3: [25, 60] };

export type LengthVerdict = 'short' | 'good' | 'long';

export function lengthVerdict(part: Part, seconds: number): LengthVerdict {
  const [min, max] = TARGET_SECONDS[part];
  if (seconds < min) return 'short';
  if (seconds > max + 20) return 'long'; // an examiner will stop Part 2 at two minutes, and Part 1 answers should stay brief
  return 'good';
}

export const fmtDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
