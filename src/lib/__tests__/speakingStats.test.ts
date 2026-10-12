import { describe, expect, it } from 'vitest';
import { CUE_BY_ID, CUE_CARDS, PART1, PART1_BY_ID } from '../../data/speaking';
import { countFillers, fmtDuration, lengthVerdict, paceVerdict, wordsPerMinute } from '../speakingStats';

describe('countFillers', () => {
  it('counts whole-word fillers and phrases, ignoring words that merely contain them', () => {
    const r = countFillers('Um, I mean, well, um, you know, it was, uh, great. The umbrella and the herd were fine.');
    const map = Object.fromEntries(r.map((f) => [f.filler, f.count]));
    expect(map).toMatchObject({ um: 2, 'i mean': 1, 'you know': 1, uh: 1 });
    expect(map).not.toHaveProperty('er');
  });

  it('counts back-to-back fillers individually', () => {
    expect(countFillers('Um um um, you know you know.')).toEqual([
      { filler: 'um', count: 3 },
      { filler: 'you know', count: 2 },
    ]);
  });

  it('only reports "like" when it is a habit', () => {
    expect(countFillers('I like tea.')).toEqual([]);
    expect(countFillers('It was like big and like loud and like crowded.')[0]).toEqual({ filler: 'like', count: 3 });
  });

  it('is safe on empty input', () => {
    expect(countFillers('')).toEqual([]);
  });
});

describe('pace and length', () => {
  it('computes words per minute and refuses very short samples', () => {
    expect(wordsPerMinute(130, 60)).toBe(130);
    expect(wordsPerMinute(30, 15)).toBe(120);
    expect(wordsPerMinute(5, 4)).toBeNull();
    expect(wordsPerMinute(5, NaN)).toBeNull();
  });

  it('classifies pace', () => {
    expect([90, 140, 190].map(paceVerdict)).toEqual(['slow', 'natural', 'fast']);
  });

  it('judges answer length per part', () => {
    expect(lengthVerdict(2, 45)).toBe('short');
    expect(lengthVerdict(2, 110)).toBe('good');
    expect(lengthVerdict(1, 10)).toBe('short');
    expect(lengthVerdict(1, 30)).toBe('good');
    expect(lengthVerdict(3, 200)).toBe('long');
  });

  it('formats durations', () => {
    expect(fmtDuration(0)).toBe('0:00');
    expect(fmtDuration(125.4)).toBe('2:05');
    expect(fmtDuration(-5)).toBe('0:00');
  });
});

describe('question bank integrity', () => {
  it('has unique ids and complete entries', () => {
    expect(new Set(PART1.map((t) => t.id)).size).toBe(PART1.length);
    expect(new Set(CUE_CARDS.map((c) => c.id)).size).toBe(CUE_CARDS.length);
    expect(Object.keys(PART1_BY_ID)).toHaveLength(PART1.length);
    expect(Object.keys(CUE_BY_ID)).toHaveLength(CUE_CARDS.length);
    for (const t of PART1) {
      expect(t.questions.length, t.id).toBeGreaterThanOrEqual(5);
      for (const q of t.questions) expect(q.trim().endsWith('?'), `${t.id}: ${q}`).toBe(true);
    }
    for (const c of CUE_CARDS) {
      expect(c.title.startsWith('Describe'), c.id).toBe(true);
      expect(c.say, c.id).toHaveLength(3);
      expect(c.explain.endsWith('.'), c.id).toBe(true);
      expect(c.part3.length, c.id).toBeGreaterThanOrEqual(4);
      for (const q of c.part3) expect(q.trim().endsWith('?'), `${c.id}: ${q}`).toBe(true);
    }
  });

  it('has no duplicate questions', () => {
    const all = [...PART1.flatMap((t) => t.questions), ...CUE_CARDS.flatMap((c) => c.part3)];
    expect(new Set(all).size).toBe(all.length);
  });
});
