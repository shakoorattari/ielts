import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, ITEM_BY_ID, THEMES, blankExample, pickDistractorMeanings, searchItems, shuffle } from '../collocations';

describe('collocation data', () => {
  it('has the advertised 1000 items in 10 themes and 100 topics, with unique ids', () => {
    expect(ALL_ITEMS).toHaveLength(1000);
    expect(THEMES).toHaveLength(10);
    expect(THEMES.flatMap((t) => t.topics)).toHaveLength(100);
    expect(new Set(ALL_ITEMS.map((i) => i.id)).size).toBe(1000);
  });

  it('every item is complete', () => {
    for (const i of ALL_ITEMS) {
      expect(i.term.trim(), i.id).not.toBe('');
      expect(i.meaning.trim(), i.id).not.toBe('');
      expect(i.example.trim(), i.id).not.toBe('');
    }
  });

  it('fill-the-blank covers all but a few inflected examples (the page skips the rest)', () => {
    // These examples inflect the term ("went viral", "harsher penalties"), so they cannot be blanked verbatim.
    // FillBlank filters them out; this guards against the number growing when data is edited.
    const known = ['1-1-8', '1-3-2', '2-13-4', '4-40-3', '5-42-6', '7-66-2', '9-86-5'];
    const missing = ALL_ITEMS.filter((i) => !blankExample(i)).map((i) => i.id);
    expect(missing).toEqual(known);
  });

  it('searches term, usage and meaning case-insensitively', () => {
    const first = ALL_ITEMS[0];
    expect(searchItems(first.term.toUpperCase()).some((i) => i.id === first.id)).toBe(true);
    expect(searchItems('   ')).toEqual([]);
  });

  it('distractors never repeat the answer or each other', () => {
    const t = ITEM_BY_ID[ALL_ITEMS[5].id];
    const d = pickDistractorMeanings(t, 3);
    expect(d).toHaveLength(3);
    expect(d).not.toContain(t.meaning);
    expect(new Set(d).size).toBe(3);
  });

  it('shuffle keeps every element and does not mutate its input', () => {
    const a = [1, 2, 3, 4, 5];
    const s = shuffle(a);
    expect([...s].sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5]);
  });
});
