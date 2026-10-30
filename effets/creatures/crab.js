import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, pulse } from "./_lib.js";

export const meta = {
  name: "Sidestep Crab",
  desc: "A crab seen from above scuttles sideways back and forth on eight legs, eyes up on stalks, snapping its big claws with a spark at each pinch.",
  tags: ["creature", "crab", "boss", "walk", "claws", "top-down", "loop"],
  size: [160, 104],
  origin: [80, 56],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0d0505", "#3a0f0a", "#651a10", "#922a16", "#bf4220", "#e26a34", "#f8a466"], spark: ["#fff4c0", "#ffc040"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-80, -56, 160, 104);
// sideways there and back, a little sway; it always faces up the screen
const where = (u) => [34 * Math.sin(TAU * u), 3 * Math.sin(2 * TAU * u)];
const H = -Math.PI / 2;

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), Sp = o.spark.map(hex), g = GRID.clear(), u = t / D;
  const [x, y] = where(u), tilt = 0.12 * Math.cos(TAU * u), h = H + tilt;
  p.ellipse(x + 3, y + 5, 16, 10, C[0], 0.35);
  // four walking legs a side, reaching out sideways
  for (let k = 0; k < 4; k++)
    for (const s of [-1, 1]) {
      const hold = (uu) => {
        const [bx, by] = where(uu);
        return local(bx, by, H, 4 - k * 4.5, s * (25 + (k === 1 || k === 2 ? 3 : 0)));
      };
      const [hx, hy] = local(x, y, h, 3 - k * 2.6, s * 10);
      leg(g, C, hx, hy, 6, foot(u, 8, ((k % 2) * 0.5 + (s > 0 ? 0.5 : 0) + k * 0.12) % 1, 0.6, hold, 4), 9, 11, 1.3);
    }
  // claws: an arm forward, a heavy pincer that opens and snaps shut twice a lap
  const snaps = [];
  for (const s of [-1, 1]) {
    const ph = (u * 2 + (s > 0 ? 0.5 : 0)) % 1, open = pulse(ph, 0.0, 0.35), shut = ph > 0.35 && ph < 0.42;
    if (shut) snaps.push(s);
    const [ax, ay] = local(x, y, h, 6, s * 7), [bx, by] = local(x, y, h, 13, s * 13);
    g.tube([[ax, ay], [bx, by]], 2, C[4]);
    const [cx, cy] = local(x, y, h, 18, s * 13.5);
    g.blob(cx, cy, 7.5, 5.5, h - s * 0.25, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.1));
    const [fx, fy] = local(x, y, h, 25, s * 12), ja = h + s * (0.15 + open * 0.8);
    g.tube([[fx, fy], [fx + Math.cos(h) * 7, fy + Math.sin(h) * 7]], 2, C[5]);
    g.tube([[fx - Math.sin(h) * s * 3, fy + Math.cos(h) * s * 3], [fx - Math.sin(h) * s * 3 + Math.cos(ja) * 6, fy + Math.cos(h) * s * 3 + Math.sin(ja) * 7]], 1.6, C[3]);
  }
  // the shell: wide, bumpy, a darker rim at the back
  g.blob(x, y, 11, 16, h, (nx, ny, nz, px, py, bu, bv) => {
    const bump = Math.sin(bu * 9) * Math.sin(bv * 7) > 0.6;
    return bu < -0.75 ? C[2] : lit(C, nx, ny, nz, px, py, bump ? 1.25 : 1);
  });
  // eyes on stalks
  for (const s of [-1, 1]) {
    const [ex, ey] = local(x, y, h, 11 + Math.sin(t * 3 + s) * 0.6, s * 4);
    g.tube([local(x, y, h, 9, s * 3), [ex, ey]], 0.6, C[3]);
    g.blob(ex, ey, 1.5, 1.5, 0, C[1]);
  }
  g.outline(C[0]);
  g.draw(p);
  for (const s of snaps) {
    const [sx, sy] = local(x, y, h, 30, s * 12);
    p.glow(sx, sy, 6, Sp[1], 0.6);
    for (let i = 0; i < 4; i++) p.dot(sx + Math.cos(i * 1.6 + s) * 3, sy + Math.sin(i * 1.6 + s) * 3, Sp[0]);
  }
}
