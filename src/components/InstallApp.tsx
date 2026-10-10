import { Link } from 'react-router-dom';
import { dismissInstallNudge, useInstall } from '../lib/pwa';

/** The full "Install the app" section for Settings: one button where the browser allows it, steps where it doesn't. */
export function InstallCard() {
  const { kind, install } = useInstall();

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="font-semibold">Install the app</h2>

      {kind === 'installed' && (
        <p className="mt-1 text-sm text-ink-soft">
          ✓ You’re using the installed app. It opens full-screen from your home screen, and everything except the
          optional AI coach and sync keeps working without a connection.
        </p>
      )}

      {kind === 'prompt' && (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Add IELTS Band Builder to your home screen or desktop. It opens in its own window, loads instantly, and
            everything except the optional AI coach and sync works without a connection.
          </p>
          <button
            onClick={install}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-600"
          >
            Install app
          </button>
        </>
      )}

      {kind === 'ios' && (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Add IELTS Band Builder to your home screen. It opens full-screen, loads instantly, and everything except the
            optional AI coach and sync works without a connection.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>
              In Safari (or Chrome, on iOS 16.4 or later), tap the <strong>Share</strong> button: the square with an
              arrow pointing up. On newer versions it can be under the <strong>⋯</strong> menu.
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong>.
            </li>
          </ol>
          <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-ink">
            <strong>Your progress won’t carry over automatically.</strong> On iPhone and iPad the home-screen app keeps
            its own storage, separate from Safari, so it starts empty. Before you install, export your progress above or
            turn on sync below, then import it (or join sync) inside the installed app.
          </p>
        </>
      )}

      {kind === 'manual' && (
        <p className="mt-1 text-sm text-ink-soft">
          Your browser can install this as an app. In Chrome or Edge, choose <strong>Install app</strong> from the menu
          or the install icon in the address bar. In Firefox or Samsung Internet on Android, choose{' '}
          <strong>Install</strong> or <strong>Add to Home screen</strong>. It then opens in its own window and works
          without a connection, apart from the optional AI coach and sync.
        </p>
      )}
    </section>
  );
}

/** A dismissible dashboard card. Only shown where one tap (or the short iOS steps in Settings) installs the app. */
export function InstallNudge() {
  const { kind, install, nudgeDismissed } = useInstall();
  if (nudgeDismissed || (kind !== 'prompt' && kind !== 'ios')) return null;

  return (
    <section
      aria-label="Install the app"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-4"
    >
      <span className="text-2xl" aria-hidden>
        📲
      </span>
      <p className="min-w-0 flex-1 basis-56 text-sm">
        <span className="font-semibold">Install IELTS Band Builder.</span>{' '}
        <span className="text-ink-soft">Open it from your home screen, full-screen and without a connection.</span>
      </p>
      <div className="ml-auto flex items-center gap-1">
        {kind === 'prompt' ? (
          <button
            onClick={install}
            className="rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-on-brand hover:bg-brand-600"
          >
            Install
          </button>
        ) : (
          <Link
            to="/settings"
            className="rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-on-brand hover:bg-brand-600"
          >
            How to install
          </Link>
        )}
        <button
          onClick={dismissInstallNudge}
          aria-label="Dismiss"
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-brand-100 hover:text-ink"
        >
          ✕
        </button>
      </div>
    </section>
  );
}
