// A small PNG encoder with no dependencies, shared by the icon and launch-image generators.
//
// Artwork like this has few distinct colours (a flat background, the mark, and its antialiased edge). So when an
// image has 256 or fewer, it is written as an indexed (palette) PNG, and every scanline uses the "Up" filter. A flat
// 1320×2868 launch image then comes out at a few KB instead of about 100 KB, because identical rows turn into runs
// of zeros that deflate squeezes to almost nothing. Images with more colours fall back to truecolour RGBA.
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
}

/** Try to turn RGBA into palette indices. Returns null when the image has more than 256 distinct colours. */
function toPalette(rgba, pixels) {
  const index = new Map();
  const colours = [];
  const indices = Buffer.alloc(pixels);
  let lastKey = -1;
  let lastIndex = 0;
  for (let p = 0; p < pixels; p++) {
    const key = rgba.readUInt32BE(p * 4);
    if (key !== lastKey) {
      let found = index.get(key);
      if (found === undefined) {
        if (colours.length === 256) return null;
        found = colours.length;
        colours.push(key);
        index.set(key, found);
      }
      lastKey = key;
      lastIndex = found;
    }
    indices[p] = lastIndex;
  }
  return { indices, colours };
}

/** Apply the "Up" filter (type 2) to every scanline: each byte minus the one above it. */
function filterUp(data, rowBytes, rows) {
  const out = Buffer.alloc((rowBytes + 1) * rows);
  for (let y = 0; y < rows; y++) {
    const o = y * (rowBytes + 1);
    out[o] = 2;
    for (let x = 0; x < rowBytes; x++) {
      out[o + 1 + x] = (data[y * rowBytes + x] - (y ? data[(y - 1) * rowBytes + x] : 0)) & 0xff;
    }
  }
  return out;
}

export function encodePng(rgba, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  const palette = toPalette(rgba, width * height);
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  let scanlines;
  if (palette) {
    ihdr[9] = 3; // indexed colour
    const plte = Buffer.alloc(palette.colours.length * 3);
    const alpha = Buffer.alloc(palette.colours.length);
    palette.colours.forEach((key, i) => {
      plte[i * 3] = key >>> 24;
      plte[i * 3 + 1] = (key >>> 16) & 0xff;
      plte[i * 3 + 2] = (key >>> 8) & 0xff;
      alpha[i] = key & 0xff;
    });
    parts.push(chunk('IHDR', ihdr), chunk('PLTE', plte));
    if (alpha.some((a) => a !== 255)) parts.push(chunk('tRNS', alpha));
    scanlines = filterUp(palette.indices, width, height);
  } else {
    ihdr[9] = 6; // truecolour with alpha
    parts.push(chunk('IHDR', ihdr));
    scanlines = filterUp(rgba, width * 4, height);
  }
  parts.push(chunk('IDAT', deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
