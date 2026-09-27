import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useProgress } from './progressContext';
import {
  clearSyncConfig,
  createGist,
  fetchGistState,
  loadSyncConfig,
  saveSyncConfig,
  updateGistState,
} from './gistSync';
import type { SyncConfig } from './gistSync';
import { mergeProgressStates } from './mergeProgress';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface CloudSyncValue {
  connected: boolean;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  gistId: string | null;
  connectNew: (token: string) => Promise<boolean>;
  connectExisting: (token: string, gistId: string) => Promise<boolean>;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

const PUSH_DEBOUNCE_MS = 4000;

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { state, applySyncedState } = useProgress();
  const [config, setConfig] = useState<SyncConfig | null>(() => loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(config?.lastSyncedAt ?? null);

  const pulledForGistRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistMeta = useCallback((next: SyncConfig) => {
    setConfig(next);
    saveSyncConfig(next);
    setLastSyncedAt(next.lastSyncedAt);
  }, []);

  // Initial pull + merge whenever a gist connection becomes active.
  useEffect(() => {
    if (!config) return;
    if (pulledForGistRef.current === config.gistId) return;
    pulledForGistRef.current = config.gistId;
    const { token, gistId } = config;

    let cancelled = false;
    (async () => {
      setStatus('syncing');
      setError(null);
      const remote = await fetchGistState(token, gistId);
      if (cancelled) return;
      if (!remote.ok) {
        setStatus('error');
        setError(remote.error);
        return;
      }
      const merged = remote.data ? mergeProgressStates(stateRef.current, remote.data) : stateRef.current;
      applySyncedState(merged);
      const pushResult = await updateGistState(token, gistId, merged);
      if (cancelled) return;
      if (!pushResult.ok) {
        setStatus('error');
        setError(pushResult.error);
        return;
      }
      persistMeta({ token, gistId, lastSyncedAt: Date.now() });
      setStatus('idle');
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.gistId, config?.token]);

  // Debounced auto-push whenever local state changes, once the initial pull has settled.
  useEffect(() => {
    if (!config) return;
    if (pulledForGistRef.current !== config.gistId) return;
    const { token, gistId } = config;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      setStatus('syncing');
      const res = await updateGistState(token, gistId, state);
      if (res.ok) {
        persistMeta({ token, gistId, lastSyncedAt: Date.now() });
        setStatus('idle');
      } else {
        setStatus('error');
        setError(res.error);
      }
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(pushTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const connectNew = useCallback(
    async (token: string) => {
      setStatus('syncing');
      setError(null);
      const res = await createGist(token, stateRef.current);
      if (!res.ok) {
        setStatus('error');
        setError(res.error);
        return false;
      }
      pulledForGistRef.current = res.data;
      persistMeta({ token, gistId: res.data, lastSyncedAt: Date.now() });
      setStatus('idle');
      return true;
    },
    [persistMeta],
  );

  const connectExisting = useCallback(
    async (token: string, gistId: string) => {
      setStatus('syncing');
      setError(null);
      const remote = await fetchGistState(token, gistId);
      if (!remote.ok) {
        setStatus('error');
        setError(remote.error);
        return false;
      }
      const merged = remote.data ? mergeProgressStates(stateRef.current, remote.data) : stateRef.current;
      applySyncedState(merged);
      const push = await updateGistState(token, gistId, merged);
      if (!push.ok) {
        setStatus('error');
        setError(push.error);
        return false;
      }
      pulledForGistRef.current = gistId;
      persistMeta({ token, gistId, lastSyncedAt: Date.now() });
      setStatus('idle');
      return true;
    },
    [applySyncedState, persistMeta],
  );

  const disconnect = useCallback(() => {
    clearSyncConfig();
    pulledForGistRef.current = null;
    setConfig(null);
    setStatus('idle');
    setError(null);
    setLastSyncedAt(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (!config) return;
    const { token, gistId } = config;
    setStatus('syncing');
    setError(null);
    const remote = await fetchGistState(token, gistId);
    if (!remote.ok) {
      setStatus('error');
      setError(remote.error);
      return;
    }
    const merged = remote.data ? mergeProgressStates(stateRef.current, remote.data) : stateRef.current;
    applySyncedState(merged);
    const push = await updateGistState(token, gistId, merged);
    if (!push.ok) {
      setStatus('error');
      setError(push.error);
      return;
    }
    persistMeta({ token, gistId, lastSyncedAt: Date.now() });
    setStatus('idle');
  }, [config, applySyncedState, persistMeta]);

  const value: CloudSyncValue = {
    connected: !!config,
    status,
    error,
    lastSyncedAt,
    gistId: config?.gistId ?? null,
    connectNew,
    connectExisting,
    disconnect,
    syncNow,
  };

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncValue {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) throw new Error('useCloudSync must be used within CloudSyncProvider');
  return ctx;
}
