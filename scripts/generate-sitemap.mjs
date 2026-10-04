// Writes dist/sitemap.xml after `vite build` (wired as the npm `postbuild` hook).
//
// The app is a single page with hash routes (#/browse, #/flashcards, …). A URL fragment is not a separate
// page to a search engine, so there is exactly one indexable URL: the canonical address in index.html.
// <lastmod> is the date of the last commit that touched what the page is built from, so it only moves when the
// site really changes. It needs git history (CI checks out with fetch-depth: 0); without it the tag is omitted
// and `npm run check:seo` fails, rather than inventing a date.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
if (!canonical) throw new Error('dist/index.html has no <link rel="canonical">');

let lastmod = '';
try {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', 'index.html', 'src', 'public'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  lastmod = iso.slice(0, 10);
} catch {
  // no git available
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${canonical}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>
</urlset>
`;
writeFileSync(new URL('sitemap.xml', dist), xml);
console.log(`sitemap.xml: ${canonical}${lastmod ? ` (lastmod ${lastmod})` : ' (no lastmod: git history unavailable)'}`);
