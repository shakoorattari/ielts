// Writes dist/sw.js after `vite build` (wired as part of the npm `postbuild` hook, after the sitemap).
//
// scripts/sw-template.js is the service worker; this fills in the list of files to precache and a version. The
// version is a hash of every file's content plus the template, so ANY change to the built app changes sw.js,
// which is how browsers notice there is something new to install. Without it the worker would never update.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(dist + 'index.html')) {
  console.error('dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

// In dist but not part of the offline app: the worker itself, crawler/social files, the 1.8 MB PDF (an optional
// download that would triple what a first visit has to fetch), and the images only an installer looks at (iOS reads
// the launch images once, when the app is added to the home screen; the browser fetches the screenshots when it
// shows its install dialog). A new folder of such files belongs in SKIP_DIRS.
const SKIP = new Set(['sw.js', 'sitemap.xml', '404.html', 'og-image.jpg']);
const SKIP_DIRS = ['splash/', 'screenshots/'];
const skipped = (path) =>
  SKIP.has(path) ||
  SKIP_DIRS.some((dir) => path.startsWith(dir)) ||
  /\.(pdf|map)$/.test(path) ||
  path.split('/').some((part) => part.startsWith('.'));

function list(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const path = prefix + name;
    return statSync(dir + name).isDirectory() ? list(dir + name + '/', path + '/') : [path];
  });
}

const sha = (data) => createHash('sha256').update(data).digest('hex');
const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
const files = list(dist)
  .filter((path) => !skipped(path))
  .sort();
const hashes = files.map((path) => sha(readFileSync(dist + path)));
const version = sha(template + files.map((path, i) => `${path}:${hashes[i]}`).join('\n')).slice(0, 12);
const precache = files.map((url) => ({ url, immutable: url.startsWith('assets/') })); // Vite content-hashes assets/*

const marker = /\/\*BUILD\*\/[\s\S]*?\/\*END\*\//;
if (!marker.test(template)) throw new Error('scripts/sw-template.js lost its /*BUILD*/ … /*END*/ block');
// The markers stay in the output so scripts/check-pwa.mjs can read the list back.
writeFileSync(dist + 'sw.js', template.replace(marker, () => `/*BUILD*/ ${JSON.stringify({ version, precache })} /*END*/`));

const bytes = files.reduce((n, path) => n + statSync(dist + path).size, 0);
console.log(`sw.js: ${files.length} files (${(bytes / 1024).toFixed(0)} KB) precached, version ${version}`);
