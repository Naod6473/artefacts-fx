import { fit, TAU } from "../../core/index.js";
import { Grid, shift, spine, body, along, lit } from "./_lib.js";

export const meta = {
  name: "Shark",
  desc: "A shark seen from above circles slow and steady, its long body swaying, pectoral fins spread, the dorsal fin catching the light, its shadow gliding beneath.",
  tags: ["creature", "shark", "sea", "fish", "danger", "swim", "top-down", "loop"],
  size: [192, 128],
  origin: [96, 64],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#05070a", "#161d26", "#243040", "#34465a", "#4a6078", "#66809a", "#90a8bc"], seed: 1 },
};

const D = meta.duration, LEN = 60, GRID = new Grid(-96, -64, 192, 128);
const where = (u) => [56 * Math.cos(TAU * u), 34 * Math.sin(TAU * u) + 5 * Math.sin(3 * TAU * u)];
const W = (v) => Math.max(0.8, 6.5 * Math.pow(Math.sin(Math.PI * Math.min(1, (v + 0.04) / 1.04)), 0.7) * (1 - 0.55 * v));

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), g = GRID.clear(), u = t / D, beat = (t / D) * 8;
  const S = spine(where, u, 18, LEN / 17 / 290, (v) => 2.4 * v * v * Math.sin(TAU * (beat - v * 0.8)));
  for (let j = 0; j < S.length; j += 2) p.disc(S[j].x + 6, S[j].y + 8, 4 - j * 0.18, C[0], 0.3);
  // tail: a crescent, the top lobe longer
  const [tx, ty, ta] = along(S, 0.97), sw = Math.sin(TAU * beat) * 0.35;
  for (const [s, l] of [[-1, 14], [1, 9]]) {
    const a = ta + Math.PI + s * 0.55 + sw;
    g.poly([[tx, ty], [tx + Math.cos(a) * l, ty + Math.sin(a) * l], [tx + Math.cos(a - s * 0.4) * l * 0.4, ty + Math.sin(a - s * 0.4) * l * 0.4]], C[3]);
  }
  // pectoral fins, swept back
  for (const s of [-1, 1]) {
    const [px, py, pa] = along(S, 0.3, s * 5), back = pa + Math.PI;
    g.poly([[px, py], [px + Math.cos(back + s * -0.9) * 16, py + Math.sin(back + s * -0.9) * 16], [px + Math.cos(back) * 8, py + Math.sin(back) * 8]], C[3]);
  }
  body(g, S, W, (v, w, nx, ny, nz, x, y) => lit(C, nx, ny, nz, x, y, v < 0.08 ? 1.05 : 1));
  // the dorsal fin: a lit wedge along the back
  const [dx, dy, da] = along(S, 0.38);
  g.poly([[dx + Math.cos(da) * 3, dy + Math.sin(da) * 3], [dx - Math.sin(da) * 1.5, dy + Math.cos(da) * 1.5], [dx - Math.cos(da) * 7, dy - Math.sin(da) * 7]], C[6]);
  g.outline(C[0]);
  g.draw(p);
  for (const s of [-1, 1]) p.dot(...along(S, 0.07, s * 3.6).slice(0, 2), C[0]);
}
