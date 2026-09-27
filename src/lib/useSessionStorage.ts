import { useEffect, useState } from 'react';

const PREFIX = 'ielts-collocations-session:';

/**
 * Like useState, but persisted to localStorage under a namespaced key so an
 * in-progress practice round (queue, index, running score) survives a page
 * refresh instead of restarting from scratch. `initial` is only invoked when
 * nothing is stored yet, matching useState's lazy-initializer semantics.
 */
/** Clears every in-progress practice session (used when the user resets all progress). */
export function clearAllSessions(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function useSessionStorage<T>(key: string, initial: () => T) {
  const storageKey = PREFIX + key;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // fall through to initial()
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore quota / private-mode errors
    }
    // storageKey is constant for the lifetime of a given hook call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValue] as const;
}
