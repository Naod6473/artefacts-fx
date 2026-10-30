import { fit, hex, rng, noise2, mix, TAU } from "../../core/index.js";
import { Grid, shift, spine, drawKoi, robe, lit } from "./_lib.js";

export const meta = {
  name: "Koi Pond",
  desc: "A pond seen from above where seven koi of different robes (kohaku, sanke, showa, tancho, ogon, karasu, higoi) circle between lily pads, light shimmering on the water.",
  tags: ["creature", "koi", "fish", "water", "pond", "zen", "top-down", "loop", "scene"],
  size: [208, 144],
  origin: [104, 72],
  duration: 10,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    water: ["#08161a", "#0d2228", "#143038", "#1e4048"],
    palette: ["#14161c", "#7d8590", "#b8bdc4", "#e4e2dc", "#fbfaf6"],
    spots: ["#2a0806", "#8e1d12", "#c8331c", "#e8512c", "#ff8a5c"],
    ink: ["#050506", "#18181c", "#2a2a30", "#3e3e46", "#5a5a66"],
    gold: ["#1c1004", "#7a4a10", "#b8801c", "#e0b040", "#fff090"],
    pads: ["#0a1a0c", "#1e4420", "#2e6430", "#4a8a40", "#7ab45a"],
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-104, -72, 208, 144);
// each koi: variety, loop size and center, how many laps in the loop (negative swims the other way), phase, length
const SCHOOL = [
  ["kohaku", 70, 40, 0, 0, 1, 0, 34], ["sanke", 52, 30, -10, 4, 1, 0.33, 30], ["showa", 76, 46, 4, -2, -1, 0.15, 32],
  ["tancho", 36, 22, 20, -8, -1, 0.6, 26], ["ogon", 60, 38, -6, 2, 1, 0.66, 36], ["karasu", 44, 30, 8, 6, 2, 0.4, 28],
  ["higoi", 66, 26, 0, 10, -1, 0.85, 30],
];
const PADS = [[-82, -48, 12], [-70, -36, 8], [84, 46, 14], [70, 56, 8], [88, -50, 10], [-88, 52, 9]];

// the water's ripples: a noise field made once, two layers of it drifting in circles against each other
let FIELD = null;
const fieldFor = (seed) => {
  if (FIELD?.seed !== seed) {
    const f = new Float32Array(256 * 192);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) f[y * 256 + x] = noise2(x * 0.05, y * 0.07, seed);
    FIELD = { seed, f };
  }
  return FIELD.f;
};

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), W = o.water.map(hex), F = fieldFor(o.seed), a = (TAU * t) / D;
  const ax = Math.round(20 + Math.cos(a) * 18), ay = Math.round(20 + Math.sin(a) * 18), bx = Math.round(20 - Math.sin(a) * 14), by = Math.round(20 + Math.cos(a) * 14);
  p.shade(-104, -72, 103, 71, (x, y) => {
    const i = Math.floor(x) + 104, j = Math.floor(y) + 72, n = (F[(j + ay) * 256 + i + ax] + F[(j + by) * 256 + i + bx]) * 0.7;
    return W[n > 0.45 ? 3 : n > 0.1 ? 2 : n > -0.4 ? 1 : 0];
  });
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), g = GRID.clear();
  const R = { white: fit(o.palette, 5), red: fit(o.spots, 5), black: fit(o.ink, 5), gold: fit(o.gold, 5) }, P = fit(o.pads, 5);
  for (let i = 0; i < SCHOOL.length; i++) {
    const [v, rx, ry, cx, cy, laps, ph, L] = SCHOOL[i], dir = Math.sign(laps);
    const where = (u) => [cx + rx * Math.cos(dir * TAU * u + i), cy + ry * Math.sin(dir * TAU * u + i) + 6 * Math.sin(2 * TAU * u + i)];
    const u = (t / D) * Math.abs(laps) + ph, beat = (t / D) * (10 + i);
    const S = spine(where, u, 16, (L / 16) / (TAU * (rx + ry) / 2), (q) => 2 * q * q * Math.sin(TAU * (beat - q * 0.9)));
    for (let j = 0; j < S.length; j += 3) p.disc(S[j].x + 4, S[j].y + 5, 3.5 - j * 0.15, R.black[0], 0.3);
    drawKoi(g, S, L, R, robe(v, rng(o.seed, i, 7)), beat);
  }
  g.outline(R.black[0]);
  g.draw(p);
  // lily pads float over the fish, each with its notch
  const pg = new Grid(-104, -72, 208, 144);
  for (const [x, y, r] of PADS) {
    const a = rng(x, y).next() * TAU;
    pg.blob(x, y, r, r * 0.9, a, (nx, ny, nz, px, py, bu, bv) => (bu > 0.1 && Math.abs(bv) < bu * 0.35 ? 0 : Math.abs(Math.atan2(bv, bu) % 0.9) < 0.05 ? P[2] : lit(P, nx, ny, nz, px, py)));
  }
  pg.outline(P[0]);
  pg.draw(p);
  // glints drifting on the surface
  for (let i = 0; i < 18; i++) {
    const r = rng(o.seed, i, 5), x = r.range(-100, 100) + Math.sin((TAU * t) / D + i) * 6, y = r.range(-68, 68), tw = Math.sin((TAU * t) / D * 3 + r.range(0, TAU));
    if (tw > 0.6) p.dot(x, y, mix(hex(o.water[3]), hex("#ffffff"), 0.6), (tw - 0.6) * 2);
  }
}
