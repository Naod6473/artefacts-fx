import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, local, pulse, knee, TILT } from "./_lib.js";

export const meta = {
  name: "Praying Mantis",
  desc: "A praying mantis seen from above sways in wait, head turning, then its folded forelegs shoot out in a lightning strike and snap back.",
  tags: ["creature", "mantis", "insect", "boss", "strike", "top-down", "loop"],
  size: [128, 144],
  origin: [64, 80],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#060a05", "#13240e", "#1f3e16", "#2f5c1e", "#467e28", "#68a43a", "#9ccc5c"], flash: ["#ffffff", "#c8ff80"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-64, -80, 128, 144), H = -Math.PI / 2;
const STRIKES = [0.42, 0.82];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), F = o.flash.map(hex), g = GRID.clear(), u = t / D;
  const sway = Math.sin(TAU * u * 2) * 0.06, h = H + sway, x = Math.sin(TAU * u * 2) * 1.5, y = 0;
  const strike = Math.max(...STRIKES.map((s) => pulse(u, s - 0.01, s + 0.07))), look = Math.sin(TAU * u * 3) * 0.35;
  p.ellipse(x + 3, y + 10, 8, 22, C[0], 0.3);
  // four walking legs, splayed, planted
  for (const [f, s, fx, fs] of [[-2, -1, -4, -22], [-2, 1, -4, 22], [-4, -1, -24, -20], [-4, 1, -24, 20]]) {
    const [hx, hy] = local(x, y, h, f, s * 2.5), [ftx, fty] = local(0, 0, H, fx, fs);
    const [kx, ky, kz] = knee(hx, hy, 5, ftx, fty, 0, 12, 14);
    g.tube([[hx, hy - 5 * TILT], [kx, ky - kz * TILT], [ftx, fty]], 0.6, C[3]);
  }
  // abdomen under folded wings, long thin prothorax, then the raptorial forelegs
  const [ax, ay] = local(x, y, h, -16, 0);
  g.blob(ax, ay, 16, 6.5, h, (nx, ny, nz, px, py, bu, bv) => (Math.abs(bv) < 0.08 && bu > -0.6 ? C[3] : lit(C, nx, ny, nz, px, py, 1.15)));
  const [px0, py0] = local(x, y, h, 0, 0), [hx, hy] = local(x, y, h, 15, 0);
  g.tube([[px0, py0], [hx, hy]], 1.8, (v, px, py) => C[v < 0.3 ? 4 : 5]);
  for (const s of [-1, 1]) {
    const [sx, sy] = local(x, y, h, 12, s * 2);
    // folded: femur forward-out, tibia folded back; striking: both straight out ahead
    const reach = strike, fa = h + s * (0.5 - reach * 0.4), fl = 11 + reach * 3, ta = fa + s * (2.6 - reach * 2.5);
    const [ex, ey] = [sx + Math.cos(fa) * fl, sy + Math.sin(fa) * fl], [tx, ty] = [ex + Math.cos(ta) * (9 + reach * 4), ey + Math.sin(ta) * (9 + reach * 4)];
    g.tube([[sx, sy], [ex, ey]], 1.6, C[5]);
    g.tube([[ex, ey], [tx, ty]], 1, C[4]);
    for (let j = 1; j < 4; j++) g.set(ex + (tx - ex) * j / 4 - Math.sin(ta) * s, ey + (ty - ey) * j / 4 + Math.cos(ta) * s, C[6]);
  }
  // the triangular head, turning to look
  const ha = h + look * (1 - strike), [qx, qy] = local(hx, hy, ha, 2.5, 0);
  g.poly([local(qx, qy, ha, 3.5, 0), local(qx, qy, ha, -2, -5), local(qx, qy, ha, -2, 5)], (px, py) => C[5]);
  g.outline(C[0]);
  g.draw(p);
  for (const s of [-1, 1]) p.dot(...local(qx, qy, ha, -1.5, s * 4), C[6]);
  if (strike > 0.6) {
    const [fx, fy] = local(x, y, h, 36, 0);
    p.glow(fx, fy, 10, F[1], 0.5 * strike);
    p.line(...local(fx, fy, h, 0, -10), ...local(fx, fy, h, 3, 10), F[0], strike * 0.8);
  }
}
