import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, heading, pulse, TILT } from "./_lib.js";

export const meta = {
  name: "Scorpion",
  desc: "A scorpion seen from above crawls a loop, pincers held out, its segmented tail curled high over its back, then the stinger jabs forward with a drop of venom.",
  tags: ["creature", "scorpion", "boss", "walk", "sting", "poison", "top-down", "loop"],
  size: [160, 128],
  origin: [80, 64],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a0704", "#2a1a08", "#4a2e0e", "#6e4614", "#946020", "#ba8234", "#dcae5c"], venom: ["#40ff60", "#d0ffb0"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-80, -64, 160, 128);
const where = (u) => [34 * Math.cos(TAU * u), 22 * Math.sin(TAU * u)];
const STINGS = [0.2, 0.7];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), V = o.venom.map(hex), g = GRID.clear(), u = t / D;
  const [x, y] = where(u), h = heading(where, u), sting = Math.max(...STINGS.map((s) => pulse(u, s, s + 0.06)));
  p.ellipse(...local(x + 3, y + 4, h, -4, 0), 14, 9, C[0], 0.35);
  for (let k = 0; k < 4; k++)
    for (const s of [-1, 1]) {
      const hold = (uu) => {
        const [bx, by] = where(uu);
        return local(bx, by, heading(where, uu), 3 - k * 5, s * 15);
      };
      const [hx, hy] = local(x, y, h, 3 - k * 2.4, s * 4);
      leg(g, C, hx, hy, 4, foot(u, 12, ((k % 2) * 0.5 + (s > 0 ? 0.5 : 0)) % 1, 0.62, hold, 3), 7, 9, 0.8);
    }
  // pincers
  for (const s of [-1, 1]) {
    const [a1, b1] = local(x, y, h, 6, s * 3), [a2, b2] = local(x, y, h, 12, s * 9), [a3, b3] = local(x, y, h, 19, s * 8);
    g.tube([[a1, b1], [a2, b2], [a3, b3]], 1.4, C[4]);
    g.blob(...local(x, y, h, 22, s * 7.5), 4.5, 3, h + s * 0.2, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.1));
    const open = 0.25 + 0.15 * Math.sin(t * 4 + s);
    g.tube([local(x, y, h, 25, s * 7), local(x, y, h + s * open, 30, s * 6)], 0.8, C[5]);
    g.tube([local(x, y, h, 25, s * 9), local(x, y, h - s * open * 0.4, 30, s * 9)], 0.8, C[5]);
  }
  // body: head shield and seven back plates
  g.blob(...local(x, y, h, 3, 0), 5, 5, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py));
  g.blob(...local(x, y, h, -6, 0), 9, 6.5, h, (nx, ny, nz, px, py, bu) => (Math.sin(bu * 14) > 0.8 ? C[2] : lit(C, nx, ny, nz, px, py)));
  // the tail: rises from the back, arcs over, stinger forward; a jab straightens it out over the head
  const pts = [];
  for (let j = 0; j <= 7; j++) {
    // a vertical circle through the tail's root: back, up, then curled forward over the body
    const r = 8 + sting * 3, th = (j / 7) * Math.PI * (1.45 + sting * 0.3), fwd = -12 - r * Math.sin(th) + sting * (j / 7) * 6, z = r - r * Math.cos(th);
    const [px, py] = local(x, y, h, fwd, Math.sin(t * 3) * (j / 7) * 1.5);
    pts.push([px, py - z * TILT]);
  }
  for (let j = 0; j < pts.length; j++) g.blob(pts[j][0], pts[j][1], 3 - j * 0.2, 2.6 - j * 0.15, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.1));
  const [sx, sy] = pts[pts.length - 1], tip = local(sx, sy, h, 4, 0).map((v, i) => v + (i ? 2 : 0));
  g.tube([[sx, sy], tip], 1, C[1]);
  g.outline(C[0]);
  g.draw(p);
  if (sting > 0.2) p.glow(tip[0], tip[1], 5, V[0], 0.6 * sting), p.dot(tip[0], tip[1] + 1, V[1]);
}
