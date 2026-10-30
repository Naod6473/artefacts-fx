import { fit, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, TILT } from "./_lib.js";

export const meta = {
  name: "Harvestman",
  desc: "A harvestman seen from above stalks in a slow circle on eight huge stilt legs, its little round body riding high over its own shadow.",
  tags: ["creature", "spider", "harvestman", "boss", "walk", "top-down", "loop"],
  size: [192, 144],
  origin: [96, 76],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#08070a", "#1e1813", "#382a1e", "#56402a", "#7c5c3a", "#a8824e", "#d2b070"], seed: 1 },
};

const D = meta.duration, HZ = 22, GRID = new Grid(-96, -76, 192, 144);
const LEGS = [];
[[0.62, 1.0], [1.2, 1.3], [1.95, 1.05], [2.6, 1.15]].forEach(([a, len], i) =>
  [-1, 1].forEach((s) => LEGS.push({ s, a: s * a, len, off: ((i % 2 ? 0.5 : 0) + (s > 0 ? 0.5 : 0)) % 1 })));
const where = (u) => [20 * Math.cos(TAU * u), 12 * Math.sin(TAU * u)];
const head = (u) => TAU * u + Math.PI / 2;

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), g = GRID.clear(), u = t / D;
  const [x, y] = where(u), h = head(u), bob = 1.5 * Math.sin(TAU * u * 12) ** 2, z = HZ + bob;
  // the shadow of the body falls far below it
  p.ellipse(x + 8, y + 10, 5, 4, C[0], 0.4);
  const hold = (L) => (uu) => {
    const [bx, by] = where(uu), hh = head(uu);
    return [bx + Math.cos(hh + L.a) * 46 * L.len, by + Math.sin(hh + L.a) * 46 * L.len];
  };
  const feet = [];
  for (const L of LEGS) {
    const hx = x + Math.cos(h + L.a * 0.9) * 3, hy = y + Math.sin(h + L.a * 0.9) * 3;
    const f = foot(u, 6, L.off, 0.72, hold(L), 9);
    feet.push(leg(g, C, hx, hy, z, f, 26 * L.len, 30 * L.len, 0.8));
  }
  // the body: one round bead, two eyes on a turret
  const by = y - z * TILT;
  g.blob(x, by, 5, 4.2, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.15));
  g.outline(C[0]);
  g.draw(p);
  const ex = x + Math.cos(h) * 1.5, ey = by + Math.sin(h) * 1.5;
  p.dot(ex - Math.sin(h), ey + Math.cos(h), C[0]);
  p.dot(ex + Math.sin(h), ey - Math.cos(h), C[0]);
  // a mote of dust where a foot comes down
  for (const [fx, fy] of feet) p.dot(fx, fy + 1, C[3], 0.5);
}
