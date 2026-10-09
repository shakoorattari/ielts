import { useSyncExternalStore } from 'react';
import { parseJson } from './chromeAi';

/*
 * "Use your own free AI key": for phones, tablets, Safari, Firefox and computers that can't run Chrome's
 * on-device AI. The learner pastes a key they created themselves with a free provider. It is stored only in
 * this browser, requests go straight from their browser to the provider (this site has no server), and nothing
 * is sent until they have agreed. Every provider here speaks the same OpenAI-style "chat completions" format.
 */

export type ProviderKey = 'groq' | 'gemini' | 'custom';

export interface ProviderInfo {
  label: string;
  baseUrl: string;
  keyUrl: string;
  defaultModel: string;
  /** Plain-language note about where the writing goes. Kept cautious: terms change, so learners should read them. */
  privacy: string;
}

export const PROVIDERS: Record<ProviderKey, ProviderInfo> = {
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-3.1-8b-instant',
    privacy: 'Free plan, no card needed. Your writing goes to Groq. Read Groq’s privacy policy before you use it.',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-flash-latest',
    privacy:
      'Free plan. According to Google’s terms, free-tier content may be used to improve Google’s products and reviewed by people, and the free tier is restricted in the EU, UK and Switzerland. If you are there, choose Groq instead.',
  },
  custom: {
    label: 'Other (OpenAI-compatible)',
    baseUrl: '',
    keyUrl: '',
    defaultModel: '',
    privacy: 'Your writing goes to whichever service you enter. Read its privacy policy first.',
  },
};

export interface CloudSettings {
  provider: ProviderKey;
  apiKey: string;
  model: string;
  /** Only used for the "custom" provider. */
  baseUrl: string;
  /** The learner has agreed that their writing is sent to the provider. */
  consent: boolean;
}

const KEY = 'ielts-ai-cloud:v1';

function load(): CloudSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<CloudSettings>;
      if (s.apiKey && s.model && s.provider && s.consent) return { baseUrl: '', ...s } as CloudSettings;
    }
  } catch {
    // ignore
  }
  return null;
}

let settings: CloudSettings | null = load();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function saveCloudSettings(s: CloudSettings) {
  settings = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // keep it in memory for this visit
  }
  listeners.forEach((l) => l());
}

export function clearCloudSettings() {
  settings = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export const getCloudSettings = () => settings;
export const isCloudReady = () => settings !== null;

export function useCloudAi() {
  return useSyncExternalStore(subscribe, () => settings);
}

export const baseUrlOf = (s: Pick<CloudSettings, 'provider' | 'baseUrl'>) =>
  (s.provider === 'custom' ? s.baseUrl : PROVIDERS[s.provider].baseUrl).replace(/\/+$/, '');

export const providerLabel = (s: CloudSettings) => (s.provider === 'custom' ? hostOf(s.baseUrl) || 'your AI provider' : PROVIDERS[s.provider].label);

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ requests */

function httpError(status: number, detail: string): Error {
  return Object.assign(new Error(detail || `HTTP ${status}`), { name: 'CloudHttpError', status });
}

async function request(url: string, apiKey: string, init: RequestInit & { signal?: AbortSignal }): Promise<Response> {
  // A request should never hang forever on a slow phone connection. (Hand-rolled so older Safari works too.)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  const onAbort = () => controller.abort();
  init.signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      referrerPolicy: 'no-referrer',
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', onAbort);
  }
}

type Chat = { role: 'system' | 'user'; content: string }[];

type ChatSettings = Pick<CloudSettings, 'provider' | 'apiKey' | 'model' | 'baseUrl'>;

/** One chat-completions call. Asks for JSON mode first and retries without it if the provider rejects the option. */
export async function chat(s: ChatSettings, messages: Chat, opts: { json?: boolean; maxTokens?: number; signal?: AbortSignal } = {}): Promise<string> {
  const url = `${baseUrlOf(s)}/chat/completions`;
  const body = (json: boolean) =>
    JSON.stringify({
      model: s.model.replace(/^models\//, ''),
      messages,
      temperature: 0.3,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
  let res = await request(url, s.apiKey, { method: 'POST', body: body(!!opts.json), signal: opts.signal });
  if (!res.ok && opts.json && (res.status === 400 || res.status === 422)) {
    res = await request(url, s.apiKey, { method: 'POST', body: body(false), signal: opts.signal });
  }
  if (!res.ok) throw httpError(res.status, await errorDetail(res));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw Object.assign(new Error('The AI gave an empty answer. Please try again.'), { name: 'AiFormatError' });
  return text;
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string } | string; message?: string };
    const m = typeof j.error === 'string' ? j.error : (j.error?.message ?? j.message ?? '');
    return String(m).slice(0, 200);
  } catch {
    return '';
  }
}

/** Same contract as the on-device engine: ask a question, get JSON back. */
export async function cloudAskJson<T>(opts: { system: string; prompt: string; schema: object; signal?: AbortSignal }): Promise<T> {
  const s = settings;
  if (!s) throw Object.assign(new Error('The AI coach is not set up.'), { name: 'AiFormatError' });
  const text = await chat(
    s,
    [
      { role: 'system', content: opts.system },
      {
        role: 'user',
        content: `${opts.prompt}\n\nReply with ONLY a JSON object that matches this JSON Schema, and nothing else:\n${JSON.stringify(opts.schema)}`,
      },
    ],
    { json: true, signal: opts.signal },
  );
  return parseJson<T>(text);
}

/** Model names change often, so list what this key can use instead of hard-coding one. */
export async function listModels(s: Pick<CloudSettings, 'provider' | 'apiKey' | 'baseUrl'>, signal?: AbortSignal): Promise<string[]> {
  const res = await request(`${baseUrlOf(s)}/models`, s.apiKey, { method: 'GET', signal });
  if (!res.ok) throw httpError(res.status, await errorDetail(res));
  const data = (await res.json()) as { data?: { id?: string }[] };
  return (data.data ?? []).map((m) => String(m.id ?? '').replace(/^models\//, '')).filter(Boolean);
}

const NOT_CHAT = /whisper|tts|speech|embed|guard|moderation|image|imagen|veo|audio|live|orpheus|transcribe|vision-only/i;

/** Picks a small, fast text model from the list the provider returned. */
export function pickDefaultModel(provider: ProviderKey, ids: string[]): string {
  const chatModels = ids.filter((id) => !NOT_CHAT.test(id));
  const fallback = PROVIDERS[provider].defaultModel;
  if (provider === 'groq') {
    return chatModels.find((id) => id === fallback) ?? chatModels.find((id) => /8b.*instant|instant/i.test(id)) ?? chatModels[0] ?? fallback;
  }
  if (provider === 'gemini') {
    const flash = chatModels.filter((id) => /^gemini/i.test(id) && /flash/i.test(id) && !/preview|exp|thinking/i.test(id));
    const lite = flash.filter((id) => /lite/i.test(id)).sort().reverse();
    return lite[0] ?? flash.sort().reverse()[0] ?? fallback;
  }
  return chatModels[0] ?? fallback;
}

/** A tiny request that proves the key, address and model all work. */
export async function testConnection(s: ChatSettings, signal?: AbortSignal): Promise<void> {
  await chat(s, [{ role: 'user', content: 'Reply with the single word OK.' }], { maxTokens: 8, signal });
}
