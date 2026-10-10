import { useSyncExternalStore } from 'react';

/** Fired by Chrome, Edge and Samsung Internet once the app is installable. Not in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** The browser's deferred install prompt. Null until it offers one, and after it has been used. */
  installPrompt: BeforeInstallPromptEvent | null;
  /** Running as an installed app (its own window), or installed during this visit. */
  installed: boolean;
  /** The dashboard's "install the app" card was dismissed recently. */
  nudgeDismissed: boolean;
  /** A newer build has downloaded and is waiting for the person to reload into it. */
  updateReady: boolean;
}

const NUDGE_KEY = 'ielts-install-nudge-dismissed';
const NUDGE_QUIET_MS = 30 * 86_400_000;
const UPDATE_CHECK_MS = 30 * 60_000;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari's own flag, which predates the display-mode media query
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function nudgeDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(NUDGE_KEY));
    return at > 0 && Date.now() - at < NUDGE_QUIET_MS;
  } catch {
    return false;
  }
}

let state: PwaState = {
  installPrompt: null,
  installed: isStandalone(),
  nudgeDismissed: nudgeDismissedRecently(),
  updateReady: false,
};
const listeners = new Set<() => void>();

function update(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// ---- Installing ------------------------------------------------------------------------------------------------

/** iPhone and iPad. iPadOS 13+ reports itself as a Mac, but a Mac has no touch screen. */
function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/**
 * How this device can install the app:
 *  - installed: already running as the app
 *  - prompt:    the browser handed us an install prompt, so one button does it (Android, desktop Chrome and Edge)
 *  - ios:       Safari has no prompt; the person has to use Share → Add to Home Screen
 *  - manual:    anything else; point at the browser's own menu
 */
export type InstallKind = 'installed' | 'prompt' | 'ios' | 'manual';

export function useInstall(): { kind: InstallKind; install: () => Promise<void>; nudgeDismissed: boolean } {
  const { installPrompt, installed, nudgeDismissed } = usePwa();
  const kind: InstallKind = installed ? 'installed' : installPrompt ? 'prompt' : isIos() ? 'ios' : 'manual';
  return { kind, install, nudgeDismissed };
}

async function install() {
  const prompt = state.installPrompt;
  if (!prompt) return;
  await prompt.prompt();
  await prompt.userChoice;
  // A deferred prompt works once. If it was accepted, `appinstalled` follows; if not, the browser may offer a new one.
  update({ installPrompt: null });
}

export function dismissInstallNudge() {
  try {
    localStorage.setItem(NUDGE_KEY, String(Date.now()));
  } catch {
    // ignore: it will simply show again next visit
  }
  update({ nudgeDismissed: true });
}

// ---- Updating --------------------------------------------------------------------------------------------------

let waiting: ServiceWorker | null = null;

/** Ask the waiting build to take over. The page reloads itself when it has (see `controllerchange` below). */
export function applyUpdate() {
  waiting?.postMessage({ type: 'SKIP_WAITING' });
}

function watchForUpdates(registration: ServiceWorkerRegistration) {
  const offerWaitingBuild = () => {
    // With no controller this is the very first install, which activates on its own: nothing to ask about.
    if (registration.waiting && navigator.serviceWorker.controller) {
      waiting = registration.waiting;
      update({ updateReady: true });
    }
  };
  offerWaitingBuild();
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') offerWaitingBuild();
    });
  });

  // Browsers re-check the worker when the page is opened, but an installed app can sit in the background for days.
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_MS) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // offline: try again next time
    });
  });
}

function registerServiceWorker() {
  // Dev builds are never cached: a worker would serve stale modules and fight hot reloading.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const container = navigator.serviceWorker;

  let hadController = container.controller !== null;
  container.addEventListener('controllerchange', () => {
    // The first install claims the page that registered it. That is not an update, so don't reload.
    if (!hadController) {
      hadController = true;
      return;
    }
    // A new build took over (here or in another tab). Reload so the page and its lazy chunks come from one build.
    window.location.reload();
  });

  const register = () => {
    container
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then(watchForUpdates)
      .catch(() => {
        // The app works without a worker (just not offline); nothing to tell the person.
      });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}

// ---- Start-up --------------------------------------------------------------------------------------------------

export function initPwa() {
  // `beforeinstallprompt` can fire before React has mounted, so listen from the start and keep the event.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // hold the browser's own mini-infobar back; the app offers its own button
    update({ installPrompt: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => update({ installPrompt: null, installed: true }));

  // Ask the browser not to evict the progress stored here. Only as an installed app, where people expect it:
  // Firefox shows a permission prompt for this, which would be odd in a plain tab.
  if (state.installed) navigator.storage?.persist?.().catch(() => {});

  registerServiceWorker();
}
