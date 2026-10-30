import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, spine, body, along, lit, pulse } from "./_lib.js";

export const meta = {
  name: "Giant Python",
  desc: "A giant python seen from above slithers a figure-eight, waves running down its blotched body, its head swaying and its forked tongue flicking.",
  tags: ["creature", "snake", "reptile", "boss", "slither", "top-down", "loop"],
  size: [176, 132],
  origin: [88, 66],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#0a0b06", "#2a2a12", "#4a4620", "#6e6630", "#968a44", "#bcae62", "#e0d494"],
    spots: ["#120c06", "#2e1e0e", "#4a3018", "#664424"],
    tongue: "#e8304a",
    seed: 1,
  },
};

const D = meta.duration, N = 40, DU = 0.0115, WAVES = 9, GRID = new Grid(-88, -66, 176, 132);
// a wide figure-eight; the body follows its own track, so the slither is a wave fixed on the ground
const path = (u) => [52 * Math.sin(TAU * u), 30 * Math.sin(2 * TAU * u)];
const width = (v) => (v < 0.05 ? 4.6 : v < 0.1 ? 3.6 + (v - 0.05) * 12 : 6.2 * Math.pow(Math.sin(Math.PI * Math.min(1, (v + 0.02) / 1.02)), 0.6) * (1 - 0.45 * v) + 0.3);

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), u = t / D, g = GRID.clear();
  const C = fit(o.palette, 7), B = fit(o.spots, 4), red = hex(o.tongue);
  // the lateral wave of point i depends on where it is on the track, not on time: every point passes the same bends
  const S = spine(path, u, N, DU, (v) => 5 * Math.sin(TAU * WAVES * (u - v * (N - 1) * DU)) * Math.min(1, v * 6 + 0.25));
  for (let i = 0; i < N; i += 2) p.disc(S[i].x + 3, S[i].y + 4, width(i / (N - 1)) * 0.9, C[0], 0.3);
  // blotches down the back: dark saddles ringed in pale scales, a row of spots low on each flank
  body(g, S, width, (v, w, nx, ny, nz, x, y) => {
    const f = (v * 15 + 0.3) % 1, aw = Math.abs(w);
    const saddle = v > 0.08 && aw < 0.62 - 0.25 * Math.abs(f - 0.5) * 2 && Math.abs(f - 0.5) < 0.28;
    const rim = v > 0.08 && !saddle && aw < 0.72 && Math.abs(f - 0.5) < 0.36;
    const flank = v > 0.1 && aw > 0.72 && aw < 0.9 && ((v * 15 + 0.8) % 1) < 0.3;
    if (saddle || flank) return lit(B, nx, ny, nz, x, y, 1.2);
    return lit(C, nx, ny, nz, x, y, rim ? 1.25 : 0.95);
  });
  // the head: wedge-shaped, swaying a little ahead of the neck
  const sway = 0.25 * Math.sin(TAU * u * 5), ha = S[0].a + sway;
  const hx = S[0].x + Math.cos(ha) * 4, hy = S[0].y + Math.sin(ha) * 4;
  g.blob(hx, hy, 6.5, 4.4, ha, (nx, ny, nz, x, y, bu, bv) => (bu > 0.2 && Math.abs(bv) < 0.25 ? lit(B, nx, ny, nz, x, y, 1.2) : lit(C, nx, ny, nz, x, y, 1.05)));
  // the tongue, in bursts: out, forked, flicking
  const lick = pulse((u * 4) % 1, 0.1, 0.45), tl = 8 * lick;
  if (tl > 1) {
    const tx = hx + Math.cos(ha) * 6, ty = hy + Math.sin(ha) * 6, wob = Math.sin(t * 40) * 0.5;
    const ex = tx + Math.cos(ha + wob * 0.2) * tl, ey = ty + Math.sin(ha + wob * 0.2) * tl;
    g.line(tx, ty, ex, ey, red);
    for (const s of [-1, 1]) g.line(ex, ey, ex + Math.cos(ha + s * 0.6) * 2.5, ey + Math.sin(ha + s * 0.6) * 2.5, red);
  }
  g.outline(C[0]);
  g.draw(p);
  // eyes, and light sliding along the scales
  for (const s of [-1, 1]) {
    const ex = hx + Math.cos(ha) * 2.5 - Math.sin(ha) * s * 3, ey = hy + Math.sin(ha) * 2.5 + Math.cos(ha) * s * 3;
    p.dot(ex, ey, C[6]);
  }
  for (let j = 0; j < 3; j++) {
    const v = ((t * 0.18 + j / 3) % 1) * 0.85 + 0.1, [x, y] = along(S, v, -width(v) * 0.4);
    p.dot(x, y, C[6], 0.6 * pulse(v, 0.1, 0.95));
  }
}
