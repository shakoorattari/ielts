import { useCallback, useState } from 'react';

export type EssaysModule = typeof import('./essays');

let pending: Promise<EssaysModule> | null = null;

/** Loads the essay text on demand (it is ~0.5 MB, so the synonym pages don't carry it until it is needed). */
export function loadEssays(): Promise<EssaysModule> {
  pending ??= import('./essays');
  return pending;
}

/** The body of an essay as plain text, without the highlight markers. */
export const essayPlainText = (e: { body: string[] }) => e.body.join('\n\n').replace(/\*\*/g, '');

/** React hook: `load()` fetches the essays once; `mod` is null until they arrive. */
export function useEssayLibrary() {
  const [mod, setMod] = useState<EssaysModule | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMod(await loadEssays());
    } finally {
      setLoading(false);
    }
  }, []);
  return { mod, loading, load, attach: setMod };
}
