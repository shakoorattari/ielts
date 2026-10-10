import { useState } from 'react';
import { applyUpdate, usePwa } from '../lib/pwa';

/** "A new version is ready": the service worker has a newer build waiting, and reloading switches to it. */
export function UpdateNotice() {
  const { updateReady } = usePwa();
  const [later, setLater] = useState(false);

  return (
    <div role="status">
      {updateReady && !later && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-lg animate-pop print:hidden">
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">A new version is ready.</span>{' '}
            <span className="text-ink-soft">Reload to update. Your progress is kept.</span>
          </p>
          <button
            onClick={applyUpdate}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-on-brand hover:bg-brand-600"
          >
            Reload
          </button>
          <button onClick={() => setLater(true)} className="rounded-lg px-2 py-1.5 text-sm text-ink-soft hover:bg-brand-50">
            Later
          </button>
        </div>
      )}
    </div>
  );
}
