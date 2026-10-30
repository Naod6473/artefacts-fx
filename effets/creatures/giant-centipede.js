import { fit, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, spine } from "./_lib.js";

export const meta = {
  name: "Giant Centipede",
  desc: "A giant centipede seen from above weaves along a looping track, a wave of forty legs rippling down its plated body, antennae feeling ahead, fangs twitching.",
  tags: ["creature", "centipede", "worm", "boss", "walk", "top-down", "loop"],
  size: [176, 128],
  origin: [88, 64],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0b0605", "#2c120b", "#521f10", "#7e3115", "#ab4a1c", "#d4702c", "#f2a050"], legs: ["#120c04", "#4a3412", "#8a6420", "#cfa040", "#f0d070"], seed: 1 },
};

const D = meta.duration, SEG = 19, DU = 0.0185, GRID = new Grid(-88, -64, 176, 128);
const where = (u) => {
  const a = TAU * u, r = 1 + 0.18 * Math.sin(3 * a);
  return [54 * r * Math.cos(a), 34 * r * Math.sin(a)];
};

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), L = fit(o.legs, 5), g = GRID.clear(), u = t / D;
  const S = spine(where, u, SEG, DU);
  for (const s of S) p.disc(s.x + 2, s.y + 3, 3, C[0], 0.3);
  // legs: one pair a segment, a wave running from tail to head
  for (let i = 1; i < SEG - 1; i++)
    for (const side of [-1, 1]) {
      const off = (i * 0.085 + (side > 0 ? 0.5 : 0)) % 1;
      const hold = (uu) => {
        const [x, y] = where(uu - i * DU), [x2, y2] = where(uu - i * DU + 0.002), a = Math.atan2(y2 - y, x2 - x);
        return local(x, y, a, -2, side * 11);
      };
      const [hx, hy] = local(S[i].x, S[i].y, S[i].a, 0, side * 3);
      leg(g, L, hx, hy, 3, foot(u, 42, off, 0.55, hold, 2.5), 5, 7, 0.6);
    }
  // tail spurs, swept back
  const Tl = S[SEG - 1];
  for (const s of [-1, 1]) {
    const [a, b] = local(Tl.x, Tl.y, Tl.a, -1, s * 2), [c, d] = local(Tl.x, Tl.y, Tl.a + s * 0.35 + Math.sin(t * 5) * 0.08, -12, s * 5);
    g.tube([[a, b], [c, d]], (v) => 1.2 - v, L[3]);
  }
  // plates, tail to head, each with a dark seam at its back
  for (let i = SEG - 1; i >= 0; i--) {
    const s = S[i], w = i === 0 ? 4.6 : 4.2 - (i / SEG) * 1.4;
    g.blob(s.x, s.y, 3.4, w, s.a, (nx, ny, nz, x, y, bu) => (bu < -0.7 ? C[2] : lit(C, nx, ny, nz, x, y, i === 0 ? 0.8 : 1)));
  }
  // antennae and fangs
  const H = S[0];
  for (const s of [-1, 1]) {
    const pts = [];
    for (let j = 0; j <= 6; j++) pts.push(local(H.x, H.y, H.a + s * (0.35 + 0.05 * j) + Math.sin(t * 6 + j * 0.6 + s) * 0.06 * j, 3 + j * 2.6, s * (1.5 + j * 0.3)));
    g.tube(pts, 0, L[2]);
    const [fx, fy] = local(H.x, H.y, H.a, 4, s * 2.4), [gx, gy] = local(H.x, H.y, H.a - s * (0.5 + 0.2 * Math.sin(t * 9)), 7.5, s * 1);
    g.tube([[fx, fy], [gx, gy]], 0.6, L[1]);
  }
  g.outline(C[0]);
  g.draw(p);
}
