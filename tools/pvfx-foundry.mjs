#!/usr/bin/env node
// Importe (ou réimporte) des effets de PVFX Foundry 1.0 (Pixel VFX Studio, planches dédiées au domaine public,
// CC0 1.0) dans la bibliothèque principale, effets/<catégorie>/<nom>.js (la famille du pack, ou la plus proche :
// voir CATEGORIE). Chaque fichier garde le nom, la description, les tags, la taille, le pivot
// et les durées d'images du pack, et ses images : la planche « lit » (grille), ramenée à 255 couleurs au plus si
// besoin, compressée et lue par effets/_pvfx/planche.js.
//
//   node tools/pvfx-foundry.mjs <dossier du pack décompressé> && node tools/index.mjs
//
// Seuls les effets de GARDER sont importés : choix de Simon (04/11/2026), les effets dont le nom existe déjà dans la
// bibliothèque (même nom ou presque, ex. fire-pillar / flame-pillar) sont laissés de côté.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync, deflateRawSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src || !existsSync(join(src, "pack.json"))) {
  console.error("usage : node tools/pvfx-foundry.mjs <dossier du pack PVFX Foundry>");
  process.exit(1);
}

export const GARDER = [
  "arcane/arcane-orb-projectile", "arcane/blink-dash", "arcane/portal-summon", "arcane/rune-trap", "arcane/shield-shatter",
  "arcane/teleport-in", "explosions/arcane-burst", "explosions/fire-nova", "fire/ground-flames", "fire/lava-burst",
  "holy/angel-feathers", "holy/barrier-block", "holy/divine-beam", "holy/regen-aura", "holy/resurrect", "holy/shield-bubble",
  "ice/ice-wall", "ice/snowball-impact", "impacts/blood-splat", "impacts/punch-hit", "impacts/rock-shatter",
  "impacts/shockwave-ring", "lightning/static-burst", "lightning/thunder-cloud", "melee/axe-smear", "melee/shadow-claw",
  "melee/spear-thrust", "nature/acid-spit", "nature/fissure", "nature/vine-snare", "projectiles/ice-shard",
  "projectiles/poison-dart", "shadow/shadow-bolt", "shadow/void-implosion", "smoke/dash-dust", "smoke/dust-puff",
  "smoke/steam-vent", "status/charm-hearts", "status/power-up-aura", "status/stun-stars", "ui/star-burst-pickup",
  "ui/treasure-glint", "water/bubble-burst", "water/tidal-wave", "wind/whirlwind", "wind/wind-blade", "wind/wind-gust",
];

// ---- PNG RVBA 8 bits sans entrelacement (le format de toutes les planches du pack)
function readPNG(file) {
  const b = readFileSync(file);
  let p = 8, w = 0, h = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString("latin1", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      if (d[8] !== 8 || d[9] !== 6 || d[12] !== 0) throw new Error(`${file} : PNG RVBA 8 bits attendu`);
    } else if (type === "IDAT") idat.push(d);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), px = new Uint8Array(w * h * 4), S = w * 4;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (S + 1)], line = raw.subarray(y * (S + 1) + 1, (y + 1) * (S + 1)), o = y * S;
    for (let x = 0; x < S; x++) {
      const a = x >= 4 ? px[o + x - 4] : 0, up = y ? px[o - S + x] : 0, c = x >= 4 && y ? px[o - S + x - 4] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[o + x] = v & 255;
    }
  }
  return { w, h, px };
}

// ---- au plus 255 couleurs : coupe médiane sur (r, v, b, a), pondérée par le nombre de pixels
function quantize(hist, max = 255) {
  const cols = [...hist.entries()].map(([k, n]) => ({ c: [k >>> 24, (k >>> 16) & 255, (k >>> 8) & 255, k & 255], n }));
  if (cols.length <= max) return cols.map((e) => e.c);
  const boxes = [cols];
  while (boxes.length < max) {
    let best = -1, bi = -1, ch = 0;
    boxes.forEach((bx, i) => {
      if (bx.length < 2) return;
      for (let k = 0; k < 4; k++) {
        let lo = 255, hi = 0;
        for (const e of bx) (lo = Math.min(lo, e.c[k])), (hi = Math.max(hi, e.c[k]));
        const s = (hi - lo) * Math.sqrt(bx.reduce((t, e) => t + e.n, 0));
        if (s > best) (best = s), (bi = i), (ch = k);
      }
    });
    if (bi < 0) break;
    const bx = boxes[bi].sort((a, b) => a.c[ch] - b.c[ch]), tot = bx.reduce((t, e) => t + e.n, 0);
    let acc = 0, cut = 1;
    for (; cut < bx.length - 1; cut++) if ((acc += bx[cut - 1].n) >= tot / 2) break;
    boxes.splice(bi, 1, bx.slice(0, cut), bx.slice(cut));
  }
  return boxes.map((bx) => {
    const t = bx.reduce((s, e) => s + e.n, 0);
    return [0, 1, 2, 3].map((k) => Math.round(bx.reduce((s, e) => s + e.c[k] * e.n, 0) / t));
  });
}

// leurs familles « smoke » et « wind » n'existent pas ici : chaque effet va dans la catégorie la plus proche
export const CATEGORIE = { "smoke/dash-dust": "impacts", "smoke/dust-puff": "impacts", "smoke/steam-vent": "water", "wind/whirlwind": "weather", "wind/wind-gust": "weather", "wind/wind-blade": "projectiles" };

const pack = JSON.parse(readFileSync(join(src, "pack.json"), "utf8"));
const parId = new Map(pack.effects.map((e) => [e.id, e]));
mkdirSync(join(ROOT, "effets", "_pvfx"), { recursive: true });
const hexa = (c) => c.map((v) => v.toString(16).padStart(2, "0")).join("");
let poids = 0;

for (const id of GARDER) {
  const e = parId.get(id);
  if (!e) throw new Error(`${id} : absent du pack`);
  const art = e.artifacts.lit.grid, man = JSON.parse(readFileSync(join(src, art.manifest), "utf8"));
  const sheet = readPNG(join(src, art.sheet));
  const [W, H] = man.source_size, N = man.frames.length;
  // les pixels de chaque image, puis la palette
  const pix = new Uint32Array(W * H * N), hist = new Map();
  man.frames.forEach((f, n) => {
    const s = f.sheet;
    if (s.scale !== 1 || s.width !== W || s.height !== H) throw new Error(`${id} : case de grille inattendue`);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const q = ((s.y + y) * sheet.w + s.x + x) * 4, a = sheet.px[q + 3];
        if (!a) continue;
        const k = ((sheet.px[q] << 24) | (sheet.px[q + 1] << 16) | (sheet.px[q + 2] << 8) | a) >>> 0;
        pix[n * W * H + y * W + x] = k;
        hist.set(k, (hist.get(k) ?? 0) + 1);
      }
  });
  const pal = quantize(hist), proche = new Map();
  for (const k of hist.keys()) {
    const c = [k >>> 24, (k >>> 16) & 255, (k >>> 8) & 255, k & 255];
    let bi = 0, bd = Infinity;
    pal.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 + 2 * (p[3] - c[3]) ** 2; if (d < bd) (bd = d), (bi = i); });
    proche.set(k, bi + 1);
  }
  const idx = new Uint8Array(W * H * N);
  pix.forEach((k, i) => { if (k) idx[i] = proche.get(k); });
  const data = deflateRawSync(idx, { level: 9 }).toString("base64");

  const ms = man.frames.map((f) => f.duration.numerator_ms / f.duration.denominator);
  const egal = ms.every((m) => m === ms[0]);
  const total = ms.reduce((a, b) => a + b, 0);
  // la palette de réglage : les couleurs opaques les plus présentes, de la plus sombre à la plus claire
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const poidsPal = new Map();
  for (const [k, n] of hist) if ((k & 255) === 255) { const i = proche.get(k); poidsPal.set(i, (poidsPal.get(i) ?? 0) + n); }
  const reglage = [...poidsPal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([i]) => pal[i - 1]).sort((a, b) => lum(a) - lum(b)).map((c) => "#" + hexa(c.slice(0, 3)));
  const famille = e.category, nom = id.split("/")[1];
  const tags = [...new Set([famille, ...e.tags.filter((t) => t !== "flagship"), e.loop ? "loop" : "one-shot", "sprite", "pvfx"])];
  const meta = {
    name: e.name,
    desc: e.description,
    tags,
    size: [W, H],
    origin: man.pivot,
    duration: +(total / 1000).toFixed(3),
    loop: !!e.loop,
    fps: Math.round(1000 / ms[0]),
    bg: "dark",
    author: "Pixel VFX Studio",
    options: { palette: reglage },
  };
  const def = { w: W, h: H, ox: man.pivot[0], oy: man.pivot[1], ...(egal ? { count: N, ms: ms[0] } : { ms }), pal: pal.map(hexa).join(""), data };
  const code = `// ${e.name} : PVFX Foundry 1.0 par Pixel VFX Studio (${id}), planche « lit » dédiée au domaine public (CC0 1.0).
// Importé par tools/pvfx-foundry.mjs : ${N} images de ${W}×${H}, ${pal.length} couleurs. Le dessin est dans effets/_pvfx/planche.js.
import { planche } from "../_pvfx/planche.js";

export const meta = ${JSON.stringify(meta, null, 2).replace(/"(\w+)":/g, "$1:").replace(/\[\n\s+([^\[\]{}]*?)\n\s+\]/g, (m, x) => "[" + x.replace(/\n\s+/g, " ") + "]")};

const P = planche(${JSON.stringify(def)}, meta.options.palette);

export function draw(p, t, o) {
  P.draw(p, t, o);
}
`;
  const cat = CATEGORIE[id] ?? famille;
  if (!existsSync(join(ROOT, "effets", cat))) throw new Error(`${id} : la catégorie ${cat} n'existe pas`);
  writeFileSync(join(ROOT, "effets", cat, nom + ".js"), code);
  poids += code.length;
}
writeFileSync(join(ROOT, "effets", "_pvfx", "LICENSE.txt"), readFileSync(join(src, "LICENSE.txt")));
console.log(`${GARDER.length} effets -> effets/<catégorie>/ (${Math.round(poids / 1024)} Ko)`);
