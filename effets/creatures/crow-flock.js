import { fit, rng, TAU } from "../../core/index.js";
import { Grid, shift, local, lit } from "./_lib.js";

export const meta = {
  name: "Crow Flock",
  desc: "A flock of crows seen from above circles overhead, each bird beating and gliding at its own pace, their shadows sweeping the ground below.",
  tags: ["creature", "bird", "crow", "flock", "flying", "top-down", "loop"],
  size: [176, 132],
  origin: [88, 66],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#030305", "#0e0e14", "#1a1a24", "#282836", "#3a3a4e", "#56566e", "#8a8aa6"], beak: "#6a6058", count: 7, seed: 1 },
};

const D = meta.duration, GRID = new Grid(-88, -66, 176, 132);

// one crow: body, head and beak, a fanned tail, wings with fingered primaries; open 0..1 how spread the wings are
function crow(g, C, beak, x, y, h, k, open) {
  const L = (f, s) => local(x, y, h, f * k, s * k), span = 15 * (0.45 + 0.55 * open);
  for (const s of [-1, 1]) {
    const tip = L(-2 - 3 * (1 - open), s * span), wr = L(1.5, s * span * 0.55);
    g.poly([L(2.5, s * 1.5), wr, L(0, s * span * 0.95), tip, L(-4.5, s * span * 0.7), L(-4, s * 1.5)], C[2]);
    g.line(...L(2.5, s * 1.5), ...wr, C[3]);
    g.line(...wr, ...L(0, s * span * 0.95), C[3]);
    // the primaries splay apart at the tip
    for (let j = 0; j < 3; j++) {
      const a = L(-1 - j * 1.4 - 2 * (1 - open), s * span * 0.85), b = L(-1.5 - j * 1.8 - 3 * (1 - open), s * (span + 1.5 - j * 0.6));
      g.line(a[0], a[1], b[0], b[1], C[2]);
    }
  }
  g.poly([L(-4, -1.4), L(-10, -3.2), L(-10.5, 0), L(-10, 3.2), L(-4, 1.4)], C[2]);
  g.blob(...L(-1, 0), 4.6 * k, 2.2 * k, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.15));
  g.blob(...L(4, 0), 2 * k, 1.7 * k, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.25));
  g.line(...L(5.5, 0), ...L(7.5, 0), beak);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), u = t / D, C = fit(o.palette, 7), g = GRID.clear(), r = rng(o.seed, 3);
  const n = Math.max(1, Math.min(14, Math.round(o.count))), birds = [];
  // each crow rides its own circle round a slowly drifting center, a whole number of laps a loop so it closes
  const cx = 10 * Math.sin(TAU * u), cy = 6 * Math.sin(2 * TAU * u);
  for (let i = 0; i < n; i++) {
    const R = r.range(18, 54), laps = r.next() < 0.3 ? 2 : 1, ph = r.range(0, TAU), wob = r.range(3, 8), k = r.range(0.7, 1.05);
    const beats = 2 * r.int(5, 9), glideAt = r.range(0, 1);
    const a = ph + TAU * laps * u, rr = R + wob * Math.sin(TAU * 2 * u + ph);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.72, h = Math.atan2(Math.cos(a) * 0.72, -Math.sin(a));
    // flaps in bursts, then glides with the wings spread
    const g0 = (u * 2 + glideAt) % 1, glide = Math.min(1, Math.max(0, Math.min(g0, 0.45 - g0) * 12)), open = glide + (1 - glide) * (0.5 + 0.5 * Math.cos(TAU * beats * u));
    birds.push({ x, y, h, k, open, z: k });
  }
  birds.sort((a, b) => a.z - b.z);
  for (const b of birds) p.ellipse(b.x + 10 * b.k, b.y + 14 * b.k, 8 * b.k * (0.5 + 0.5 * b.open), 3 * b.k, C[0], 0.25);
  // each crow outlined on its own, so overlapping birds stay apart
  for (const b of birds) {
    crow(g.clear(), C, fit([o.beak], 1)[0], b.x, b.y, b.h, b.k, b.open);
    g.outline(C[0]);
    g.draw(p);
  }
  for (const b of birds) p.dot(...local(b.x, b.y, b.h, 4.5 * b.k, 0), C[6], 0.7);
}
