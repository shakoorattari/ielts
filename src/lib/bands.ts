/**
 * IELTS band arithmetic. Pure functions, no browser APIs.
 *
 * Overall rounding follows ielts.org: the mean of the four skills is rounded to the nearest half band, where an
 * average ending .25 goes up to the next half and .75 goes up to the next whole band.
 *
 * Raw-score conversion tables are the ones printed in the Cambridge IELTS books. Real tests can shift a boundary by
 * one mark, so the UI presents these as estimates.
 */

export type Skill = 'listening' | 'reading' | 'writing' | 'speaking';
export const SKILLS: Skill[] = ['listening', 'reading', 'writing', 'speaking'];
export const BANDS: number[] = Array.from({ length: 19 }, (_, i) => i * 0.5); // 0, 0.5 … 9

/** Round the mean of four skill bands to the reported overall band. */
export function overallBand(skills: readonly number[]): number {
  if (skills.length !== 4 || skills.some((b) => !Number.isFinite(b) || b < 0 || b > 9)) {
    throw new RangeError('overallBand needs four bands between 0 and 9');
  }
  const mean = skills.reduce((a, b) => a + b, 0) / 4;
  const whole = Math.floor(mean);
  const frac = mean - whole;
  if (frac < 0.25) return whole;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}

/** The lowest band for one skill that still reaches `target` overall, given the other three. null if even 9 is not enough. */
export function bandNeeded(others: readonly number[], target: number): number | null {
  if (others.length !== 3) throw new RangeError('bandNeeded needs the other three skills');
  for (const candidate of BANDS) {
    if (overallBand([...others, candidate]) >= target) return candidate;
  }
  return null;
}

// [minimum raw score, band], highest first. Anything below the last row is reported as "2 or below".
type Table = readonly (readonly [number, number])[];

const LISTENING: Table = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];
const READING_ACADEMIC: Table = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];
const READING_GENERAL: Table = [
  [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5],
];

export type ConvertKind = 'listening' | 'reading-academic' | 'reading-general';
const TABLES: Record<ConvertKind, Table> = {
  listening: LISTENING,
  'reading-academic': READING_ACADEMIC,
  'reading-general': READING_GENERAL,
};

/** Estimated band for a raw score out of 40. */
export function rawToBand(kind: ConvertKind, raw: number): number {
  if (!Number.isInteger(raw) || raw < 0 || raw > 40) throw new RangeError('raw score must be a whole number from 0 to 40');
  for (const [min, band] of TABLES[kind]) if (raw >= min) return band;
  return 2;
}

/** Raw-score range [min, max] that maps to `band`, for the "how many do I need" view. */
export function rawRangeForBand(kind: ConvertKind, band: number): [number, number] | null {
  const t = TABLES[kind];
  const i = t.findIndex(([, b]) => b === band);
  if (i === -1) return null;
  const max = i === 0 ? 40 : t[i - 1][0] - 1;
  return [t[i][0], max];
}

export const formatBand = (b: number) => b.toFixed(1);
