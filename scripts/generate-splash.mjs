// Writes the iOS launch images (public/splash/*.png) and the <link rel="apple-touch-startup-image"> block in index.html.
// Run by hand when the logo changes or Apple ships a new screen size: `npm run generate:splash`.
//
// Android builds its launch screen from the manifest (background colour + icon). iOS does not: it shows a blank
// screen until the app paints, unless the page offers a launch image whose pixel size matches the device EXACTLY and
// whose media query matches. There is no "one image fits all", so this makes one per screen size.
//
// The design is the white mark on the brand colour, in both light and dark mode. A single design keeps this to ~30
// small files instead of ~60 (dark variants), and a purple launch screen suits either appearance. Nothing here is
// precached by the service worker: iOS reads these once, when the app is added to the home screen.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { GLYPH_BOX, GLYPH_CENTER, renderMark } from './lib/brand.mjs';
import { encodePng } from './lib/png.mjs';

// Portrait size in CSS points and the device pixel ratio. Several models share a size; the comment lists them.
// iPhones launch in portrait (the home screen app follows the device if it rotates, but that is rare enough to skip
// and iOS just shows its default blank screen then). iPads are used in both orientations, so they get both.
const DEVICES = [
  // iPhone
  { w: 440, h: 956, dpr: 3 }, // 17 Pro Max, 16 Pro Max
  { w: 420, h: 912, dpr: 3 }, // Air
  { w: 402, h: 874, dpr: 3 }, // 17, 17 Pro, 16 Pro
  { w: 430, h: 932, dpr: 3 }, // 16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max
  { w: 393, h: 852, dpr: 3 }, // 16, 15, 15 Pro, 14 Pro
  { w: 428, h: 926, dpr: 3 }, // 14 Plus, 13 Pro Max, 12 Pro Max
  { w: 390, h: 844, dpr: 3 }, // 14, 13, 13 Pro, 12, 12 Pro
  { w: 375, h: 812, dpr: 3 }, // 13 mini, 12 mini, 11 Pro, XS, X
  { w: 414, h: 896, dpr: 3 }, // 11 Pro Max, XS Max
  { w: 414, h: 896, dpr: 2 }, // 11, XR
  { w: 414, h: 736, dpr: 3 }, // 8 Plus
  { w: 375, h: 667, dpr: 2 }, // SE (2nd, 3rd gen), 8
  // iPad
  { w: 1032, h: 1376, dpr: 2, both: true }, // Pro 13" (M4), Air 13"
  { w: 1024, h: 1366, dpr: 2, both: true }, // Pro 12.9"
  { w: 834, h: 1210, dpr: 2, both: true }, // Pro 11" (M4)
  { w: 834, h: 1194, dpr: 2, both: true }, // Pro 11"
  { w: 834, h: 1112, dpr: 2, both: true }, // Pro 10.5", Air (3rd gen)
  { w: 820, h: 1180, dpr: 2, both: true }, // Air 11" and 10.9", iPad (10th gen and later)
  { w: 810, h: 1080, dpr: 2, both: true }, // iPad 10.2"
  { w: 768, h: 1024, dpr: 2, both: true }, // iPad 9.7", mini (5th gen)
  { w: 744, h: 1133, dpr: 2, both: true }, // mini (6th gen and later)
];
const MARK_SHARE = 0.3; // the mark's width as a share of the screen's shorter side

const splashDir = new URL('../public/splash/', import.meta.url);
mkdirSync(splashDir, { recursive: true });
for (const name of readdirSync(splashDir)) if (name.endsWith('.png')) rmSync(new URL(name, splashDir)); // drop sizes removed above

const links = [];
let bytes = 0;
for (const { w, h, dpr, both } of DEVICES) {
  for (const orientation of both ? ['portrait', 'landscape'] : ['portrait']) {
    const landscape = orientation === 'landscape';
    const width = (landscape ? h : w) * dpr;
    const height = (landscape ? w : h) * dpr;
    const scale = (MARK_SHARE * Math.min(width, height)) / (GLYPH_BOX[2] - GLYPH_BOX[0]);
    const origin = [width / 2 - GLYPH_CENTER[0] * scale, height / 2 - GLYPH_CENTER[1] * scale];
    const png = encodePng(renderMark({ width, height, scale, origin, backdrop: 'full' }), width, height);
    const file = `apple-splash-${width}x${height}.png`;
    writeFileSync(new URL(file, splashDir), png);
    bytes += png.length;
    // iOS keeps device-width/height in portrait terms even when rotated; only `orientation` changes.
    const media = `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation})`;
    links.push(`    <link rel="apple-touch-startup-image" media="${media}" href="./splash/${file}" />`);
  }
}

const htmlUrl = new URL('../index.html', import.meta.url);
const html = readFileSync(htmlUrl, 'utf8');
const block = /<!-- splash:start -->[\s\S]*?<!-- splash:end -->/;
if (!block.test(html)) throw new Error('index.html has no <!-- splash:start --> … <!-- splash:end --> block to fill');
writeFileSync(htmlUrl, html.replace(block, () => `<!-- splash:start -->\n${links.join('\n')}\n    <!-- splash:end -->`));

console.log(`public/splash: ${links.length} launch images for ${DEVICES.length} screen sizes, ${(bytes / 1024).toFixed(0)} KB in total; index.html updated`);
