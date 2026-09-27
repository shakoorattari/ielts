import type { ProgressState } from '../types';

const CONFIG_KEY = 'ielts-collocations-sync-config';
const GIST_FILENAME = 'ielts-collocations-progress.json';
const API_BASE = 'https://api.github.com';

export interface SyncConfig {
  token: string;
  gistId: string;
  lastSyncedAt: number | null;
}

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    if (!parsed.token || !parsed.gistId) return null;
    return { token: parsed.token, gistId: parsed.gistId, lastSyncedAt: parsed.lastSyncedAt ?? null };
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function clearSyncConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    // ignore
  }
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function parseErrorMessage(res: Response): Promise<string> {
  if (res.status === 401) return 'That token was rejected — check it was copied correctly and has not expired.';
  if (res.status === 404) return 'Gist not found — check the sync ID, or create a new one.';
  if (res.status === 403) return "Token doesn't have permission — it needs the classic 'gist' scope.";
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Creates a new private gist holding the given progress state. Returns the new gist's id. */
export async function createGist(token: string, state: ProgressState): Promise<Result<string>> {
  try {
    const res = await fetch(`${API_BASE}/gists`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'IELTS Collocations — synced practice progress',
        public: false,
        files: { [GIST_FILENAME]: { content: JSON.stringify(state, null, 2) } },
      }),
    });
    if (!res.ok) return { ok: false, error: await parseErrorMessage(res) };
    const data = (await res.json()) as { id: string };
    return { ok: true, data: data.id };
  } catch {
    return { ok: false, error: 'Network error reaching GitHub — check your connection.' };
  }
}

export async function fetchGistState(token: string, gistId: string): Promise<Result<ProgressState | null>> {
  try {
    const res = await fetch(`${API_BASE}/gists/${gistId}`, { headers: authHeaders(token) });
    if (!res.ok) return { ok: false, error: await parseErrorMessage(res) };
    const data = (await res.json()) as { files: Record<string, { content?: string }> };
    const file = data.files[GIST_FILENAME];
    if (!file?.content) return { ok: true, data: null };
    return { ok: true, data: JSON.parse(file.content) as ProgressState };
  } catch {
    return { ok: false, error: 'Network error reaching GitHub — check your connection.' };
  }
}

export async function updateGistState(token: string, gistId: string, state: ProgressState): Promise<Result<void>> {
  try {
    const res = await fetch(`${API_BASE}/gists/${gistId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(state, null, 2) } } }),
    });
    if (!res.ok) return { ok: false, error: await parseErrorMessage(res) };
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: 'Network error reaching GitHub — check your connection.' };
  }
}
