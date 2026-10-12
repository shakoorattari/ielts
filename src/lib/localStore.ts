import { useSyncExternalStore } from 'react';

/**
 * A tiny localStorage-backed store for one feature's data. Reads once at creation, writes on every change, keeps open
 * tabs in step through the `storage` event, and survives a missing, full or blocked localStorage (private mode).
 * `normalize` receives whatever JSON was stored (or undefined) and must return a complete, valid value, so data
 * written by an older or corrupted version can never crash a page.
 */
export interface LocalStore<T> {
  get: () => T;
  set: (patch: Partial<T>) => void;
  /** Re-read storage. The tab-sync listener uses this; tests use it to simulate a fresh page load. */
  reload: () => void;
  subscribe: (listener: () => void) => () => void;
}

export function createLocalStore<T extends object>(key: string, normalize: (stored: unknown) => T): LocalStore<T> {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return normalize(raw ? (JSON.parse(raw) as unknown) : undefined);
    } catch {
      return normalize(undefined);
    }
  };

  let state = read();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const store: LocalStore<T> = {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // quota or private mode: the change still applies for this visit
      }
      emit();
    },
    reload() {
      state = read();
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key || e.key === null) store.reload();
    });
  }
  return store;
}

export function useLocalStore<T extends object>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
export const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
