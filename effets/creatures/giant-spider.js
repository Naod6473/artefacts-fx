import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, heading } from "./_lib.js";

export const meta = {
  name: "Giant Spider",
  desc: "A giant spider seen from above walks a figure-eight on eight jointed legs, four planted while four swing, its red eyes glowing ahead of a patterned abdomen.",
  tags: ["creature", "spider", "boss", "walk", "top-down", "loop"],
  size: [176, 132],
  origin: [88, 66],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#07060a", "#1a1218", "#2c1f27", "#432f38", "#5e4450", "#82606a", "#b08a8c"], eyes: ["#ff3b30", "#ffc070"], seed: 1 },
};

const D = meta.duration, N = 11, GRID = new Grid(-88, -66, 176, 132);
// the legs, front to back: angle of the hip and of the resting foot from the heading, reach, phase
const LEGS = [];
[[0.55, 1.0, 0], [1.12, 1.12, 0.5], [1.95, 1.0, 0], [2.55, 1.08, 0.5]].forEach(([a, len, off], i) =>
  [-1, 1].forEach((s) => LEGS.push({ i, s, hip: s * a * 0.7, rest: s * a, reach: 33 * len, off: (off + (s > 0 ? 0.5 : 0)) % 1 })));

// a figure-eight, a little faster on the straights
const where = (u) => [40 * Math.sin(TAU * u), 20 * Math.sin(2 * TAU * u)];
const lap = (t) => t / D + 0.012 * Math.sin((2 * TAU * t) / D);

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), E = o.eyes.map(hex), g = GRID.clear();
  const u = lap(t), [x, y] = where(u), h = heading(where, u);
  const hipAt = (L, uu) => {
    const [bx, by] = where(uu), hh = heading(where, uu);
    return [bx + Math.cos(hh + L.hip) * 4.5, by + Math.sin(hh + L.hip) * 4.5, hh];
  };
  const hold = (L) => (uu) => {
    const [hx, hy, hh] = hipAt(L, uu);
    return [hx + Math.cos(hh + L.rest) * L.reach, hy + Math.sin(hh + L.rest) * L.reach];
  };
  // shadows on the ground: the body and a hint of each leg's reach
  const [ax, ay] = local(x, y, h, -13, 0);
  p.ellipse(x + 3, y + 5, 8, 7, C[0], 0.35);
  p.ellipse(ax + 3, ay + 5, 12, 11, C[0], 0.35);
  // legs under the body
  for (const L of LEGS) {
    const [hx, hy] = hipAt(L, u), f = foot(u, N, L.off, 0.62, hold(L), 6);
    leg(g, C, hx, hy, 8, f, 18, 21, 1.2);
  }
  // abdomen: a ribbed egg with a pale chevron down the back
  g.blob(ax, ay, 12, 10, h, (nx, ny, nz, px, py, bu, bv) => {
    const chev = Math.abs(Math.abs(bv) * 0.9 + bu * 0.8 - 0.1 - Math.round((Math.abs(bv) * 0.9 + bu * 0.8 - 0.1) / 0.55) * 0.55) < 0.09 && Math.abs(bv) < 0.55;
    return chev ? lit(C, nx, ny, nz, px, py, 1.5) : lit(C, nx, ny, nz, px, py, 0.9);
  });
  // waist, head and thorax, two palps and the fangs
  const [wx, wy] = local(x, y, h, -6, 0);
  g.blob(wx, wy, 2.5, 2, h, C[2]);
  g.blob(x, y, 7.5, 6.5, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.1));
  for (const s of [-1, 1]) {
    const [px0, py0] = local(x, y, h, 6, s * 2.5), [px1, py1] = local(x, y, h, 10.5 + Math.sin(t * 7 + s) * 0.8, s * 3.5);
    g.tube([[px0, py0], [px1, py1]], 1, C[4]);
    const [fx, fy] = local(x, y, h, 7.5, s * 1);
    g.set(fx, fy, C[1]);
  }
  g.outline(C[0]);
  g.draw(p);
  // the eyes: two big ones in front, four small behind, glowing
  for (const [f, s, big] of [[4.6, -1.2, 1], [4.6, 1.2, 1], [3.2, -2.6, 0], [3.2, 2.6, 0], [2.4, -1.1, 0], [2.4, 1.1, 0]]) {
    const [ex, ey] = local(x, y, h, f, s);
    p.dot(ex, ey, big ? E[1] : E[0]);
    p.glow(ex, ey, big ? 3.5 : 2, E[0], big ? 0.5 : 0.3);
  }
}
