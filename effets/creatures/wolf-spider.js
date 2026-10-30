import { fit, hex, rng, cycle, clamp, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, heading } from "./_lib.js";

export const meta = {
  name: "Wolf Spider",
  desc: "A hairy wolf spider seen from above prowls a loop with her brood riding on her back; spiderlings keep dropping off and scattering away.",
  tags: ["creature", "spider", "swarm", "boss", "walk", "spawn", "top-down", "loop"],
  size: [176, 128],
  origin: [88, 64],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#070605", "#1e1710", "#342818", "#4c3a22", "#6a5232", "#8e7048", "#b89a6a"], eyes: ["#40ffd0"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-88, -64, 176, 128);
const LEGS = [];
[[0.55, 0.9, 0], [1.12, 1.0, 0.5], [1.95, 0.95, 0], [2.55, 1.05, 0.5]].forEach(([a, len, off]) =>
  [-1, 1].forEach((s) => LEGS.push({ s, hip: s * a * 0.7, rest: s * a, reach: 26 * len, off: (off + (s > 0 ? 0.5 : 0)) % 1 })));
const where = (u) => [38 * Math.cos(TAU * u), 22 * Math.sin(TAU * u) - 6 * Math.sin(2 * TAU * u)];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), E = hex(o.eyes[0]), g = GRID.clear(), u = t / D;
  const [x, y] = where(u), h = heading(where, u), fur = (px, py) => rng(Math.floor(px) * 7 + Math.floor(py) * 131, o.seed).next() > 0.8;
  // spiderlings that dropped off earlier, scurrying away from where she was
  cycle(t, D, 20, o.seed * 13 + 5, 1.6, (age, L, r) => {
    const tb = t - age, ub = tb / D, [bx, by] = where(ub), a = r.range(0, TAU), v = r.range(16, 28);
    const d = v * age, sx = bx + Math.cos(a) * d + Math.sin(age * 20) * 0.6, sy = by + Math.sin(a) * d;
    const fade = clamp((L - age) / 0.4);
    for (const k of [-1, 1]) p.dot(sx + Math.cos(a + k * 1.6) * 1.5, sy + Math.sin(a + k * 1.6) * 1.5, C[3], fade);
    p.dot(sx, sy, C[6], fade), p.dot(sx - Math.cos(a), sy - Math.sin(a), C[4], fade);
  });
  const hipAt = (L, uu) => {
    const [bx, by] = where(uu), hh = heading(where, uu);
    return [bx + Math.cos(hh + L.hip) * 4, by + Math.sin(hh + L.hip) * 4, hh];
  };
  const [ax, ay] = local(x, y, h, -11, 0);
  p.ellipse(ax + 3, ay + 4, 12, 10, C[0], 0.35);
  for (const L of LEGS) {
    const [hx, hy] = hipAt(L, u), hold = (uu) => {
      const [qx, qy, qh] = hipAt(L, uu);
      return [qx + Math.cos(qh + L.rest) * L.reach, qy + Math.sin(qh + L.rest) * L.reach];
    };
    leg(g, C, hx, hy, 6, foot(u, 14, L.off, 0.6, hold, 4), 14, 16, 1.5, C[2]);
  }
  // abdomen crowded with spiderlings, a striped carapace
  g.blob(ax, ay, 10, 8.5, h, (nx, ny, nz, px, py) => (fur(px, py) ? C[2] : lit(C, nx, ny, nz, px, py)));
  g.blob(x, y, 7, 6, h, (nx, ny, nz, px, py, bu, bv) => (Math.abs(bv) < 0.25 ? C[5] : fur(px, py) ? C[2] : lit(C, nx, ny, nz, px, py, 0.9)));
  g.outline(C[0]);
  g.draw(p);
  for (let i = 0; i < 9; i++) {
    const r = rng(o.seed, i, 77), [bx, by] = local(ax, ay, h, r.range(-6, 6), r.range(-5, 5));
    p.dot(bx, by, Math.sin(t * 6 + i) > 0 ? C[6] : C[4]);
  }
  for (const s of [-1, 1]) p.dot(...local(x, y, h, 4.5, s * 1.5), E), p.glow(...local(x, y, h, 4.5, s * 1.5), 2.5, E, 0.4);
}
