import { describe, expect, it } from 'vitest';
import { freshProgress, isDue, review, reviewFromResult } from '../srs';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('srs', () => {
  it('starts new and due immediately', () => {
    const p = freshProgress('1-1-0');
    expect(p.status).toBe('new');
    expect(p.reps).toBe(0);
  });

  it('"again" puts the item back in learning, due in 10 minutes, and lowers ease (never below 1.3)', () => {
    let p = freshProgress('x');
    for (let i = 0; i < 20; i++) p = review(p, 'again', NOW);
    expect(p.status).toBe('learning');
    expect(p.due).toBe(NOW + 10 * 60 * 1000);
    expect(p.ease).toBeGreaterThanOrEqual(1.3);
    expect(p.lapses).toBe(20);
  });

  it('"good" grows the interval: 1 day first, then by the ease factor', () => {
    const first = review(freshProgress('x'), 'good', NOW);
    expect(first.interval).toBe(1);
    expect(first.due).toBe(NOW + DAY);
    const second = review(first, 'good', NOW);
    expect(second.interval).toBe(Math.round(1 * first.ease));
  });

  it('"easy" on a new item jumps to 2 days and raises ease', () => {
    const p = review(freshProgress('x'), 'easy', NOW);
    expect(p.interval).toBe(2);
    expect(p.ease).toBeGreaterThan(2.5);
  });

  it('caps the interval at 180 days', () => {
    let p = freshProgress('x');
    for (let i = 0; i < 40; i++) p = review(p, 'easy', NOW);
    expect(p.interval).toBeLessThanOrEqual(180);
  });

  it('reaches "mastered" only after a long interval and enough repetitions', () => {
    let p = freshProgress('x');
    expect(review(p, 'good', NOW).status).not.toBe('mastered');
    for (let i = 0; i < 12; i++) p = review(p, 'easy', NOW);
    expect(p.status).toBe('mastered');
  });

  it('maps quiz results onto good/again', () => {
    expect(reviewFromResult(freshProgress('x'), true, NOW).reps).toBe(1);
    expect(reviewFromResult(freshProgress('x'), false, NOW).status).toBe('learning');
  });

  it('isDue compares against the due time', () => {
    const p = { ...freshProgress('x'), due: NOW + 1 };
    expect(isDue(p, NOW)).toBe(false);
    expect(isDue(p, NOW + 1)).toBe(true);
  });
});
