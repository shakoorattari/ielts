import { useEffect, useSyncExternalStore } from 'react';

/*
 * Chrome's built-in AI (the Prompt API). The model runs on the learner's own computer, so their writing is
 * not sent to this site or to any server. Chrome downloads the model itself, once, after the learner asks.
 * Everything here is feature-detected: on browsers without the API the rest of the site works unchanged.
 */

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (e: { loaded: number }) => void): void;
}

interface CreateOptions {
  expectedInputs?: { type: 'text'; languages: string[] }[];
  expectedOutputs?: { type: 'text'; languages: string[] }[];
  initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface LanguageModelSession {
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(options?: CreateOptions): Promise<Availability>;
  create(options?: CreateOptions): Promise<LanguageModelSession>;
}

const api = (): LanguageModelStatic | undefined => (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;

const OPTS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

export type NoApiHint = 'mobile' | 'other-browser' | 'old-chrome';

export type AiState =
  | { kind: 'checking' }
  /** The browser has no Prompt API at all. `hint` says why, so the message can be specific. */
  | { kind: 'no-api'; hint: NoApiHint }
  /** The API exists but this computer can't run the model (disk, memory or policy). */
  | { kind: 'unavailable' }
  | { kind: 'downloadable'; error?: string }
  | { kind: 'downloading'; progress: number | null }
  | { kind: 'ready' };

let state: AiState = { kind: 'checking' };
const listeners = new Set<() => void>();

function setState(next: AiState) {
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function noApiHint(): NoApiHint {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  const ua = navigator.userAgent;
  if (nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|CriOS/i.test(ua)) return 'mobile';
  // Chrome, Edge, Brave and Opera all carry "Chrome/<version>". Firefox and Safari don't.
  return /Chrome\/\d+/.test(ua) ? 'old-chrome' : 'other-browser';
}

/** Looks at what this browser and computer can do. Safe to call often. */
export async function refreshAi(): Promise<void> {
  if (state.kind === 'downloading') return;
  const lm = api();
  if (!lm) {
    setState({ kind: 'no-api', hint: noApiHint() });
    return;
  }
  try {
    const a = await lm.availability(OPTS);
    if (a === 'available') setState({ kind: 'ready' });
    else if (a === 'downloadable') setState({ kind: 'downloadable' });
    else if (a === 'downloading') setState({ kind: 'downloading', progress: null });
    else setState({ kind: 'unavailable' });
  } catch {
    setState({ kind: 'unavailable' });
  }
}

/** Starts Chrome's one-time model download. Must be called from a click (the browser needs a user gesture). */
export async function enableAi(): Promise<void> {
  const lm = api();
  if (!lm) return;
  setState({ kind: 'downloading', progress: 0 });
  try {
    const session = await lm.create({
      ...OPTS,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => setState({ kind: 'downloading', progress: e.loaded }));
      },
    });
    session.destroy();
    setState({ kind: 'ready' });
  } catch (e) {
    setState({ kind: 'downloadable', error: describeAiError(e) });
  }
}

export function useChromeAi() {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    void refreshAi();
  }, []);
  return { state: s, enable: enableAi };
}

/* ------------------------------------------------------------------ running prompts */

const bases = new Map<string, Promise<LanguageModelSession>>();

/** One set-up session per task (system prompt), reused by cloning so each request starts clean. */
function baseSession(key: string, system: string): Promise<LanguageModelSession> {
  let p = bases.get(key);
  if (!p) {
    const lm = api();
    if (!lm) return Promise.reject(new Error('The AI coach is not available in this browser.'));
    p = lm.create({ ...OPTS, initialPrompts: [{ role: 'system', content: system }] });
    p.catch(() => bases.delete(key));
    bases.set(key, p);
  }
  return p;
}

export function describeAiError(e: unknown): string {
  const err = e as { name?: string; message?: string };
  if (err?.name === 'AbortError') return 'Cancelled.';
  if (err?.name === 'QuotaExceededError') return 'That text is too long for the on-device AI. Try a shorter piece.';
  if (err?.name === 'NotSupportedError') return 'This browser’s AI does not support that request.';
  if (err?.name === 'NotAllowedError') return 'Chrome needs a click before it can start the AI. Press the button again.';
  if (err?.name === 'AiFormatError') return err.message ?? 'Please try again.';
  return err?.message ? `The AI coach could not finish: ${err.message}` : 'The AI coach could not finish. Please try again.';
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const m = /\{[\s\S]*\}/.exec(raw);
    if (m) return JSON.parse(m[0]) as T;
    throw Object.assign(new Error('The AI gave an answer in an unexpected format. Please try again.'), { name: 'AiFormatError' });
  }
}

/** Asks the on-device model a question and gets back JSON that matches `schema`. */
export async function askJson<T>(opts: { key: string; system: string; prompt: string; schema: object; signal?: AbortSignal }): Promise<T> {
  try {
    const base = await baseSession(opts.key, opts.system);
    const session = await base.clone({ signal: opts.signal });
    try {
      const raw = await session.prompt(opts.prompt, { responseConstraint: opts.schema, signal: opts.signal });
      return parseJson<T>(raw);
    } finally {
      session.destroy();
    }
  } catch (e) {
    // A failed session may be stale (for example if Chrome reclaimed the model), so the next request starts a fresh one.
    const name = (e as { name?: string })?.name;
    if (name !== 'AbortError' && name !== 'QuotaExceededError') {
      const old = bases.get(opts.key);
      bases.delete(opts.key);
      old?.then((s) => s.destroy()).catch(() => {});
    }
    throw e;
  }
}
