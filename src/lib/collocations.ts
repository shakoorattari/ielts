import raw from '../data/collocations.json';
import type { Item, RawTheme } from '../types';

const themes = raw as RawTheme[];

function makeId(themeId: number, topicId: number, index: number): string {
  return `${themeId}-${topicId}-${index}`;
}

export const ALL_ITEMS: Item[] = themes.flatMap((theme) =>
  theme.topics.flatMap((topic) =>
    topic.collocations.map((c, index) => ({
      id: makeId(theme.id, topic.id, index),
      themeId: theme.id,
      themeTitle: theme.title,
      topicId: topic.id,
      topicTitle: topic.title,
      term: c.term,
      usage: c.usage,
      meaning: c.meaning,
      example: c.example,
    })),
  ),
);

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(
  ALL_ITEMS.map((item) => [item.id, item]),
);

export interface ThemeSummary {
  id: number;
  title: string;
  topics: { id: number; title: string; itemIds: string[] }[];
  itemIds: string[];
}

export const THEMES: ThemeSummary[] = themes.map((theme) => ({
  id: theme.id,
  title: theme.title,
  topics: theme.topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    itemIds: topic.collocations.map((_, i) => makeId(theme.id, topic.id, i)),
  })),
  itemIds: theme.topics.flatMap((topic) =>
    topic.collocations.map((_, i) => makeId(theme.id, topic.id, i)),
  ),
}));

export function searchItems(query: string, limit = 40): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_ITEMS.filter(
    (item) =>
      item.term.toLowerCase().includes(q) ||
      item.usage.toLowerCase().includes(q) ||
      item.meaning.toLowerCase().includes(q),
  ).slice(0, limit);
}

/** Build a sentence with the collocation's usage phrase blanked out. */
export interface BlankResult {
  before: string;
  after: string;
  /** The exact substring pulled from the example (keeps its original casing). */
  answer: string;
}

/**
 * Blanks out the collocation's core `term` inside its example sentence, since
 * that's the fixed noun/adjective phrase — the `usage` phrase often includes a
 * verb that's conjugated differently in the example ("to reduce" vs "Reducing"),
 * which made it both harder to type and far less likely to match at all.
 * Falls back to the full `usage` phrase for the rare item where only that matches.
 */
export function blankExample(item: Item): BlankResult | null {
  const example = item.example;
  const find = (needle: string): BlankResult | null => {
    const idx = example.toLowerCase().indexOf(needle.toLowerCase());
    if (idx === -1) return null;
    return {
      before: example.slice(0, idx),
      after: example.slice(idx + needle.length),
      answer: example.slice(idx, idx + needle.length),
    };
  };
  return find(item.term) ?? find(item.usage);
}

/** Pick n random distractor meanings, preferring items outside the target's topic. */
export function pickDistractorMeanings(target: Item, n: number): string[] {
  const pool = ALL_ITEMS.filter(
    (i) => i.id !== target.id && i.topicId !== target.topicId,
  );
  const shuffled = shuffle(pool);
  const seen = new Set<string>([target.meaning]);
  const out: string[] = [];
  for (const item of shuffled) {
    if (out.length >= n) break;
    if (seen.has(item.meaning)) continue;
    seen.add(item.meaning);
    out.push(item.meaning);
  }
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
