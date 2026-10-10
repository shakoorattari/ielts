// Captures the install-dialog screenshots (public/screenshots/*.png) from the real, built app. Run by hand when the
// UI changes enough to show: `npm run build && npm run generate:screenshots`, then commit the images.
//
// Chrome on Android and on desktop shows these in a richer "Install" dialog when the manifest lists them with a
// form_factor (public/manifest.webmanifest). They are real pages from dist/, so they show exactly what a first-time
// visitor sees: no saved progress, the Light theme (pinned through the app's own theme setting, because Chrome's
// colour-scheme emulation does not reach the stylesheet's media rules).
//
// Chrome is driven over the DevTools protocol on a pipe (no WebSocket library needed) rather than with
// `--screenshot --window-size`, because desktop Chrome will not make a window narrower than about 500 px: a
// 390 px phone screenshot comes out as a cropped 500 px layout. Device emulation gives a true 390 px viewport.
//
// Needs Google Chrome (or Chromium, or Edge). Set CHROME_BIN if it is somewhere unusual.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const outDir = fileURLToPath(new URL('../public/screenshots/', import.meta.url));
if (!existsSync(dist + 'index.html')) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const CHROME = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((path) => path && existsSync(path));
if (!CHROME) {
  console.error('No Chrome found. Install Google Chrome or set CHROME_BIN to a Chrome/Chromium binary.');
  process.exit(1);
}

// Chrome wants 320–3840 px on each side, an aspect ratio of at most 2.3, and one size per form factor.
const NARROW = { width: 390, height: 844, scale: 2, mobile: true }; // a phone: 780×1688
const WIDE = { width: 1280, height: 800, scale: 1, mobile: false }; // a laptop
const SHOTS = [
  { file: 'narrow-dashboard.png', route: '#/', ...NARROW },
  { file: 'narrow-flashcards.png', route: '#/flashcards', ...NARROW },
  { file: 'narrow-essay.png', route: '#/essays/1', ...NARROW },
  { file: 'narrow-synonyms.png', route: '#/synonyms', ...NARROW },
  { file: 'wide-dashboard.png', route: '#/', ...WIDE },
  { file: 'wide-essay.png', route: '#/essays/1', ...WIDE },
];

// ---- A static server for dist/ ---------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(dist, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

// ---- Chrome over a pipe ----------------------------------------------------------------------------------------
const profile = mkdtempSync(join(tmpdir(), 'ielts-shots-')); // a throwaway profile: no saved progress, no worker
const chrome = spawn(
  CHROME,
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-pipe', `--user-data-dir=${profile}`],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] }, // fd 3: commands to Chrome, fd 4: its replies
);
const [toChrome, fromChrome] = [chrome.stdio[3], chrome.stdio[4]];
const pending = new Map();
let nextId = 1;
let buffered = '';
fromChrome.setEncoding('utf8');
fromChrome.on('data', (text) => {
  buffered += text;
  for (let end; (end = buffered.indexOf('\0')) >= 0; ) {
    const message = JSON.parse(buffered.slice(0, end));
    buffered = buffered.slice(end + 1);
    if (message.id) pending.get(message.id)?.(message);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 30_000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      pending.delete(id);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    });
    toChrome.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture({ file, route, width, height, scale, mobile }) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Page.enable');
  await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  // Pin the Light theme so the shots don't depend on this machine being in light or dark mode, and dismiss the install
  // card (Chrome may well offer to install the app in this profile, which would put the card in the dashboard shot).
  await page('Page.addScriptToEvaluateOnNewDocument', {
    source: "try { localStorage.setItem('ielts-theme', 'light'); localStorage.setItem('ielts-install-nudge-dismissed', String(Date.now())); } catch {}",
  });
  await page('Page.navigate', { url: base + route });

  // Wait for React to replace the static shell (only the app has a <header>) and for lazy routes to finish loading.
  const ready = "!!document.querySelector('header') && !document.body.innerText.includes('Loading…')";
  for (let tries = 0; ; tries++) {
    const { result } = await page('Runtime.evaluate', { expression: ready, returnByValue: true });
    if (result.value) break;
    if (tries > 60) throw new Error(`${route} never finished rendering`);
    await sleep(250);
  }
  // Check the page really rendered light: a dark screenshot labelled "light" would otherwise slip through unnoticed.
  const { result: bg } = await page('Runtime.evaluate', { expression: 'getComputedStyle(document.body).backgroundColor', returnByValue: true });
  if (bg.value !== 'rgb(247, 246, 243)') throw new Error(`${route} rendered with background ${bg.value}, expected the Light theme's rgb(247, 246, 243)`);
  await page('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await sleep(600); // entry animations
  const { data } = await page('Page.captureScreenshot', { format: 'png' });
  writeFileSync(outDir + file, Buffer.from(data, 'base64'));
  await send('Target.closeTarget', { targetId });
  console.log(`public/screenshots/${file}: ${width * scale}×${height * scale} (${route})`);
}

mkdirSync(outDir, { recursive: true });
try {
  for (const shot of SHOTS) await capture(shot);
} finally {
  await new Promise((resolve) => {
    chrome.once('exit', resolve);
    chrome.kill();
  }); // Chrome is still writing to the profile until it has exited
  server.close();
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
