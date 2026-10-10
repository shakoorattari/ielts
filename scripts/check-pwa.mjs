// Post-build PWA guard. Run after `npm run build`: `npm run check:pwa`.
//
// An app is only installable if the manifest, its icons, the head tags and the service worker all line up, and
// every one of them can break silently (a renamed icon, a new lazy chunk that never reaches the precache list, a
// manifest id that drifts from the canonical URL). Chrome just stops offering "Install" and says nothing.
// This checks the built files, the same way scripts/check-seo.mjs checks the SEO ones.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};
const read = (name) => readFileSync(distDir + name, 'utf8');

for (const required of ['index.html', 'manifest.webmanifest', 'sw.js']) {
  if (!existsSync(distDir + required)) {
    console.error(`dist/${required} not found. Run \`npm run build\` first.`);
    process.exit(1);
  }
}
const html = read('index.html');
const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
const origin = canonical ? new URL(canonical) : null;
const pngSize = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });
const isPng = (buf) => buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

// ---- Head tags -------------------------------------------------------------------------------------------------
check(/<link\s+rel="manifest"\s+href="\.\/manifest\.webmanifest"/.test(html), 'index.html must link ./manifest.webmanifest');
const metaContent = (name) => html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`))?.[1];
check(metaContent('apple-mobile-web-app-capable') === 'yes', 'missing <meta name="apple-mobile-web-app-capable" content="yes"> (iOS)');
check(metaContent('mobile-web-app-capable') === 'yes', 'missing <meta name="mobile-web-app-capable" content="yes"> (Android)');
check(Boolean(metaContent('apple-mobile-web-app-title')), 'missing apple-mobile-web-app-title (iOS would label the icon with the full page title)');
check(metaContent('apple-mobile-web-app-title')?.length <= 13, 'apple-mobile-web-app-title is over 13 characters; iOS truncates it under the icon');
check(
  ['default', 'black', 'black-translucent'].includes(metaContent('apple-mobile-web-app-status-bar-style')),
  'missing or invalid apple-mobile-web-app-status-bar-style',
);
check(/<meta\s+name="theme-color"/.test(html), 'missing <meta name="theme-color">');
check(/<meta\s+name="viewport"[^>]*width=device-width/.test(html), 'viewport must be width=device-width');

// ---- iOS launch images -----------------------------------------------------------------------------------------
// iOS shows a blank screen at launch unless a launch image matches the device's pixel size EXACTLY, so each
// <link> is checked against the real file: a wrong size silently falls back to blank.
const splashLinks = [...html.matchAll(/<link\s+rel="apple-touch-startup-image"\s+media="([^"]+)"\s+href="([^"]+)"/g)].map(([, media, href]) => ({ media, href }));
check(splashLinks.length >= 20, `index.html needs the iOS launch images (found ${splashLinks.length}); run \`npm run generate:splash\``);
const seenMedia = new Set();
for (const { media, href } of splashLinks) {
  const m = media.match(/^screen and \(device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\) and \(orientation: (portrait|landscape)\)$/);
  if (!m) {
    check(false, `launch image media query is not in the form iOS matches: ${media}`);
    continue;
  }
  const [, w, h, dpr, orientation] = m;
  check(!seenMedia.has(media), `two launch images share the media query ${media}`);
  seenMedia.add(media);
  const file = distDir + href.replace(/^\.\//, '');
  if (!existsSync(file)) {
    check(false, `launch image ${href} is not in dist`);
    continue;
  }
  const buf = readFileSync(file);
  // device-width and device-height stay in portrait terms; only the image itself turns on its side
  const wantW = (orientation === 'landscape' ? h : w) * dpr;
  const wantH = (orientation === 'landscape' ? w : h) * dpr;
  check(isPng(buf), `launch image ${href} is not a PNG`);
  if (isPng(buf)) {
    const size = pngSize(buf);
    check(size.width === wantW && size.height === wantH, `launch image ${href} is ${size.width}×${size.height} but its media query needs ${wantW}×${wantH}`);
  }
}
const splashFiles = existsSync(distDir + 'splash') ? readdirSync(distDir + 'splash').filter((n) => n.endsWith('.png')) : [];
for (const name of splashFiles) check(splashLinks.some((l) => l.href === `./splash/${name}`), `splash/${name} is in dist but no <link> uses it; run \`npm run generate:splash\``);

// ---- Manifest --------------------------------------------------------------------------------------------------
let manifest = {};
try {
  manifest = JSON.parse(read('manifest.webmanifest'));
} catch (e) {
  check(false, `manifest.webmanifest does not parse: ${e.message}`);
}
const manifestUrl = new URL('manifest.webmanifest', canonical ?? 'https://example.test/');
const inScope = (url) => new URL(url, manifestUrl).href.startsWith(new URL(manifest.scope ?? '.', manifestUrl).href);
const distPathOf = (url) => {
  const u = new URL(url, manifestUrl);
  return decodeURIComponent(u.pathname.slice(new URL('./', manifestUrl).pathname.length));
};

check(manifest.name && manifest.name.length <= 45, 'manifest needs a name of at most 45 characters');
check(manifest.short_name && manifest.short_name.length <= 13, 'manifest needs a short_name of at most 13 characters (home screens truncate it)');
check(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display), 'manifest display must be standalone, fullscreen or minimal-ui to be installable');
check(manifest.start_url, 'manifest needs a start_url');
check(manifest.scope, 'manifest needs a scope');
check(manifest.start_url && manifest.scope && inScope(manifest.start_url), 'manifest start_url must be inside its scope');
for (const key of ['background_color', 'theme_color']) {
  check(/^#[0-9a-f]{6}$/i.test(manifest[key] ?? ''), `manifest ${key} must be a #rrggbb colour`);
}
// The id is the app's identity: change it and every installed copy becomes a different app. It has to stay
// aligned with where the app really lives, which is what the canonical URL says.
if (origin) {
  check(manifest.id === origin.pathname, `manifest id must equal the canonical path ${origin.pathname} (is ${manifest.id})`);
  check(new URL(manifest.scope ?? '.', manifestUrl).href === canonical, 'manifest scope must resolve to the app directory (the canonical URL)');
}

const icons = manifest.icons ?? [];
const sizeOf = (icon) => icon.sizes?.split(' ').map((s) => Number(s.split('x')[0]));
const hasIcon = (purpose, size) => icons.some((i) => (i.purpose ?? 'any').split(' ').includes(purpose) && sizeOf(i)?.includes(size));
check(hasIcon('any', 192), 'manifest needs a 192×192 icon with purpose "any"');
check(hasIcon('any', 512), 'manifest needs a 512×512 icon with purpose "any"');
check(hasIcon('maskable', 512), 'manifest needs a 512×512 icon with purpose "maskable" (Android adaptive icons)');
for (const icon of icons) {
  const file = icon.src && distDir + distPathOf(icon.src);
  if (!file || !existsSync(file)) {
    check(false, `manifest icon ${icon.src} is not in dist`);
    continue;
  }
  const buf = readFileSync(file);
  const declared = sizeOf(icon)?.[0];
  check(icon.type === 'image/png' && isPng(buf), `manifest icon ${icon.src} should be a PNG declared as image/png`);
  if (isPng(buf)) {
    const { width, height } = pngSize(buf);
    check(width === declared && height === declared, `manifest icon ${icon.src} says ${icon.sizes} but is ${width}×${height}`);
  }
}
for (const shortcut of manifest.shortcuts ?? []) {
  check(shortcut.name && shortcut.url, 'every manifest shortcut needs a name and a url');
  check(shortcut.url && inScope(shortcut.url), `manifest shortcut ${shortcut.url} is outside the scope`);
  for (const icon of shortcut.icons ?? []) check(existsSync(distDir + distPathOf(icon.src)), `shortcut icon ${icon.src} is not in dist`);
}
check((manifest.shortcuts ?? []).length <= 4, 'more than 4 manifest shortcuts: Android shows only the first few');

// Screenshots switch on Chrome's richer install dialog. Chrome ignores any that break its rules, so check them here.
const screenshots = manifest.screenshots ?? [];
for (const factor of ['narrow', 'wide']) {
  const group = screenshots.filter((s) => s.form_factor === factor);
  check(group.length >= 1, `manifest needs at least one "${factor}" screenshot (Android shows narrow, desktop shows wide)`);
  check(new Set(group.map((s) => s.sizes)).size <= 1, `the "${factor}" screenshots should all be the same size`);
}
check(screenshots.length <= 8, 'more than 8 manifest screenshots: Chrome shows at most 8');
for (const shot of screenshots) {
  const file = shot.src && distDir + distPathOf(shot.src);
  if (!file || !existsSync(file)) {
    check(false, `manifest screenshot ${shot.src} is not in dist`);
    continue;
  }
  const buf = readFileSync(file);
  check(shot.type === 'image/png' && isPng(buf), `manifest screenshot ${shot.src} should be a PNG declared as image/png`);
  check(['narrow', 'wide'].includes(shot.form_factor), `manifest screenshot ${shot.src} needs a form_factor of narrow or wide`);
  check(Boolean(shot.label), `manifest screenshot ${shot.src} needs a label (it is the image's alt text)`);
  if (!isPng(buf)) continue;
  const { width, height } = pngSize(buf);
  check(shot.sizes === `${width}x${height}`, `manifest screenshot ${shot.src} says ${shot.sizes} but is ${width}x${height}`);
  check(Math.min(width, height) >= 320 && Math.max(width, height) <= 3840, `manifest screenshot ${shot.src} must be 320–3840 px on each side (is ${width}x${height})`);
  check(Math.max(width, height) / Math.min(width, height) <= 2.3, `manifest screenshot ${shot.src} is too elongated: Chrome wants an aspect ratio of at most 2.3 (is ${(Math.max(width, height) / Math.min(width, height)).toFixed(2)})`);
  check(shot.form_factor !== 'narrow' || height > width, `narrow screenshot ${shot.src} should be portrait`);
  check(shot.form_factor !== 'wide' || width > height, `wide screenshot ${shot.src} should be landscape`);
}

// ---- Service worker --------------------------------------------------------------------------------------------
const sw = read('sw.js');
const build = (() => {
  try {
    return JSON.parse(sw.match(/\/\*BUILD\*\/([\s\S]*?)\/\*END\*\//)?.[1] ?? '');
  } catch {
    return null;
  }
})();
check(build, 'sw.js has no readable /*BUILD*/ block (did scripts/generate-sw.mjs run?)');
if (build) {
  const listed = new Set(build.precache.map((e) => e.url));
  check(/^[0-9a-f]{12}$/.test(build.version), `sw.js version should be a 12-character hash (is "${build.version}"); it must change with every build`);
  for (const url of listed) check(existsSync(distDir + url), `sw.js precaches ${url}, which is not in dist`);
  check(listed.has('index.html'), 'sw.js must precache index.html (the offline app shell)');
  check(listed.has('manifest.webmanifest'), 'sw.js must precache manifest.webmanifest');
  for (const icon of icons) check(listed.has(distPathOf(icon.src)), `sw.js does not precache the manifest icon ${icon.src}`);
  // Everything index.html loads, and every lazy chunk Vite emitted, has to be in the list or the app breaks offline.
  for (const [, ref] of html.matchAll(/(?:href|src)="(\.\/[^"#?]+)"/g)) {
    const path = ref.replace(/^\.\//, '');
    if (existsSync(distDir + path) && !path.startsWith('splash/')) check(listed.has(path) || /^(sitemap\.xml|og-image\.jpg)$/.test(path), `sw.js does not precache ${path}, which index.html loads`);
  }
  for (const name of readdirSync(distDir + 'assets')) {
    if (!name.endsWith('.map')) check(listed.has(`assets/${name}`), `sw.js does not precache assets/${name} (a lazy chunk would fail offline)`);
  }
  check(!listed.has('sw.js'), 'sw.js must not precache itself');
  // Only an installer ever looks at these, so a first visit shouldn't pay for them (the launch images alone are ~220 KB).
  for (const url of listed) check(!/^(splash|screenshots)\//.test(url), `sw.js precaches ${url}; launch images and screenshots belong outside the precache (SKIP_DIRS in scripts/generate-sw.mjs)`);
}
check(/addEventListener\('fetch'/.test(sw), 'sw.js needs a fetch handler');
check(/SKIP_WAITING/.test(sw) && /SKIP_WAITING/.test(readFileSync(new URL('../src/lib/pwa.ts', import.meta.url), 'utf8')), 'sw.js and src/lib/pwa.ts must agree on the SKIP_WAITING message');

// ---- Report ----------------------------------------------------------------------------------------------------
if (problems.length) {
  console.error(`PWA check failed (${problems.length}):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(
  `PWA check passed: "${manifest.short_name}" ${manifest.display}, ${icons.length} icons, ${manifest.shortcuts?.length ?? 0} shortcuts, ${screenshots.length} screenshots, ${splashLinks.length} iOS launch images, ${build.precache.length} files precached (version ${build.version})`,
);
