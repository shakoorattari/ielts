import { describe, expect, it } from 'vitest';
import { mergeProgressStates } from '../mergeProgress';
import { emptyState } from '../storage';
import { freshProgress } from '../srs';
import type { AttemptRecord } from '../../types';

const attempt = (id: string, t: number): AttemptRecord => ({ id, mode: 'quiz', themeId: 1, total: 10, correct: 5, finishedAt: t });

describe('mergeProgressStates', () => {
  it('keeps the more recently reviewed item from either side', () => {
    const older = { ...freshProgress('a'), reps: 5, lastReviewed: 100 };
    const newer = { ...freshProgress('a'), reps: 1, lastReviewed: 200 };
    const l = { ...emptyState(), items: { a: older } };
    const r = { ...emptyState(), items: { a: newer, b: freshProgress('b') } };
    const m = mergeProgressStates(l, r);
    expect(m.items.a).toBe(newer);
    expect(Object.keys(m.items).sort()).toEqual(['a', 'b']);
    expect(mergeProgressStates(r, l).items.a).toBe(newer); // symmetric
  });

  it('unions streak days (sorted) and attempts (deduped by id)', () => {
    const l = { ...emptyState(), history: ['2026-01-02', '2026-01-03'], attempts: [attempt('1', 10), attempt('2', 20)] };
    const r = { ...emptyState(), history: ['2026-01-01', '2026-01-02'], attempts: [attempt('2', 20), attempt('3', 30)] };
    const m = mergeProgressStates(l, r);
    expect(m.history).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(m.attempts.map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('never un-ticks a writing check and takes the larger review count', () => {
    const l = { ...emptyState(), writingChecks: { x: true }, totalReviews: 3 };
    const r = { ...emptyState(), writingChecks: { x: false, y: true }, totalReviews: 9 };
    const m = mergeProgressStates(l, r);
    expect(m.writingChecks).toEqual({ x: true, y: true });
    expect(m.totalReviews).toBe(9);
  });

  it('keeps a remote draft when the local one is empty', () => {
    const l = { ...emptyState(), writingNotes: { t: '' } };
    const r = { ...emptyState(), writingNotes: { t: 'remote text' } };
    expect(mergeProgressStates(l, r).writingNotes.t).toBe('remote text');
  });
});
