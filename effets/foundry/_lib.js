// Les effets de PVFX Foundry 1.0 (Pixel VFX Studio, https://github.com/arcanite24/pixel-vfx-studio), planches
// « lit » dédiées au domaine public (CC0 1.0). Ce ne sont pas des programmes mais des images : chaque fichier de ce
// dossier porte ses images, tirées de la planche d'origine par tools/pvfx-foundry.mjs, et les repeint pixel par pixel
// dans le tampon, donc tous les rendus du site s'y appliquent.
//
// Format d'une planche : { w, h, ms, pal, data }
//   w, h  la taille d'une image (meta.size) ; l'origine (meta.origin) est le pivot d'origine
//   ms    la durée de chaque image en millisecondes (un nombre si elles sont toutes égales)
//   pal   les couleurs, 8 chiffres hexadécimaux chacune (rrggbbaa) ; l'indice 0 est le vide
//   data  toutes les images bout à bout, un octet (indice dans pal) par pixel, compressées en deflate brut, en base64

import { clamp, fit, hex, luma } from "../../core/index.js";

// ---- inflate (RFC 1951), synchrone : les effets se dessinent sans attendre, dans le navigateur comme dans Node
const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// un code de Huffman canonique : le nombre de codes par longueur et les symboles dans l'ordre
function huffman(lengths) {
  const count = new Uint16Array(16), symbols = new Uint16Array(lengths.length), offs = new Uint16Array(16);
  for (const l of lengths) count[l]++;
  count[0] = 0;
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
  lengths.forEach((l, s) => { if (l) symbols[offs[l]++] = s; });
  return { count, symbols };
}

export function inflate(src, size) {
  const out = new Uint8Array(size);
  let pos = 0, bit = 0, o = 0;
  const bits = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v |= ((src[pos] >> bit) & 1) << i;
      if (++bit === 8) (bit = 0), pos++;
    }
    return v;
  };
  const decode = (h) => {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; len++) {
      code |= (src[pos] >> bit) & 1;
      if (++bit === 8) (bit = 0), pos++;
      const n = h.count[len];
      if (code - n < first) return h.symbols[index + code - first];
      index += n;
      first = (first + n) << 1;
      code <<= 1;
    }
    throw new Error("inflate : code invalide");
  };
  let fixed = null, last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      if (bit) (bit = 0), pos++;
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4;
      out.set(src.subarray(pos, pos + len), o);
      (pos += len), (o += len);
      continue;
    }
    let lit, dist;
    if (type === 1) {
      if (!fixed) {
        const l = new Uint8Array(288);
        l.fill(8, 0, 144), l.fill(9, 144, 256), l.fill(7, 256, 280), l.fill(8, 280, 288);
        fixed = [huffman(l), huffman(new Uint8Array(30).fill(5))];
      }
      [lit, dist] = fixed;
    } else {
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4, cl = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) cl[ORDER[i]] = bits(3);
      const ch = huffman(cl), lens = new Uint8Array(hlit + hdist);
      for (let i = 0; i < hlit + hdist; ) {
        const s = decode(ch);
        if (s < 16) lens[i++] = s;
        else {
          const [rep, prev] = s === 16 ? [3 + bits(2), lens[i - 1]] : s === 17 ? [3 + bits(3), 0] : [11 + bits(7), 0];
          lens.fill(prev, i, i + rep);
          i += rep;
        }
      }
      lit = huffman(lens.subarray(0, hlit));
      dist = huffman(lens.subarray(hlit));
    }
    for (;;) {
      const s = decode(lit);
      if (s < 256) out[o++] = s;
      else if (s === 256) break;
      else {
        const len = LBASE[s - 257] + bits(LEXT[s - 257]), d = decode(dist), back = DBASE[d] + bits(DEXT[d]);
        for (let i = 0; i < len; i++, o++) out[o] = out[o - back];
      }
    }
  }
  return out;
}

const base64 = (s) => {
  const b = atob(s), u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
};

/**
 * Les images d'une planche, prêtes à peindre. Renvoie { duration, draw(p, t, o) } ; draw peint l'image du temps t
 * (au-delà de la dernière, rien : un effet unique finit net). o.palette, si elle n'est pas celle de meta.options,
 * recolore l'effet : chaque couleur prend la teinte de la nouvelle palette à sa luminosité.
 */
export function planche(def, palette = []) {
  const { w, h, pal } = def, n = pal.length / 8;
  const colors = new Uint32Array(n + 1), alphas = new Float32Array(n + 1), lumas = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) {
    const c = hex("#" + pal.slice(i * 8, i * 8 + 6));
    colors[i + 1] = c;
    alphas[i + 1] = parseInt(pal.slice(i * 8 + 6, i * 8 + 8), 16) / 255;
    lumas[i + 1] = luma(c);
  }
  // les bornes du temps de chaque image
  const count = Array.isArray(def.ms) ? def.ms.length : def.count, ends = [];
  let total = 0;
  for (let f = 0; f < count; f++) ends.push((total += Array.isArray(def.ms) ? def.ms[f] : def.ms));
  let frames = null; // décompressées au premier dessin
  const defaut = palette.join(), recolor = new Map();
  const tinted = (pal2) => {
    const key = pal2.join();
    if (key === defaut || !pal2.length) return colors;
    let c = recolor.get(key);
    if (!c) {
      const r = fit(pal2.map((x) => (typeof x === "number" ? x : hex(x))), 16);
      c = colors.map((col, i) => (i ? r[clamp(Math.round(lumas[i] * 15), 0, 15)] : 0));
      recolor.set(key, c);
    }
    return c;
  };
  return {
    duration: total / 1000,
    count,
    draw(p, t, o = {}) {
      const ms = t * 1000;
      let f = 0;
      while (f < count && ends[f] <= ms) f++;
      if (f >= count) return;
      frames ??= inflate(base64(def.data), w * h * count);
      const C = tinted(o.palette ?? []), ox = def.ox, oy = def.oy, base = f * w * h;
      for (let y = 0, i = base; y < h; y++)
        for (let x = 0; x < w; x++, i++) {
          const k = frames[i];
          if (!k) continue;
          if (alphas[k] >= 1) p.dot(x - ox, y - oy, C[k]);
          else p.blend(x - ox, y - oy, C[k], alphas[k]);
        }
    },
  };
}
