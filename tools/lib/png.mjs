// A small PNG writer (RGBA, 8 bits per channel) on node:zlib, so the tools need no packages.

import { deflateSync } from "node:zlib";

const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, "ascii"), data]), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * Encode w x h RGBA bytes as a PNG buffer. An opaque image with at most 256 colours (pixel art, most previews) is
 * written with a palette, 3 to 4 times smaller; another opaque one as RGB; the rest as RGBA.
 */
export function encodePNG(w, h, rgba) {
  const src = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  let opaque = true;
  for (let i = 3; i < src.length; i += 4) if (src[i] !== 255) { opaque = false; break; }
  if (opaque) {
    const index = new Map(), px = rgba.byteOffset % 4 ? new Uint32Array(new Uint8Array(src).buffer) : new Uint32Array(rgba.buffer, rgba.byteOffset, w * h);
    for (let i = 0; i < px.length && index.size <= 256; i++) if (!index.has(px[i])) index.set(px[i], index.size);
    if (index.size <= 256) {
      const raw = Buffer.alloc((w + 1) * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = index.get(px[y * w + x]); // filter 0
      const plte = Buffer.alloc(index.size * 3);
      for (const [c, i] of index) { plte[i * 3] = c & 255; plte[i * 3 + 1] = (c >>> 8) & 255; plte[i * 3 + 2] = (c >>> 16) & 255; }
      return png(w, h, 3, raw, chunk("PLTE", plte));
    }
    const stride = w * 3, raw = Buffer.alloc((stride + 1) * h);
    for (let y = 0; y < h; y++) {
      const o = y * (stride + 1);
      raw[o] = 1; // Sub filter
      for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) {
        const v = src[(y * w + x) * 4 + k];
        raw[o + 1 + x * 3 + k] = (v - (x ? src[(y * w + x - 1) * 4 + k] : 0)) & 255;
      }
    }
    return png(w, h, 2, raw);
  }
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1);
    raw[o] = 1; // Sub filter: pixel art has long runs, so differences compress well
    for (let x = 0; x < stride; x++) raw[o + 1 + x] = (src[y * stride + x] - (x >= 4 ? src[y * stride + x - 4] : 0)) & 255;
  }
  return png(w, h, 6, raw);
}

function png(w, h, type, raw, ...avant) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = type;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    ...avant,
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
