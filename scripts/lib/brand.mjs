// The "IE" mark from public/favicon.svg, redrawn with a small supersampling rasteriser, shared by
// scripts/generate-icons.mjs and scripts/generate-splash.mjs so the icons and the iOS launch images are the same
// artwork. If you change the mark in favicon.svg, change it here too, then regenerate and commit the PNGs.
export const BRAND = [0x6d, 0x4f, 0xd6];
export const WHITE = [0xff, 0xff, 0xff];

export const VIEWBOX = 64;
const TILE_RADIUS = 14;
// [x, y, width, height] in viewBox units; each rect has a 1.5 corner radius, as in favicon.svg.
const GLYPH = [
  [15, 17, 8, 30], // I
  [29, 17, 8, 30], // E: spine
  [29, 17, 21, 8], //    top arm
  [29, 28, 17, 8], //    middle arm
  [29, 39, 21, 8], //    bottom arm
];
const GLYPH_RADIUS = 1.5;
/** The mark's bounding box [x0, y0, x1, y1] and centre, in viewBox units. */
export const GLYPH_BOX = [15, 17, 50, 47];
export const GLYPH_CENTER = [32.5, 32];

const SAMPLES = 6; // SAMPLES × SAMPLES sub-pixel samples per pixel

function insideRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = px < x + r ? x + r : px > x + w - r ? x + w - r : px;
  const cy = py < y + r ? y + r : py > y + h - r ? y + h - r : py;
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

/**
 * Render to raw RGBA.
 *   scale     pixels per viewBox unit
 *   origin    [x, y] pixel position of the viewBox's top-left corner (it may lie off-canvas)
 *   backdrop  "tile": the rounded square of favicon.svg on a transparent canvas (the "any" icons)
 *             "full": the brand colour over the whole canvas (maskable icons and launch images)
 */
export function renderMark({ width, height, scale, origin = [0, 0], backdrop }) {
  const out = Buffer.alloc(width * height * 4);
  const [x0, y0, x1, y1] = GLYPH_BOX.map((v, i) => (i % 2 === 0 ? origin[0] : origin[1]) + v * scale);
  const total = SAMPLES * SAMPLES;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const o = (j * width + i) * 4;
      // Far from the mark on a full-bleed canvas every pixel is plain brand colour; skip the sampling.
      if (backdrop === 'full' && (i < x0 - 2 || i > x1 + 2 || j < y0 - 2 || j > y1 + 2)) {
        out[o] = BRAND[0];
        out[o + 1] = BRAND[1];
        out[o + 2] = BRAND[2];
        out[o + 3] = 255;
        continue;
      }
      let bg = 0;
      let fg = 0;
      for (let sj = 0; sj < SAMPLES; sj++) {
        for (let si = 0; si < SAMPLES; si++) {
          const px = (i + (si + 0.5) / SAMPLES - origin[0]) / scale;
          const py = (j + (sj + 0.5) / SAMPLES - origin[1]) / scale;
          if (GLYPH.some(([x, y, w, h]) => insideRoundedRect(px, py, x, y, w, h, GLYPH_RADIUS))) fg++;
          else if (backdrop === 'full' || insideRoundedRect(px, py, 0, 0, VIEWBOX, VIEWBOX, TILE_RADIUS)) bg++;
        }
      }
      if (bg + fg > 0) {
        for (let c = 0; c < 3; c++) out[o + c] = Math.round((BRAND[c] * bg + WHITE[c] * fg) / (bg + fg));
        out[o + 3] = Math.round(((bg + fg) / total) * 255);
      }
    }
  }
  return out;
}
