import { describe, expect, it } from 'vitest';
import { isCloseEnough, normalizeAnswer, similarity } from '../match';

describe('match', () => {
  it('ignores case, punctuation, spacing and leading articles', () => {
    expect(normalizeAnswer('  To  Reduce   class size! ')).toBe('reduce class size');
    expect(normalizeAnswer('The Rising Cost.')).toBe('rising cost');
  });

  it('accepts small typos but not different phrases', () => {
    expect(isCloseEnough('class sise', 'class size')).toBe(true);
    expect(isCloseEnough('school fees', 'class size')).toBe(false);
  });

  it('similarity is 1 for identical and for two empties', () => {
    expect(similarity('abc', 'abc')).toBe(1);
    expect(similarity('', '')).toBe(1);
  });
});
