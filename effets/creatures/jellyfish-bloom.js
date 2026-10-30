import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, local, heading } from "./_lib.js";

export const meta = {
  name: "Pulsing Jellyfish",
  desc: "A moon jellyfish seen from above drifts round, its glassy bell pulsing, four pale rings at its heart and fine tentacles trailing behind each beat.",
  tags: ["creature", "jellyfish", "sea", "glow", "boss", "swim", "top-down", "loop"],
  size: [144, 112],
  origin: [72, 56],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c0a1c", "#3a3a7a", "#5a64b0", "#7c90d4", "#a4bcec", "#d4e6ff"], glow: ["#6a8cff", "#ff80d0"], seed: 1 },
};

const D = meta.duration, BEATS = 6, GRID = new Grid(-72, -56, 144, 112);
const path = (u) => [32 * Math.cos(TAU * u), 20 * Math.sin(TAU * u) + 4 * Math.sin(2 * TAU * u)];
const lap = (t) => {
  const q = (t / D) * BEATS, k = Math.floor(q), f = q - k;
  return (k + 1 - Math.pow(1 - f, 2)) / BEATS;
};

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 6), G = o.glow.map(hex), g = GRID.clear();
  const u = lap(t), [x, y] = path(u), h = heading(path, u), f = ((t / D) * BEATS) % 1;
  const squeeze = Math.exp(-f * 6) - 0.3 * Math.sin(f * Math.PI), R = 15 * (1 - 0.18 * squeeze);
  // tentacles: drifting lines left behind along its path
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU, pts = [];
    for (let j = 0; j < 8; j++) {
      const [bx, by] = path(lap(t - j * 0.08)), hb = heading(path, lap(t - j * 0.08));
      pts.push(local(bx, by, hb, Math.cos(a) * R * 0.95 - j * 1.5, Math.sin(a) * R * 0.95 + Math.sin(j * 0.9 + t * 3 + i) * 1.2));
    }
    g.tube(pts, 0, C[3], 0.35);
  }
  // the bell: translucent, a fluted rim, four horseshoe gonads and a glow
  g.blob(x, y, R, R, h, (nx, ny, nz, px, py, bu, bv) => {
    const r = Math.hypot(bu, bv), ang = Math.atan2(bv, bu);
    if (r > 0.88) return Math.sin(ang * 16) > 0 ? C[4] : C[3];
    for (let q = 0; q < 4; q++) {
      const ca = ang - (q / 4) * TAU - Math.PI / 4, cx = Math.cos(q * Math.PI / 2 + Math.PI / 4) * 0.35, cy = Math.sin(q * Math.PI / 2 + Math.PI / 4) * 0.35;
      const d = Math.hypot(bu - cx, bv - cy);
      if (Math.abs(d - 0.18) < 0.06 && Math.cos(ca) > -0.7) return C[5];
    }
    return lit(C, nx, ny, nz, px, py, 0.9);
  }, 0.75);
  g.draw(p);
  p.glow(x, y, R * 1.6, G[0], 0.25 + 0.2 * squeeze);
  p.glow(x, y, 4, G[1], 0.3);
  p.ring(x, y, R, 1, C[5], 0.4);
}
