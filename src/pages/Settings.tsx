import { useRef, useState } from 'react';
import { useProgress } from '../lib/progressContext';
import { ALL_ITEMS } from '../lib/collocations';

export function Settings() {
  const { exportJSON, importJSON, resetProgress, statusCounts, state } = useProgress();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 animate-pop">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {statusCounts.mastered} of {ALL_ITEMS.length} mastered · {state.totalReviews} reviews logged. Everything is
          stored locally in this browser.
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

      <section className="rounded-2xl border border-rose-500/40 bg-rose-100 p-5">
        <h2 className="font-semibold text-rose-500">Danger zone</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Reset wipes every collocation's mastery status, streak history, and writing notes. Export first if you want
          a backup.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="mt-4 rounded-lg border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-500 hover:text-white"
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
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
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
