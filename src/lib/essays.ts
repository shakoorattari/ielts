import raw from '../data/essays.json';

export interface KeyPhrase {
  phrase: string;
  meaning: string;
}

export interface Essay {
  n: number;
  type: string;
  topics: string[];
  /** Question paragraphs (statement, then the task). */
  question: string[];
  /** Body paragraphs; **double asterisks** mark highlighted key phrases. */
  body: string[];
  words: number;
  phrases: KeyPhrase[];
}

export interface Label {
  key: string;
  label: string;
}

interface RawEssay {
  n: number;
  type: string;
  topics: string[];
  q: string[];
  body: string[];
  words: number;
  kp: [string, string][];
}

const data = raw as { types: Label[]; topics: Label[]; essays: RawEssay[] };

export const TYPES: Label[] = data.types;
export const TOPICS: Label[] = data.topics;

export const ESSAYS: Essay[] = data.essays.map((e) => ({
  n: e.n,
  type: e.type,
  topics: e.topics,
  question: e.q,
  body: e.body,
  words: e.words,
  phrases: e.kp.map(([phrase, meaning]) => ({ phrase, meaning })),
}));

export const ESSAY_BY_N: Record<number, Essay> = Object.fromEntries(ESSAYS.map((e) => [e.n, e]));

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.key, t.label]));
const TOPIC_LABEL: Record<string, string> = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));

export const typeLabel = (key: string) => TYPE_LABEL[key] ?? key;
export const topicLabel = (key: string) => TOPIC_LABEL[key] ?? key;

/** Plain text of an essay's question, used for card previews and search. */
export const questionText = (e: Essay) => e.question.join(' ');

/** Lower-cased haystack per essay for quick full-text search. */
const HAY: Record<number, string> = Object.fromEntries(
  ESSAYS.map((e) => [
    e.n,
    [`essay ${e.n}`, typeLabel(e.type), ...e.topics.map(topicLabel), ...e.question, ...e.body, ...e.phrases.map((p) => p.phrase)]
      .join(' ')
      .replace(/\*\*/g, '')
      .toLowerCase(),
  ]),
);

export function matchesQuery(e: Essay, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every((word) => HAY[e.n].includes(word));
}

/** Reading time at a deliberate study pace. */
export const readMinutes = (e: Essay) => Math.max(1, Math.round(e.words / 150));

export interface PhraseEntry {
  phrase: string;
  meaning: string;
  essays: number[];
}

const LEAD = /^['"‘“(]*(?:a|an|the|to|of|in|on|for|by|with)\s+/;

function sortKey(phrase: string): string {
  let k = phrase;
  for (let i = 0; i < 2; i++) k = k.replace(LEAD, '');
  return k.replace(/^['"‘“(]+/, '').toLowerCase();
}

/** Every highlighted key phrase across the library, A–Z, with the essays it appears in. */
export const PHRASE_BANK: PhraseEntry[] = (() => {
  const map = new Map<string, PhraseEntry>();
  for (const e of ESSAYS) {
    for (const p of e.phrases) {
      const entry = map.get(p.phrase) ?? { phrase: p.phrase, meaning: p.meaning, essays: [] };
      entry.essays.push(e.n);
      map.set(p.phrase, entry);
    }
  }
  return [...map.values()].sort((a, b) => sortKey(a.phrase).localeCompare(sortKey(b.phrase)));
})();

export function phraseLetter(phrase: string): string {
  const c = sortKey(phrase).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}
