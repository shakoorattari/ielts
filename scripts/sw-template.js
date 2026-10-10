// IELTS Band Builder service worker: the template. scripts/generate-sw.mjs runs after `vite build`, replaces the BUILD
// block below with the real file list and a version, and writes the result to dist/sw.js. Edit this file, not dist/sw.js.
//
//  - Install:  downloads every file the app is built from (including the lazily loaded essay and synonym chunks) into
//              a cache named after the build, so the whole app works offline from the first visit.
//  - Fetch:    serves those files cache-first. Anything else (the PDF download, YouTube, the GitHub and AI APIs) is left
//              alone and goes straight to the network.
//  - Update:   a new build installs in the background and then WAITS. The page offers "A new version is ready", and only
//              when the person accepts does it send SKIP_WAITING. Taking over unprompted could swap files out from under
//              a page that is still running the old build and has lazy chunks left to load.

const BUILD = /*BUILD*/ { version: 'dev', precache: [] } /*END*/;

const CACHE_PREFIX = 'ielts-precache-';
const CACHE = CACHE_PREFIX + BUILD.version;
// The worker sits at the root of the app, so its scope is the app's own directory ("/ielts/" in production).
const SCOPE = self.registration.scope;
const SCOPE_PATH = new URL(SCOPE).pathname;
const absolute = (path) => new URL(path, SCOPE).href;
const SHELL = absolute('index.html');
const PRECACHED = new Set(BUILD.precache.map((entry) => absolute(entry.url)));

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

async function precache() {
  const cache = await caches.open(CACHE);
  const older = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE);
  await Promise.all(
    BUILD.precache.map(async ({ url, immutable }) => {
      const href = absolute(url);
      if (await cache.match(href)) return; // an install that was retried picks up where it stopped
      if (immutable) {
        // Content-hashed files never change under the same name, so reuse them from the previous build.
        for (const name of older) {
          const hit = await (await caches.open(name)).match(href);
          if (hit) return cache.put(href, hit);
        }
      }
      // `reload` skips the HTTP cache: GitHub Pages sends max-age=600, which could otherwise hand us a stale file.
      const response = await fetch(href, { cache: 'reload' });
      if (!response.ok) throw new Error(`Could not precache ${url} (${response.status})`);
      await cache.put(href, response);
    }),
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(CACHE_PREFIX) && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // The app is one page with hash routes, so a visit to its address (whatever the query string) is the cached shell.
    // Other paths fall through to the network, so a mistyped address still gets the real 404 page.
    if (url.pathname === SCOPE_PATH || url.pathname === SCOPE_PATH + 'index.html') {
      event.respondWith(fromCache(SHELL, request));
    }
    return;
  }

  const key = url.origin + url.pathname;
  if (PRECACHED.has(key)) event.respondWith(fromCache(key, request));
});

function fromCache(key, request) {
  return caches.match(key, { cacheName: CACHE }).then((hit) => hit || fetch(request));
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
