import raw from '../data/synonyms.json';

export interface Syn {
  w: string;
  ex: string;
  note: string;
  use: string[];
  /** Whether the note is distinctive enough to build a "which word fits this description" question. */
  q: boolean;
  warn?: string;
  hook?: string;
}

export interface Drill {
  plain: string;
  cloze: string;
  /** The plain word or phrase that gets upgraded. */
  base: string;
  ok: string[];
}

export interface SynWord {
  n: number;
  word: string;
  pos: string;
  topics: string[];
  why: string;
  ex: string;
  cloze: string;
  fit: string[];
  wrong: string[];
  syns: Syn[];
  drills: Drill[];
  forms: string[];
  freq: number;
  tip?: string;
  more?: { w: string; note: string }[];
}

export interface ContextQ {
  n: number;
  stem: string;
  options: string[];
  answer: string;
  why: string;
}

export interface ParagraphTask {
  id: string;
  title: string;
  topic: string;
  text: string;
  model: string;
}

export interface EssayPrompt {
  n: number;
  type: string;
  q: string;
}

const data = raw as unknown as {
  words: SynWord[];
  contexts: ContextQ[];
  paragraphs: ParagraphTask[];
  prompts: EssayPrompt[];
};

export const WORDS: SynWord[] = data.words;
export const CONTEXTS: ContextQ[] = data.contexts;
export const PARAGRAPHS: ParagraphTask[] = data.paragraphs;
export const PROMPTS: EssayPrompt[] = data.prompts;
export const WORD_BY_N: Record<number, SynWord> = Object.fromEntries(WORDS.map((w) => [w.n, w]));
export const TOTAL_SYNS = WORDS.reduce((sum, w) => sum + w.syns.length, 0);

export const TOPIC_LABEL: Record<string, string> = {
  general: 'All-purpose',
  society: 'Society',
  education: 'Education',
  environment: 'Environment',
  technology: 'Technology',
  work: 'Work & economy',
  health: 'Health',
};
export const TOPIC_KEYS = Object.keys(TOPIC_LABEL);

/* ---------------------------------------------------------------- text helpers */

export const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Put `option` into a cloze sentence, capitalising it when the blank opens the sentence. */
export function fillCloze(cloze: string, option: string): string {
  const startsBlank = cloze.startsWith('___');
  return cloze.replace('___', startsBlank ? capFirst(option) : option);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Spellings to look for when a synonym is written into a sentence ("a career" also matches "career"). */
function variants(w: string): string[] {
  const out = [w];
  const m = /^(a|an|the) (.+)$/i.exec(w);
  if (m) out.push(m[2]);
  return out;
}

/** Locate a synonym inside a sentence (case-insensitive, whole words). */
export function findSpan(text: string, w: string): [number, number] | null {
  for (const v of variants(w)) {
    const re = new RegExp(`(?<![A-Za-z-])${escapeRe(v)}(?![A-Za-z-])`, 'i');
    const m = re.exec(text);
    if (m) return [m.index, m.index + m[0].length];
  }
  return null;
}

/** A synonym's own example sentence with the synonym blanked out, or null if it can't be located. */
export function clozeOfSyn(s: Syn): string | null {
  const span = findSpan(s.ex, s.w);
  return span ? s.ex.slice(0, span[0]) + '___' + s.ex.slice(span[1]) : null;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export const cardId = (n: number, w: string) => `${n}|${w}`;
export const parseCardId = (id: string): { n: number; w: string } => {
  const i = id.indexOf('|');
  return { n: Number(id.slice(0, i)), w: id.slice(i + 1) };
};

export function allCards(): { id: string; word: SynWord; syn: Syn }[] {
  return WORDS.flatMap((word) => word.syns.map((syn) => ({ id: cardId(word.n, syn.w), word, syn })));
}

/* ---------------------------------------------------------------- text analysis */

export type HitKind = 'basic' | 'upgrade';

export interface Segment {
  start: number;
  end: number;
  kind: HitKind;
  n: number;
  /** For upgrades, the matched synonym. */
  syn?: string;
}

/** Match a phrase as whole words, allowing light inflection on the last word (assist, assists, assisted…). */
function phraseRegex(phrase: string): string {
  const parts = phrase.trim().split(/\s+/);
  const last = parts.pop() as string;
  let tail: string;
  if (/e$/i.test(last)) tail = `${escapeRe(last.slice(0, -1))}(?:e|es|ed|ing|d)`;
  else if (/[^aeiou]y$/i.test(last)) tail = `${escapeRe(last.slice(0, -1))}(?:y|ies|ied|ying)`;
  else tail = `${escapeRe(last)}(?:s|es|ed|ing)?`;
  return [...parts.map(escapeRe), tail].join('\\s+');
}

// "the public" must keep its article ("public" alone is far too common); other article-led phrases match without it.
const KEEP_ARTICLE = new Set(['public', 'community', 'society', 'state', 'youth']);

function synPatterns(w: string): string[] {
  const m = /^(a|an|the) (.+)$/i.exec(w);
  if (m && !KEEP_ARTICLE.has(m[2].toLowerCase())) return [phraseRegex(m[2])];
  return [phraseRegex(w)];
}

interface Detector {
  kind: HitKind;
  n: number;
  label: string;
  re: RegExp;
}

let detectors: Detector[] | null = null;

function getDetectors(): Detector[] {
  if (detectors) return detectors;
  const list: Detector[] = [];
  for (const word of WORDS) {
    const basic = word.forms.map(escapeRe).join('|');
    list.push({ kind: 'basic', n: word.n, label: word.word.toLowerCase(), re: new RegExp(`(?<![A-Za-z-])(?:${basic})(?![A-Za-z-])`, 'gi') });
    for (const syn of word.syns) {
      for (const p of synPatterns(syn.w)) {
        list.push({ kind: 'upgrade', n: word.n, label: syn.w, re: new RegExp(`(?<![A-Za-z-])(?:${p})(?![A-Za-z-])`, 'gi') });
      }
    }
  }
  detectors = list;
  return list;
}

export interface BasicHit {
  n: number;
  word: string;
  count: number;
  /** Count at which this word starts to read as repetitive. */
  limit: number;
}

export interface UpgradeHit {
  n: number;
  syn: string;
  count: number;
}

export interface Analysis {
  words: number;
  segments: Segment[];
  basic: BasicHit[];
  upgrades: UpgradeHit[];
  /** Distinct upgrades used. */
  distinctUpgrades: number;
  /** Basic words used at or above their repeat limit. */
  overused: BasicHit[];
}

const LIMIT_BY_FREQ = [3, 4, 5];

export function analyze(text: string): Analysis {
  const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
  const found: Segment[] = [];
  for (const d of getDetectors()) {
    d.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = d.re.exec(text))) {
      if (m[0].length === 0) {
        d.re.lastIndex++;
        continue;
      }
      found.push({ start: m.index, end: m.index + m[0].length, kind: d.kind, n: d.n, syn: d.kind === 'upgrade' ? d.label : undefined });
    }
  }
  // Longest match wins where spans overlap ("the general populace" beats "general").
  const byLength = [...found].sort((x, y) => y.end - y.start - (x.end - x.start) || x.start - y.start);
  const kept: Segment[] = [];
  for (const s of byLength) {
    if (!kept.some((k) => s.start < k.end && k.start < s.end)) kept.push(s);
  }
  const segments = kept.sort((x, y) => x.start - y.start);
  const basicCount = new Map<number, number>();
  const upCount = new Map<string, UpgradeHit>();
  for (const s of segments) {
    if (s.kind === 'basic') basicCount.set(s.n, (basicCount.get(s.n) ?? 0) + 1);
    else {
      const key = `${s.n}|${s.syn}`;
      const cur = upCount.get(key) ?? { n: s.n, syn: s.syn as string, count: 0 };
      cur.count++;
      upCount.set(key, cur);
    }
  }
  const basic: BasicHit[] = [...basicCount.entries()]
    .map(([n, count]) => ({ n, word: WORD_BY_N[n].word, count, limit: LIMIT_BY_FREQ[WORD_BY_N[n].freq] ?? 3 }))
    .sort((a, b) => b.count - a.count);
  const upgrades = [...upCount.values()].sort((a, b) => b.count - a.count);
  return {
    words,
    segments,
    basic,
    upgrades,
    distinctUpgrades: upgrades.length,
    overused: basic.filter((b) => b.count >= b.limit),
  };
}

/** Which of these words does the text use an upgrade for? */
export function upgradedWords(text: string): Set<number> {
  return new Set(analyze(text).upgrades.map((u) => u.n));
}

export function upgradeVerdict(distinct: number): { tone: 'none' | 'start' | 'good' | 'many' | 'too-many'; label: string; detail: string } {
  if (distinct === 0)
    return { tone: 'none', label: 'No upgrades yet', detail: 'Swap a few plain words for precise ones. Start with the words you know best.' };
  if (distinct === 1)
    return { tone: 'start', label: 'A good start', detail: 'One natural upgrade is fine. Aim for two to five in an essay.' };
  if (distinct <= 5)
    return { tone: 'good', label: 'Sweet spot', detail: 'Two to five upgrades used naturally is exactly what the guide recommends.' };
  if (distinct <= 10)
    return { tone: 'many', label: 'Plenty. Check they sound natural', detail: 'Up to ten is the ceiling. Read it aloud and drop any that feel forced.' };
  return { tone: 'too-many', label: 'Too many', detail: 'Stuffing an essay with advanced words sounds unnatural. Keep the ones you are 100% sure about.' };
}

/* ---------------------------------------------------------------- questions */

export type QuestionKind = 'cloze' | 'nuance' | 'context';

export interface Question {
  id: string;
  kind: QuestionKind;
  n: number;
  /** Short instruction shown above the stem. */
  prompt: string;
  stem: string;
  options: string[];
  answer: string;
  why: string;
}

export interface Scope {
  /** Restrict to these word numbers. */
  words?: number[];
}

const inScope = (n: number, scope: Scope) => !scope.words || scope.words.includes(n);

function showOption(stem: string, option: string): string {
  return stem.startsWith('___') ? capFirst(option) : option;
}

export function clozeQuestions(scope: Scope = {}): Question[] {
  return WORDS.filter((w) => inScope(w.n, scope)).map((w) => {
    const answer = pick(w.fit);
    const options = shuffle([answer, ...shuffle(w.wrong).slice(0, 3)]);
    const others = w.fit.filter((f) => f !== answer);
    return {
      id: `c${w.n}`,
      kind: 'cloze' as const,
      n: w.n,
      prompt: `Upgrade the plain word “${w.word.toLowerCase()}”. Which option fits best?`,
      stem: w.cloze,
      options: options.map((o) => showOption(w.cloze, o)),
      answer: showOption(w.cloze, answer),
      why: `${fillCloze(w.cloze, answer)}${others.length ? ` (${others.map((o) => showOption(w.cloze, o)).join(' and ')} also work.)` : ''}`,
    };
  });
}

export function nuanceQuestions(scope: Scope = {}): Question[] {
  const pool = WORDS.flatMap((w) => w.syns.map((s) => ({ w, s })));
  const out: Question[] = [];
  for (const { w, s } of pool) {
    if (!s.q || !inScope(w.n, scope)) continue;
    const siblings = w.syns.filter((x) => x.w !== s.w).map((x) => x.w);
    const strangers = shuffle(pool.filter((p) => p.w.n !== w.n && p.w.pos === w.pos).map((p) => p.s.w));
    const distractors = [...shuffle(siblings).slice(0, 2), ...strangers].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    if (distractors.length < 3) continue;
    out.push({
      id: `n${w.n}-${s.w}`,
      kind: 'nuance',
      n: w.n,
      prompt: `Which upgrade for “${w.word.toLowerCase()}” matches this description?`,
      stem: `${capFirst(s.note)}.`,
      options: shuffle([s.w, ...distractors]),
      answer: s.w,
      why: `${capFirst(s.w)}: ${s.note}. Example: ${s.ex}`,
    });
  }
  return out;
}

export function contextQuestions(scope: Scope = {}): Question[] {
  return CONTEXTS.filter((c) => inScope(c.n, scope)).map((c, i) => ({
    id: `x${i}-${c.n}`,
    kind: 'context' as const,
    n: c.n,
    prompt: 'Which word fits this context best?',
    stem: c.stem,
    options: shuffle(c.options),
    answer: c.answer,
    why: c.why,
  }));
}

export function buildQuiz(kind: 'mixed' | QuestionKind, count: number, scope: Scope = {}): Question[] {
  const bank =
    kind === 'cloze'
      ? clozeQuestions(scope)
      : kind === 'nuance'
        ? nuanceQuestions(scope)
        : kind === 'context'
          ? contextQuestions(scope)
          : [...clozeQuestions(scope), ...nuanceQuestions(scope), ...contextQuestions(scope)];
  return shuffle(bank).slice(0, count);
}

/* ---------------------------------------------------------------- typed / rewrite items */

export interface TypedItem {
  id: string;
  n: number;
  cloze: string;
  accept: string[];
  base: string;
}

export function typedItems(scope: Scope = {}): TypedItem[] {
  const items: TypedItem[] = [];
  for (const w of WORDS) {
    if (!inScope(w.n, scope)) continue;
    items.push({ id: `t${w.n}-base`, n: w.n, cloze: w.cloze, accept: w.fit, base: w.word.toLowerCase() });
    w.drills.forEach((d, i) =>
      items.push({ id: `t${w.n}-d${i}`, n: w.n, cloze: d.cloze, accept: d.ok, base: d.base.toLowerCase() }),
    );
  }
  return items;
}

export interface RewriteItem {
  id: string;
  n: number;
  plain: string;
  base: string;
  ok: string[];
}

export function rewriteItems(scope: Scope = {}): RewriteItem[] {
  return WORDS.filter((w) => inScope(w.n, scope)).flatMap((w) =>
    w.drills.map((d, i) => ({ id: `r${w.n}-${i}`, n: w.n, plain: d.plain, base: d.base, ok: d.ok })),
  );
}

/** Which prompts to offer for the timed test, grouped by essay type label. */
export const PROMPT_COUNT = PROMPTS.length;

export const speakable = (text: string) => text.replace(/___/g, 'blank');
