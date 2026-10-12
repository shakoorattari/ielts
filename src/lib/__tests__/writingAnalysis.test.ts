import { describe, expect, it } from 'vitest';
import { ALL_ITEMS } from '../collocations';
import { analyzeWriting, collocationsUsed, informalUse, linkingUse, repeatedOpeners, repeatedWords, splitParagraphs, splitSentences, wordsOf } from '../writingAnalysis';

describe('tokenising', () => {
  it('counts hyphenated words and apostrophes as one word', () => {
    expect(wordsOf("A well-known fact isn't hidden, 3 times.")).toEqual(['A', 'well-known', 'fact', "isn't", 'hidden', '3', 'times']);
    expect(wordsOf('')).toEqual([]);
  });

  it('splits paragraphs on blank lines only', () => {
    expect(splitParagraphs('One.\nStill one.\n\nTwo.\n\n\n  \nThree.')).toEqual(['One.\nStill one.', 'Two.', 'Three.']);
  });

  it('splits sentences without breaking on decimals or lower-case continuations', () => {
    expect(splitSentences('Prices rose 3.5 percent. Why? Because demand grew! Fine.')).toHaveLength(4);
    expect(splitSentences('It costs 3.5 million dollars.')).toHaveLength(1);
  });
});

describe('linking words', () => {
  it('finds single words and phrases case-insensitively, without matching inside other words', () => {
    const u = linkingUse('However, this is true. For example, cats. In Addition, dogs. Thereforeness is not a word.');
    const flat = u.flatMap((c) => c.used.map((x) => x.phrase));
    expect(flat).toEqual(expect.arrayContaining(['however', 'for example', 'in addition']));
    expect(flat).not.toContain('therefore');
  });
});

describe('informal wording', () => {
  it('flags contractions and informal words', () => {
    const hits = informalUse("Kids don't need stuff. It's a lot of money.");
    const words = hits.map((h) => h.word);
    expect(words.some((w) => w.startsWith("don't"))).toBe(true);
    expect(words).toEqual(expect.arrayContaining(['kids', 'stuff', 'a lot of']));
  });

  it('does not flag formal text or possessives', () => {
    expect(informalUse("The government's policy does not allow children to attend.")).toEqual([]);
  });
});

describe('repetition', () => {
  it('counts plurals with their singular and ignores stop words', () => {
    const r = repeatedWords('Pollution is bad. Pollutions spread. The pollution grows and pollution kills.');
    expect(r[0]).toEqual({ word: 'pollution', count: 4 });
    expect(repeatedWords('the the the the the and and and and')).toEqual([]);
  });

  it('flags a repeated sentence opener', () => {
    const s = splitSentences('People work. People rest. People play. Dogs bark.');
    expect(repeatedOpeners(s)).toEqual([{ word: 'people', count: 3 }]);
  });
});

describe('collocationsUsed', () => {
  it('finds a collocation with a plural or past-tense ending and ignores near misses', () => {
    const item = ALL_ITEMS.find((i) => i.term.split(' ').length === 2)!;
    expect(collocationsUsed(`We discuss ${item.term} today.`, ALL_ITEMS).map((i) => i.id)).toContain(item.id);
    expect(collocationsUsed(`We discuss ${item.term}s today.`, ALL_ITEMS).map((i) => i.id)).toContain(item.id);
    expect(collocationsUsed(`We discuss x${item.term} today.`, ALL_ITEMS).map((i) => i.id)).not.toContain(item.id);
  });

  it('reports a term once even when the list repeats it under several themes', () => {
    const dupes = ALL_ITEMS.filter((i) => ALL_ITEMS.filter((j) => j.term.toLowerCase() === i.term.toLowerCase()).length > 1);
    expect(dupes.length).toBeGreaterThan(0); // the data really does contain repeats (e.g. "public transport")
    const found = collocationsUsed(`We discuss ${dupes[0].term} today.`, ALL_ITEMS);
    expect(found.filter((i) => i.term.toLowerCase() === dupes[0].term.toLowerCase())).toHaveLength(1);
  });

  it('handles every one of the 1000 terms without throwing', () => {
    const text = ALL_ITEMS.map((i) => i.term).join('. ');
    const found = collocationsUsed(text, ALL_ITEMS);
    expect(found.length).toBeGreaterThan(850);
  });
});

describe('analyzeWriting', () => {
  it('is empty-safe', () => {
    const a = analyzeWriting('', ALL_ITEMS);
    expect(a.words).toBe(0);
    expect(a.notes).toEqual([]);
    expect(a.avgSentenceWords).toBe(0);
  });

  it('warns about a short single-paragraph answer', () => {
    const a = analyzeWriting('Technology helps people. It is useful.', ALL_ITEMS);
    expect(a.notes.some((n) => n.tone === 'warn' && /at least 250/.test(n.text))).toBe(true);
    expect(a.notes.some((n) => /1 paragraph\./.test(n.text))).toBe(true);
  });

  it('is happy with a well-formed 4-paragraph answer', () => {
    const para = (i: number) =>
      `Paragraph ${i} explains one distinct point about urban transport in considerable detail, because commuters depend on reliable services. However, costs matter greatly to every household. For example, fares have risen steadily over the past decade, which affects low-income families most. Therefore, governments should invest in cheaper networks. ` +
      'Public ownership could also stabilise prices while improving maintenance and safety standards across many regions of the country.';
    const text = [1, 2, 3, 4].map(para).join('\n\n');
    const a = analyzeWriting(text, ALL_ITEMS);
    expect(a.paragraphs).toBe(4);
    expect(a.words).toBeGreaterThanOrEqual(250);
    expect(a.notes.some((n) => /a good length/.test(n.text))).toBe(true);
    expect(a.notes.some((n) => /clear structure/.test(n.text))).toBe(true);
    expect(a.linkingTotal).toBeGreaterThan(0);
  });

  it('completes quickly on a long text', () => {
    const text = ('Governments should invest in public transport because it reduces pollution. ').repeat(80);
    const t = performance.now();
    analyzeWriting(text, ALL_ITEMS);
    expect(performance.now() - t).toBeLessThan(500);
  });
});
