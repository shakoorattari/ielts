import { describe, expect, it } from 'vitest';
import { emptyState, exportProgressJSON, importProgressJSON, loadProgress, saveProgress } from '../storage';

describe('storage', () => {
  it('returns an empty state when nothing (or garbage) is stored', () => {
    expect(loadProgress()).toEqual(emptyState());
    localStorage.setItem('ielts-collocations-progress-v1', '{not json');
    expect(loadProgress()).toEqual(emptyState());
  });

  it('round-trips through save/load and export/import', () => {
    const s = { ...emptyState(), totalReviews: 7, history: ['2026-01-01'] };
    saveProgress(s);
    expect(loadProgress()).toEqual(s);
    expect(importProgressJSON(exportProgressJSON(s))).toEqual(s);
  });

  it('fills in fields missing from older exports', () => {
    expect(importProgressJSON('{"totalReviews":2}')).toEqual({ ...emptyState(), totalReviews: 2 });
  });
});
