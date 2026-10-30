import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, local, pulse } from "./_lib.js";

export const meta = {
  name: "Hydra",
  desc: "A many-headed hydra seen from above sways its necks over a heavy body; the middle neck forks in two, and one head after another lunges to bite.",
  tags: ["creature", "hydra", "serpent", "dragon", "boss", "bite", "top-down", "loop"],
  size: [160, 128],
  origin: [80, 84],
  duration: 5,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#05090a", "#0e2422", "#163a34", "#22544a", "#337062", "#4e9480", "#80c0a4"], eyes: ["#ffe040", "#ff7020"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-80, -84, 160, 128);
// the necks: their angle from straight ahead, length, and when they bite; the middle one forks at its end
const NECKS = [
  { a: -0.95, len: 40, bite: 0.05 },
  { a: -0.45, len: 46, bite: 0.45 },
  { a: 0, len: 34, bite: -1, fork: [{ a: -0.32, len: 16, bite: 0.25 }, { a: 0.32, len: 16, bite: 0.65 }] },
  { a: 0.45, len: 46, bite: 0.85 },
  { a: 0.95, len: 40, bite: 0.55 },
];

function neck(x, y, a, len, t, i, n = 7) {
  const pts = [];
  for (let j = 0; j <= n; j++) {
    const v = j / n, w = Math.sin(TAU * (t / D) * 2 - v * 2.5 + i * 1.3) * 0.35 * v;
    pts.push([x + Math.cos(a + w) * len * v, y + Math.sin(a + w) * len * v]);
  }
  return pts;
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), E = o.eyes.map(hex), g = GRID.clear();
  const breath = Math.sin((TAU * t) / D * 2) * 0.6, H = -Math.PI / 2, x = 0, y = 0;
  p.ellipse(4, 6, 20, 16, C[0], 0.35);
  const heads = [];
  const lay = (bx, by, N, i) => {
    const b = N.bite < 0 ? 0 : pulse((t / D - N.bite + 1) % 1, 0, 0.16), a = H + N.a;
    const pts = neck(bx, by, a, N.len * (1 + b * 0.35), t, i);
    g.tube(pts, (v) => 3.6 - v * 1.2, (v, px, py) => (v > 0.15 && Math.sin(v * 30) > 0.7 ? C[5] : C[4]));
    const [ex, ey] = pts[pts.length - 1], [qx, qy] = pts[pts.length - 2];
    if (N.fork) N.fork.forEach((F, k) => lay(ex, ey, { ...F, a: N.a + F.a }, i + k + 5));
    else heads.push({ x: ex, y: ey, a: Math.atan2(ey - qy, ex - qx), b });
  };
  // stubby legs, tail, body
  for (const [f, s] of [[8, -1], [8, 1], [-10, -1], [-10, 1]]) g.blob(...local(x, y, H, f, s * 15), 4, 3, H + s * 0.6, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 0.8));
  g.tube([[0, 14], [Math.sin(TAU * t / D) * 6, 26], [Math.sin(TAU * t / D - 1) * 10, 36]], (v) => 4 - v * 3.5, C[3]);
  NECKS.forEach((N, i) => lay(...local(x, y, H, 8, N.a * 9), N, i));
  g.blob(x, y, 15 + breath, 18 + breath, H, (nx, ny, nz, px, py, bu, bv) => (Math.abs(bv) < 0.12 && Math.sin(bu * 18) > 0 ? C[5] : lit(C, nx, ny, nz, px, py)));
  // heads: a wedge with jaws that open as it lunges
  for (const hd of heads) {
    const jaw = hd.b * 0.6;
    for (const s of [-1, 1]) g.tube([[hd.x, hd.y], local(hd.x, hd.y, hd.a + s * jaw, 7, s * 1.5)], 1.6, C[s < 0 ? 5 : 4]);
    g.blob(...local(hd.x, hd.y, hd.a, 1, 0), 4.5, 3.6, hd.a, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.1));
  }
  g.outline(C[0]);
  g.draw(p);
  for (const hd of heads) {
    for (const s of [-1, 1]) p.dot(...local(hd.x, hd.y, hd.a, 2, s * 2.2), E[0]);
    if (hd.b > 0.3) p.glow(...local(hd.x, hd.y, hd.a, 7, 0), 5, E[1], 0.4 * hd.b);
  }
}
