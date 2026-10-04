// Post-build SEO guard for the IELTS app. Run after `npm run build`: `npm run check:seo`.
//
// A single-page app can score 100 in Lighthouse and still be nearly invisible, because Lighthouse runs
// JavaScript. This checks what a crawler, a link previewer or an AI assistant gets from the raw HTML, and the
// files around it (sitemap, icons, social image, 404). Every rule here was added because it can break silently.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const read = (name) => readFileSync(distDir + name, 'utf8');
const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

if (!existsSync(distDir + 'index.html')) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}
const html = read('index.html');

const meta = (attr, key) =>
  html.match(new RegExp(`<meta\\s+(?:[^>]*?\\s)?${attr}="${key}"[^>]*?\\scontent="([^"]*)"`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta\\s+(?:[^>]*?\\s)?content="([^"]*)"[^>]*?\\s${attr}="${key}"`, 'i'))?.[1];
const decode = (s) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// ---- Head ------------------------------------------------------------------------------------------------------
const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1]);
const description = decode(meta('name', 'description'));
const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];

check(/<html[^>]*\slang="[a-z-]+"/.test(html), '<html> needs a lang attribute');
check(/<meta\s+name="viewport"/.test(html), 'missing viewport meta');
check(title && title.length <= 60, `title must exist and be at most 60 characters (is ${title?.length ?? 0})`);
check(
  description && description.length >= 70 && description.length <= 160,
  `description must be 70–160 characters (is ${description?.length ?? 0})`,
);
check(canonical && /^https:\/\/[^/]+\/.*\/$/.test(canonical), `canonical must be an absolute https URL ending in "/" (is ${canonical})`);
check(!/noindex/i.test(meta('name', 'robots') ?? ''), 'the app page must not be noindex');

// The title in the HTML and the one the app restores after navigating must match.
const appTitle = readFileSync(new URL('../src/lib/documentTitle.ts', import.meta.url), 'utf8').match(
  /APP_TITLE\s*=\s*'([^']+)'/,
)?.[1];
check(appTitle === title, `index.html <title> and APP_TITLE in src/lib/documentTitle.ts differ ("${title}" vs "${appTitle}")`);

// ---- Open Graph / Twitter --------------------------------------------------------------------------------------
check(meta('property', 'og:title') === title, 'og:title must equal <title>');
check(decode(meta('property', 'og:description')) === description, 'og:description must equal the meta description');
check(meta('property', 'og:url') === canonical, 'og:url must equal the canonical URL');
check(meta('property', 'og:type'), 'missing og:type');
check(meta('name', 'twitter:card') === 'summary_large_image', 'twitter:card must be summary_large_image');
check(meta('name', 'twitter:title') === title, 'twitter:title must equal <title>');
check(decode(meta('name', 'twitter:description')) === description, 'twitter:description must equal the meta description');
check(meta('property', 'og:image:alt') && meta('name', 'twitter:image:alt'), 'social image needs alt text');

const origin = canonical ? new URL(canonical) : null;
const distPathOf = (url) => {
  const u = new URL(url, canonical);
  return u.origin === origin.origin && u.pathname.startsWith(origin.pathname)
    ? decodeURIComponent(u.pathname.slice(origin.pathname.length))
    : null;
};

function jpegSize(buf) {
  for (let i = 2; i < buf.length; ) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
const pngSize = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

const ogImage = meta('property', 'og:image');
check(ogImage && meta('name', 'twitter:image') === ogImage, 'og:image and twitter:image must be set and equal');
const ogPath = ogImage && origin ? distPathOf(ogImage) : null;
if (ogImage) {
  check(ogPath !== null && existsSync(distDir + ogPath), `og:image is not built into dist (${ogImage})`);
  check(ogImage.startsWith('https://'), 'og:image must be an absolute https URL');
  if (ogPath !== null && existsSync(distDir + ogPath)) {
    const size = jpegSize(readFileSync(distDir + ogPath));
    check(size && size.width === 1200 && size.height === 630, `og:image should be 1200×630 (is ${size?.width}×${size?.height})`);
    check(statSync(distDir + ogPath).size < 300_000, 'og:image is over 300 KB; some platforms drop heavy previews');
    check(
      Number(meta('property', 'og:image:width')) === size?.width && Number(meta('property', 'og:image:height')) === size?.height,
      'og:image:width/height do not match the image',
    );
  }
}

// ---- Structured data -------------------------------------------------------------------------------------------
const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
check(ldBlocks.length > 0, 'missing JSON-LD');
for (const raw of ldBlocks) {
  let ld;
  try {
    ld = JSON.parse(raw);
  } catch (e) {
    check(false, `JSON-LD does not parse: ${e.message}`);
    continue;
  }
  check(ld['@context'] === 'https://schema.org', 'JSON-LD @context must be https://schema.org');
  check(ld['@type'] === 'WebApplication', 'JSON-LD @type should be WebApplication');
  check(ld.url === canonical, 'JSON-LD url must equal the canonical URL');
  check(ld.description === description, 'JSON-LD description must equal the meta description');
  check(ld.name && ld.applicationCategory && ld.operatingSystem, 'WebApplication needs name, applicationCategory and operatingSystem');
  check(ld.author?.['@id'] && ld.author?.name && ld.author?.url, 'author must be a full Person reference (@id, name, url), never a bare @id');
  // This app has no ratings or reviews. Invented ones are a spam-policy violation.
  check(!('aggregateRating' in ld) && !('review' in ld), 'JSON-LD must not carry ratings or reviews the site cannot back up');
}

// ---- The static shell crawlers read before (or without) JavaScript ---------------------------------------------
const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<\/body>/)?.[1] ?? '';
const h1s = root.match(/<h1[\s>]/g) ?? [];
check(h1s.length === 1, `the static shell needs exactly one <h1> (has ${h1s.length})`);
const levels = [...root.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
check(levels.every((l, i) => i === 0 || l <= levels[i - 1] + 1), `the static shell skips a heading level (${levels.join(', ')})`);
const words = root.replace(/<(style|noscript)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
check(words >= 120, `the static shell is too thin to be useful to a crawler (${words} words, want 120+)`);
check(/<noscript>/.test(root), 'the static shell should tell visitors without JavaScript what is wrong');
check(/<a\s[^>]*href="https:\/\/shakoorattari\.com\/"/.test(root), 'the static shell should link to the author (https://shakoorattari.com/)');

// ---- The copy must match the data ------------------------------------------------------------------------------
// The page promises "1000 collocations in 10 themes and 100 topics". If the data changes, the copy has to follow.
const themes = JSON.parse(readFileSync(new URL('../src/data/collocations.json', import.meta.url), 'utf8'));
const counts = {
  themes: themes.length,
  topics: themes.reduce((n, t) => n + t.topics.length, 0),
  items: themes.reduce((n, t) => n + t.topics.reduce((m, p) => m + p.collocations.length, 0), 0),
};
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const claim = `${counts.items} collocations in ${counts.themes} themes and ${counts.topics} topics`;
check(plain(root).includes(claim), `the static shell should say "${claim}" (the data in src/data/collocations.json)`);
check(ldBlocks.some((b) => b.includes(`${counts.items} IELTS collocations in ${counts.themes} themes and ${counts.topics} topics`)), `JSON-LD featureList should say "${counts.items} IELTS collocations in ${counts.themes} themes and ${counts.topics} topics"`);
check(title.includes(String(counts.items)) && description.includes(String(counts.items)), `title and description should mention ${counts.items} collocations`);

// ---- Everything the page references must exist -----------------------------------------------------------------
for (const [, ref] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  if (/^(mailto:|tel:|data:)/.test(ref)) continue;
  if (/^https?:\/\//.test(ref)) {
    const local = origin ? distPathOf(ref) : null;
    if (local === null) continue; // external
    check(local === '' || existsSync(distDir + local), `${ref} is not in dist`);
  } else {
    const rel = ref.replace(/^\.?\//, '');
    check(rel === '' || existsSync(distDir + rel), `${ref} is not in dist`);
  }
}
const touch = html.match(/<link\s+rel="apple-touch-icon"\s+href="([^"]+)"/)?.[1];
check(touch, 'missing apple-touch-icon');
if (touch && existsSync(distDir + touch.replace(/^\.\//, ''))) {
  const size = pngSize(readFileSync(distDir + touch.replace(/^\.\//, '')));
  check(size.width === 180 && size.height === 180, `apple-touch-icon should be 180×180 (is ${size.width}×${size.height})`);
}
check(/<link\s+rel="icon"[^>]*href="\.\/favicon\.svg"/.test(html), 'missing the SVG favicon link');

// ---- sitemap.xml and 404.html ----------------------------------------------------------------------------------
if (!existsSync(distDir + 'sitemap.xml')) {
  check(false, 'dist/sitemap.xml is missing (the postbuild step did not run)');
} else {
  const sitemap = read('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(locs.length === 1 && locs[0] === canonical, `sitemap must list exactly the canonical URL (has ${locs.join(', ') || 'nothing'})`);
  check(locs.every((l) => origin && new URL(l).pathname.startsWith(origin.pathname)), 'sitemap lists URLs outside its own directory; search engines ignore those');
  const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  check(
    lastmods.length === locs.length && lastmods.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))),
    'every sitemap URL needs a valid <lastmod> (is git history available? CI must use fetch-depth: 0)',
  );
  check(!lastmods.some((d) => Date.parse(d) > Date.now() + 86_400_000), 'sitemap lastmod is in the future');
}
if (!existsSync(distDir + '404.html')) check(false, 'dist/404.html is missing');
else check(/<meta\s+name="robots"\s+content="noindex"/.test(read('404.html')), '404.html must be noindex');

// ---- Report ----------------------------------------------------------------------------------------------------
if (problems.length) {
  console.error(`SEO check failed (${problems.length}):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`SEO check passed: title ${title.length} chars, description ${description.length} chars, ${words}-word static shell, ${canonical}`);
