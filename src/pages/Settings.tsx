import { useRef, useState } from 'react';
import { useProgress } from '../lib/progressContext';
import { useCloudSync } from '../lib/cloudSyncContext';
import { ALL_ITEMS } from '../lib/collocations';

function formatSyncTime(ms: number | null): string {
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleString();
}

export function Settings() {
  const { exportJSON, importJSON, resetProgress, statusCounts, state } = useProgress();
  const sync = useCloudSync();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [tokenInput, setTokenInput] = useState('');
  const [gistIdInput, setGistIdInput] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  function download() {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ielts-collocations-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importJSON(String(reader.result));
        setMessage('Progress imported successfully.');
      } catch {
        setMessage('That file could not be read as a progress export.');
      }
    };
    reader.readAsText(file);
  }

  async function handleConnect() {
    if (!tokenInput.trim()) return;
    const ok =
      mode === 'new'
        ? await sync.connectNew(tokenInput.trim())
        : await sync.connectExisting(tokenInput.trim(), gistIdInput.trim());
    if (ok) {
      setTokenInput('');
      setGistIdInput('');
    }
  }

  async function copyGistId() {
    if (!sync.gistId) return;
    try {
      await navigator.clipboard.writeText(sync.gistId);
      setMessage('Sync ID copied — paste it into Settings on your other device.');
    } catch {
      setMessage(`Sync ID: ${sync.gistId}`);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 animate-pop">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {statusCounts.mastered} of {ALL_ITEMS.length} mastered · {state.totalReviews} reviews logged ·{' '}
          {state.attempts.length} practice rounds completed. Everything is stored locally in this browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={download}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-brand-50"
          >
            Export progress (.json)
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-brand-50"
          >
            Import progress
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
        </div>
        {message && <p className="mt-2 text-sm text-brand-600">{message}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">Sync across devices</h2>

        {sync.connected ? (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              {sync.status === 'syncing'
                ? 'Syncing…'
                : sync.status === 'error'
                  ? `Sync error: ${sync.error}`
                  : `Last synced ${formatSyncTime(sync.lastSyncedAt)}.`}{' '}
              Progress auto-syncs to a private GitHub Gist a few seconds after each change.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
              <span className="text-xs text-ink-soft">Sync ID</span>
              <code className="flex-1 truncate text-sm">{sync.gistId}</code>
              <button onClick={copyGistId} className="text-xs font-semibold text-brand-500 hover:underline">
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              On your other device, open Settings → Sync across devices → "Join existing", then paste your token and
              this Sync ID.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => sync.syncNow()}
                disabled={sync.status === 'syncing'}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-brand-50 disabled:opacity-40"
              >
                Sync now
              </button>
              {!confirmDisconnect ? (
                <button
                  onClick={() => setConfirmDisconnect(true)}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-rose-ink hover:bg-rose-100"
                >
                  Disconnect this device
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      sync.disconnect();
                      setConfirmDisconnect(false);
                    }}
                    className="rounded-lg bg-[#c13a4d] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Yes, disconnect
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              Link this device to a private GitHub Gist so your mastery, streak, and attempts history stay in sync
              between your desktop and phone. Requires a GitHub{' '}
              <span className="font-medium text-ink">classic</span> personal access token with only the{' '}
              <code className="rounded bg-canvas px-1 py-0.5 text-xs">gist</code> scope checked — create one at{' '}
              <span className="font-medium text-ink">github.com/settings/tokens</span>. The token is stored only in
              this browser and never leaves it except to talk to GitHub's API.
            </p>

            <div className="mt-4 flex gap-2 text-sm">
              <button
                onClick={() => setMode('new')}
                className={`rounded-full px-3 py-1 font-medium ${mode === 'new' ? 'bg-brand-500 text-on-brand' : 'border border-line'}`}
              >
                Set up new sync
              </button>
              <button
                onClick={() => setMode('existing')}
                className={`rounded-full px-3 py-1 font-medium ${mode === 'existing' ? 'bg-brand-500 text-on-brand' : 'border border-line'}`}
              >
                Join existing
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="GitHub personal access token (gist scope)"
                className="rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              {mode === 'existing' && (
                <input
                  value={gistIdInput}
                  onChange={(e) => setGistIdInput(e.target.value)}
                  placeholder="Sync ID from your other device"
                  className="rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              )}
              <button
                onClick={handleConnect}
                disabled={sync.status === 'syncing' || !tokenInput.trim() || (mode === 'existing' && !gistIdInput.trim())}
                className="rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sync.status === 'syncing' ? 'Connecting…' : 'Enable sync'}
              </button>
              {sync.status === 'error' && <p className="text-sm text-rose-ink">{sync.error}</p>}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-rose-500/40 bg-rose-100 p-5">
        <h2 className="font-semibold text-rose-ink">Danger zone</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Reset wipes every collocation's mastery status, streak history, and writing notes. Export first if you want
          a backup.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="mt-4 rounded-lg border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-ink hover:bg-[#c13a4d] hover:text-white"
          >
            Reset all progress
          </button>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                resetProgress();
                setConfirmReset(false);
                setMessage('Progress reset.');
              }}
              className="rounded-lg bg-[#c13a4d] px-4 py-2 text-sm font-semibold text-white"
            >
              Yes, reset everything
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
