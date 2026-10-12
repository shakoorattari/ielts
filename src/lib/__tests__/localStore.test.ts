import { describe, expect, it, vi } from 'vitest';
import { createLocalStore, isRecord, num, str } from '../localStore';
import { reloadLabState } from '../labState';
import { useLabState } from '../labState';
import { act, renderHook } from '@testing-library/react';

type S = { n: number; tags: string[] };
const normalize = (v: unknown): S => {
  const p = isRecord(v) ? v : {};
  return { n: num(p.n), tags: Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === 'string') : [] };
};

describe('createLocalStore', () => {
  it('starts from defaults, persists patches and notifies subscribers', () => {
    const store = createLocalStore('t1', normalize);
    const seen = vi.fn();
    const off = store.subscribe(seen);
    expect(store.get()).toEqual({ n: 0, tags: [] });
    store.set({ n: 3 });
    expect(JSON.parse(localStorage.getItem('t1')!)).toEqual({ n: 3, tags: [] });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    store.set({ n: 4 });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('survives corrupt or hostile stored data', () => {
    for (const bad of ['{nope', 'null', '[1,2]', '"str"', '{"n":"x","tags":[1,"a",null]}']) {
      localStorage.setItem('t2', bad);
      const s = createLocalStore('t2', normalize);
      expect(s.get().n).toBe(0);
      expect(s.get().tags.every((t) => typeof t === 'string')).toBe(true);
    }
  });

  it('keeps working when localStorage throws', () => {
    const store = createLocalStore('t3', normalize);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => store.set({ n: 9 })).not.toThrow();
    expect(store.get().n).toBe(9);
    spy.mockRestore();
  });

  it('follows changes made in another tab', () => {
    const store = createLocalStore('t4', normalize);
    localStorage.setItem('t4', JSON.stringify({ n: 7, tags: ['x'] }));
    window.dispatchEvent(new StorageEvent('storage', { key: 't4' }));
    expect(store.get()).toEqual({ n: 7, tags: ['x'] });
  });

  it('helpers coerce unknown values', () => {
    expect(str(5, 'd')).toBe('d');
    expect(num(NaN, 2)).toBe(2);
    expect(isRecord([])).toBe(false);
  });
});

describe('labState', () => {
  it('drops malformed ratings and attempts instead of crashing', () => {
    localStorage.setItem('ielts-lab:v1', JSON.stringify({ ratings: { a: 99, b: 6 }, attempts: [null, 3, { words: 5, band: 'x' }] }));
    reloadLabState();
    const { result } = renderHook(() => useLabState());
    expect(result.current.state.ratings).toEqual({ b: 6 });
    expect(result.current.state.attempts).toHaveLength(1);
    expect(result.current.state.attempts[0]).toMatchObject({ words: 5, band: null });
  });

  it('caps saved attempts at 50', () => {
    reloadLabState();
    const { result } = renderHook(() => useLabState());
    act(() => {
      for (let i = 0; i < 60; i++) result.current.saveAttempt({ promptN: 0, words: i, band: null });
    });
    expect(result.current.state.attempts).toHaveLength(50);
    expect(result.current.state.attempts.at(-1)?.words).toBe(59);
  });
});
