import { describe, expect, it } from 'vitest';
import { BANDS, bandNeeded, overallBand, rawRangeForBand, rawToBand } from '../bands';

describe('overallBand (ielts.org rounding)', () => {
  it.each([
    [[6.5, 6.5, 5, 7], 6.5], // mean 6.25 -> up to 6.5
    [[6.5, 6.5, 6, 7], 6.5], // 6.5
    [[7, 7, 6.5, 7], 7], // 6.875 -> 7
    [[6, 6, 6, 6.5], 6], // 6.125 -> 6.0
    [[4, 4, 4, 3.5], 4], // 3.875 -> 4.0
    [[6.5, 6.5, 6.5, 7], 6.5], // 6.625 -> nearest half
    [[6.5, 7, 7, 7], 7], // 6.875 -> 7
    [[5.5, 6, 6, 6], 6], // 5.875 -> 6
    [[9, 9, 9, 9], 9],
    [[0, 0, 0, 0], 0],
  ] as [number[], number][])('%j -> %d', (skills, expected) => {
    expect(overallBand(skills)).toBe(expected);
  });

  it('rounds .25 up to the next half and .75 up to the next whole band', () => {
    expect(overallBand([6, 6, 6.5, 6.5])).toBe(6.5); // 6.25
    expect(overallBand([6.5, 7, 7, 6.5])).toBe(7); // 6.75
    expect(overallBand([6, 6.5, 6.5, 6.5])).toBe(6.5); // 6.375
  });

  it('rejects invalid input', () => {
    expect(() => overallBand([6, 6, 6])).toThrow(RangeError);
    expect(() => overallBand([6, 6, 6, 10])).toThrow(RangeError);
    expect(() => overallBand([6, 6, 6, NaN])).toThrow(RangeError);
  });

  it('is monotonic: raising any skill never lowers the overall', () => {
    for (const a of BANDS) for (const b of BANDS) {
      let prev = -1;
      for (const c of BANDS) {
        const v = overallBand([a, b, 6, c]);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
  });
});

describe('bandNeeded', () => {
  it('finds the lowest speaking band that reaches the target', () => {
    expect(bandNeeded([7, 7, 6.5], 7)).toBe(6.5); // (7+7+6.5+6.5)/4 = 6.75 -> 7
    expect(bandNeeded([6, 6, 6], 7)).toBe(9); // (18+9)/4 = 6.75 -> 7
    expect(bandNeeded([6, 6, 5.5], 7)).toBeNull();
    expect(bandNeeded([5, 5, 5], 5)).toBe(4); // (15+4)/4 = 4.75 -> 5
  });

  it('the answer reaches the target and one half-band lower does not', () => {
    const others = [6.5, 6, 7];
    for (const target of [6, 6.5, 7]) {
      const need = bandNeeded(others, target)!;
      expect(overallBand([...others, need])).toBeGreaterThanOrEqual(target);
      if (need > 0) expect(overallBand([...others, need - 0.5])).toBeLessThan(target);
    }
  });
});

describe('raw score conversion', () => {
  it('matches the published anchors', () => {
    expect(rawToBand('listening', 40)).toBe(9);
    expect(rawToBand('listening', 30)).toBe(7);
    expect(rawToBand('listening', 23)).toBe(6);
    expect(rawToBand('reading-academic', 30)).toBe(7);
    expect(rawToBand('reading-general', 34)).toBe(7);
    expect(rawToBand('reading-general', 30)).toBe(6);
  });

  it('General Training needs at least as many marks as Academic for the same band', () => {
    for (let raw = 0; raw <= 40; raw++) {
      expect(rawToBand('reading-general', raw)).toBeLessThanOrEqual(rawToBand('reading-academic', raw));
    }
  });

  it('is monotonic and defined for every raw score', () => {
    for (const kind of ['listening', 'reading-academic', 'reading-general'] as const) {
      let prev = 0;
      for (let raw = 0; raw <= 40; raw++) {
        const b = rawToBand(kind, raw);
        expect(b).toBeGreaterThanOrEqual(prev);
        prev = b;
      }
      expect(rawToBand(kind, 0)).toBe(2);
    }
  });

  it('rejects out-of-range scores', () => {
    expect(() => rawToBand('listening', 41)).toThrow(RangeError);
    expect(() => rawToBand('listening', -1)).toThrow(RangeError);
    expect(() => rawToBand('listening', 3.5)).toThrow(RangeError);
  });

  it('rawRangeForBand is the inverse of rawToBand', () => {
    for (const kind of ['listening', 'reading-academic', 'reading-general'] as const) {
      for (const band of BANDS) {
        const r = rawRangeForBand(kind, band);
        if (!r) continue;
        expect(rawToBand(kind, r[0])).toBe(band);
        expect(rawToBand(kind, r[1])).toBe(band);
      }
    }
    expect(rawRangeForBand('listening', 9)).toEqual([39, 40]);
    expect(rawRangeForBand('listening', 1)).toBeNull();
  });
});
