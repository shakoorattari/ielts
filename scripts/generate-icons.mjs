// Writes the PWA icons into public/icons/. Run by hand when the logo changes: `npm run generate:icons`.
// The artwork lives in scripts/lib/brand.mjs (a copy of public/favicon.svg) and is shared with the iOS launch images.
//
//   icon-192.png / icon-512.png    purpose "any": the rounded mark on a transparent background
//   icon-maskable-512.png          purpose "maskable": full-bleed, so Android can crop it to any shape. The mark
//                                  sits inside the central 80% circle (the "safe zone") that launchers guarantee to show.
import { mkdirSync, writeFileSync } from 'node:fs';
import { VIEWBOX, renderMark } from './lib/brand.mjs';
import { encodePng } from './lib/png.mjs';

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });
const icons = [
  ['icon-192.png', 192, 'tile'],
  ['icon-512.png', 512, 'tile'],
  ['icon-maskable-512.png', 512, 'full'],
];
for (const [name, size, backdrop] of icons) {
  const png = encodePng(renderMark({ width: size, height: size, scale: size / VIEWBOX, backdrop }), size, size);
  writeFileSync(new URL(name, outDir), png);
  console.log(`public/icons/${name}: ${size}×${size}${backdrop === 'full' ? ' maskable' : ''}, ${(png.length / 1024).toFixed(1)} KB`);
}
