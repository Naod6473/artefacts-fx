import { fit, hex, rng, clamp, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, heading, ease } from "./_lib.js";

export const meta = {
  name: "Swelling Tick",
  desc: "A tick seen from above scuttles round, latches on and swells, its body ballooning grey-violet and throbbing, until it bursts in a spray of red and starts again.",
  tags: ["creature", "tick", "bug", "boss", "swell", "burst", "top-down", "loop"],
  size: [144, 112],
  origin: [72, 56],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a0708", "#2a1814", "#4a2a1e", "#6e3e28", "#94583a", "#bd7c52", "#e0a878"], full: ["#0a0708", "#241a2c", "#3a2c48", "#54446a", "#6e5e88", "#8e80a6", "#b4aac6"], blood: ["#4a0408", "#b01420", "#ff4040", "#ffb0a0"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-72, -56, 144, 112);
const where = (u) => [30 * Math.cos(TAU * u), 18 * Math.sin(TAU * u)];
// walk, then stop to feed and swell, burst at BURST, walk again
const W0 = 2.4, BURST = 5.0, W1 = 5.4;
const lap = (t) => (Math.min(t, W0) + Math.max(0, t - W1)) / (W0 + D - W1);

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), F = fit(o.full, 7), B = o.blood.map(hex), g = GRID.clear();
  const u = lap(t), [x, y] = where(u), h = heading(where, u);
  const fill = t < W0 ? 0 : t < BURST ? ease(clamp((t - W0) / (BURST - W0 - 0.3))) : 0;
  const throb = t > W0 && t < BURST ? Math.sin(t * 14) * 0.5 * fill : 0, R = 7 + fill * 8 + throb;
  const pop = t - BURST;
  // legs at the front half; they stop while it feeds
  const hold = (side, k) => (uu) => {
    const [bx, by] = where(uu), hh = heading(where, uu);
    return local(bx, by, hh, 7 - k * 3.5, side * (11 + k));
  };
  p.ellipse(x + 3, y + 4, R * 0.9, R * 0.75, C[0], 0.35);
  for (let k = 0; k < 4; k++)
    for (const s of [-1, 1]) {
      const [hx, hy] = local(x, y, h, 5 - k * 1.6, s * 2.5);
      leg(g, C, hx, hy, 3, foot(u, 14, ((k % 2) * 0.5 + (s > 0 ? 0.5 : 0)) % 1, 0.6, hold(s, k), 3), 6, 7, 0.8);
    }
  // the body: a flat shield that balloons into a grey-violet bag
  const [ax, ay] = local(x, y, h, -R * 0.55 + 2, 0);
  g.blob(ax, ay, R, R * 0.85, h, (nx, ny, nz, px, py, bu, bv) => {
    const scutum = fill < 0.4 && bu > 0.2 - fill;
    const k = fill > 0.05 && !scutum ? 1 + throb * 0.1 : 1;
    return lit(scutum || fill < 0.05 ? C : F, nx, ny, nz, px, py, k);
  });
  // shield plate and mouthparts
  g.blob(...local(x, y, h, 3.5, 0), 3.2, 3, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 0.8));
  g.blob(...local(x, y, h, 7, 0), 1.6, 1, h, C[5]);
  g.outline(C[0]);
  if (pop >= 0 && pop < 0.12) g.clear();
  g.draw(p);
  // a sheen on the swollen bag
  if (fill > 0.3) p.dot(...local(ax, ay, h, R * 0.2, -R * 0.4), F[6], fill);
  // the burst: a ring and a spray of red
  if (pop >= 0 && pop < 1) {
    p.ring(ax, ay, 4 + pop * 26, 1, B[2], 0.6 * (1 - pop));
    p.glow(ax, ay, 16 * (1 - pop), B[1], 0.6 * (1 - pop));
    for (let i = 0; i < 26; i++) {
      const r = rng(o.seed, i, 3), a = r.range(0, TAU), v = r.range(18, 60), d = v * pop - 14 * pop * pop;
      p.dot(ax + Math.cos(a) * d, ay + Math.sin(a) * d, i % 3 ? B[1] : B[2], clamp(1.2 - pop * r.range(1, 1.6)));
    }
  }
}
