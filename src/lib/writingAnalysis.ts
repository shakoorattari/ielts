/**
 * Deterministic checks on a Task 2 draft. Nothing here estimates a band or judges whether an argument is good:
 * it counts and flags things a learner can act on (length, structure, linking words, repetition, informal
 * wording, collocations used). Pure functions, no browser APIs.
 */
import type { Item } from '../types';

export const MIN_WORDS_TASK2 = 250;

const WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export const wordsOf = (text: string): string[] => text.match(WORD_RE) ?? [];

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"'“‘(])/)
    .map((s) => s.trim())
    .filter((s) => wordsOf(s).length > 0);
}

/** Linking devices by function. Multi-word entries are matched as phrases. */
export const LINKING: Record<string, string[]> = {
  'Adding a point': ['furthermore', 'moreover', 'in addition', 'additionally', 'besides', 'what is more', 'also'],
  'Contrasting': ['however', 'nevertheless', 'nonetheless', 'on the other hand', 'in contrast', 'conversely', 'whereas', 'while', 'although', 'despite', 'in spite of', 'yet'],
  'Cause and result': ['therefore', 'consequently', 'as a result', 'thus', 'hence', 'because of', 'due to', 'owing to', 'so that', 'leads to', 'results in'],
  'Giving examples': ['for example', 'for instance', 'such as', 'in particular', 'namely', 'to illustrate'],
  'Ordering ideas': ['firstly', 'first of all', 'secondly', 'thirdly', 'finally', 'lastly', 'to begin with', 'subsequently'],
  'Concluding': ['in conclusion', 'to conclude', 'to sum up', 'in summary', 'overall', 'all things considered'],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (p: string) => new RegExp(`(?<![A-Za-z])${escapeRe(p).replace(/\s+/g, '\\s+')}(?![A-Za-z])`, 'gi');
const LINKING_RES = Object.fromEntries(Object.entries(LINKING).map(([k, v]) => [k, v.map((p) => [p, phraseRe(p)] as const)]));

export interface LinkUse {
  category: string;
  /** phrase -> times used */
  used: { phrase: string; count: number }[];
}

export function linkingUse(text: string): LinkUse[] {
  return Object.keys(LINKING).map((category) => ({
    category,
    used: LINKING_RES[category]
      .map(([phrase, re]) => ({ phrase, count: (text.match(re) ?? []).length }))
      .filter((u) => u.count > 0),
  }));
}

/** Words that read as spoken or vague in an academic essay. Contractions are caught separately; plain words like good/bad/get belong to the synonym scanner. */
export const INFORMAL: Record<string, string> = {
  'a lot of': 'many / a great deal of',
  lots: 'many / a great deal',
  kids: 'children',
  stuff: 'things → a specific noun',
  guys: 'people',
  'thing': 'a specific noun',
  'things': 'a specific noun',
  'really': 'remove or use a precise adverb',
  'very': 'use a stronger single word',
  'nowadays': 'today / in recent years',
  'etc': 'finish the list properly',
  'and so on': 'finish the list properly',
};
const INFORMAL_RES = Object.entries(INFORMAL).map(([w, fix]) => [w, fix, phraseRe(w)] as const);
const CONTRACTION_RE = /\b[A-Za-z]+(?:n['’]t|['’](?:re|ve|ll|d|m))\b|\b(?:it|he|she|that|there|what|let)['’]s\b/gi;

export interface InformalHit {
  word: string;
  count: number;
  suggestion: string;
}

export function informalUse(text: string): InformalHit[] {
  const hits: InformalHit[] = [];
  const contractions = text.match(CONTRACTION_RE) ?? [];
  const firstContraction = contractions[0];
  if (firstContraction) {
    hits.push({ word: firstContraction.toLowerCase() + (contractions.length > 1 ? ' …' : ''), count: contractions.length, suggestion: 'write contractions out in full (do not, cannot)' });
  }
  for (const [word, suggestion, re] of INFORMAL_RES) {
    const count = (text.match(re) ?? []).length;
    if (count > 0) hits.push({ word, count, suggestion });
  }
  return hits;
}

const STOP = new Set(
  `a an the and or but if so as at by for in of on to up with from into over than then that this these those is are was were be been being am do does did done have has had having not no nor it its they them their we our you your he she his her i me my who whom which what when where why how can could will would shall should may might must about also more most much many such there here very just only other some any all each both few own same too out off s t`.split(
    /\s+/,
  ),
);

export interface Repeat {
  word: string;
  count: number;
}

/** Content words repeated more than a short essay normally needs. The topic words in the question are not exempt: varying them is the skill. */
export function repeatedWords(text: string, minCount = 4): Repeat[] {
  const counts = new Map<string, number>();
  for (const raw of wordsOf(text)) {
    const w = raw.toLowerCase().replace(/’/g, "'");
    if (w.length < 4 || STOP.has(w)) continue;
    // Count a plural and its singular as one word.
    const key = w.endsWith('s') && w.length > 4 && !w.endsWith('ss') ? w.slice(0, -1) : w;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 10);
}

/** Sentence openers used three or more times (the first word, lower-cased). */
export function repeatedOpeners(sentences: string[], minCount = 3): Repeat[] {
  const counts = new Map<string, number>();
  for (const s of sentences) {
    const first = wordsOf(s)[0]?.toLowerCase();
    if (first) counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/**
 * Collocations from the 1000-item list that appear in the text. The last word may carry a simple ending
 * ("reduce class sizes", "ban plastic bags"), nothing cleverer, so a miss is possible but a false hit is not.
 */
export function collocationsUsed(text: string, items: readonly Item[]): Item[] {
  const lower = text.toLowerCase();
  const found: Item[] = [];
  const seen = new Set<string>(); // the list repeats a few terms under different themes; report each once
  for (const item of items) {
    const term = item.term.toLowerCase().trim();
    if (!term || seen.has(term) || !lower.includes(term.split(/\s+/)[0].slice(0, 4))) continue; // cheap pre-filter before the regex
    const re = new RegExp(`(?<![a-z])${escapeRe(term).replace(/\s+/g, '\\s+')}(?:s|es|ed|d|ing)?(?![a-z])`, 'i');
    if (re.test(text)) {
      found.push(item);
      seen.add(term);
    }
  }
  return found;
}

export interface Analysis {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  /** Unique words / total words, 0 when empty. Falls as essays get longer, so use it to compare drafts of similar length. */
  uniqueRatio: number;
  linking: LinkUse[];
  linkingTotal: number;
  informal: InformalHit[];
  repeats: Repeat[];
  openers: Repeat[];
  collocations: Item[];
  notes: Note[];
}

export type Tone = 'good' | 'warn' | 'info';
export interface Note {
  tone: Tone;
  text: string;
}

export function analyzeWriting(text: string, items: readonly Item[] = []): Analysis {
  const words = wordsOf(text);
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);
  const sentenceLens = sentences.map((s) => wordsOf(s).length);
  const lowerWords = words.map((w) => w.toLowerCase());
  const linking = linkingUse(text);
  const linkingTotal = linking.reduce((n, c) => n + c.used.reduce((m, u) => m + u.count, 0), 0);
  const informal = informalUse(text);
  const repeats = repeatedWords(text);
  const openers = repeatedOpeners(sentences);
  const collocations = collocationsUsed(text, items);

  const a: Analysis = {
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgSentenceWords: sentences.length ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
    longestSentenceWords: sentenceLens.length ? Math.max(...sentenceLens) : 0,
    uniqueRatio: words.length ? Math.round((new Set(lowerWords).size / words.length) * 100) / 100 : 0,
    linking,
    linkingTotal,
    informal,
    repeats,
    openers,
    collocations,
    notes: [],
  };
  a.notes = buildNotes(a);
  return a;
}

function buildNotes(a: Analysis): Note[] {
  const n: Note[] = [];
  if (a.words === 0) return n;
  if (a.words < MIN_WORDS_TASK2) {
    n.push({ tone: 'warn', text: `${a.words} words. Task 2 asks for at least ${MIN_WORDS_TASK2}; a shorter answer is penalised under Task Response.` });
  } else if (a.words > 330) {
    n.push({ tone: 'info', text: `${a.words} words. There is no upper limit, but past about 320 you risk errors and running out of time.` });
  } else {
    n.push({ tone: 'good', text: `${a.words} words: a good length for Task 2.` });
  }
  if (a.paragraphs < 4) n.push({ tone: 'warn', text: `${a.paragraphs} paragraph${a.paragraphs === 1 ? '' : 's'}. Most strong answers use four or five: an introduction, two or three body paragraphs and a conclusion. Leave a blank line between paragraphs.` });
  else if (a.paragraphs > 6) n.push({ tone: 'warn', text: `${a.paragraphs} paragraphs is a lot for 250 to 320 words. Join thin paragraphs together.` });
  else n.push({ tone: 'good', text: `${a.paragraphs} paragraphs: a clear structure.` });
  if (a.sentences >= 5) {
    if (a.avgSentenceWords < 12) n.push({ tone: 'warn', text: `Sentences average ${a.avgSentenceWords} words. Join some with because, although or which to show grammatical range.` });
    else if (a.avgSentenceWords > 28) n.push({ tone: 'warn', text: `Sentences average ${a.avgSentenceWords} words. Very long sentences are hard to follow and easy to get wrong; split a few.` });
    else n.push({ tone: 'good', text: `Sentences average ${a.avgSentenceWords} words, a healthy mix.` });
  }
  if (a.words >= 120) {
    if (a.linkingTotal === 0) n.push({ tone: 'warn', text: 'No linking words found. Connect your ideas with devices such as however, for example and as a result.' });
    else if (a.linkingTotal > Math.max(10, a.words / 20)) n.push({ tone: 'warn', text: `${a.linkingTotal} linking words is heavy. Over-use sounds mechanical; let some ideas connect by meaning.` });
    const heavy = a.linking.flatMap((c) => c.used).find((u) => u.count >= 3);
    if (heavy) n.push({ tone: 'warn', text: `"${heavy.phrase}" appears ${heavy.count} times. Vary your linking words.` });
  }
  if (a.informal.length) n.push({ tone: 'warn', text: 'Informal or vague wording found (see the list below). Essays use a formal register.' });
  if (a.repeats.length) n.push({ tone: 'warn', text: `"${a.repeats[0].word}" is used ${a.repeats[0].count} times. Use synonyms and pronouns to avoid repeating yourself.` });
  if (a.openers.length) n.push({ tone: 'warn', text: `${a.openers[0].count} sentences begin with "${a.openers[0].word}". Vary how your sentences start.` });
  if (a.collocations.length >= 3) n.push({ tone: 'good', text: `${a.collocations.length} collocations from the 1000-collocation list used.` });
  return n;
}

/** Writing is marked on four equally weighted criteria; the reported band is their mean, rounded like the overall band. */
export const CRITERIA = ['Task Response', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy'] as const;
