import { fit, TAU } from "../../core/index.js";
import { Grid, shift, local, heading, lit } from "./_lib.js";

export const meta = {
  name: "Sea Turtle",
  desc: "A sea turtle seen from above paddles a slow loop, big front flippers sweeping in long strokes, a patterned shell, little bubbles trailing.",
  tags: ["creature", "turtle", "sea", "swim", "top-down", "loop"],
  size: [160, 112],
  origin: [80, 56],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#060805", "#1a2210", "#2c3818", "#445024", "#5e6c32", "#808c46", "#a8b464"], skin: ["#0a0c08", "#2a3424", "#40503a", "#5a6c52", "#7c9070", "#a4b896"], seed: 1 },
};

const D = meta.duration, STROKES = 6, GRID = new Grid(-80, -56, 160, 112);
const where = (u) => [40 * Math.cos(TAU * u), 24 * Math.sin(TAU * u)];
// faster through each stroke
const lap = (t) => t / D + (0.02 / STROKES) * Math.sin((TAU * t * STROKES) / D);

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), K = fit(o.skin, 6), g = GRID.clear(), u = lap(t);
  const [x, y] = where(u), h = heading(where, u), st = Math.sin((TAU * t * STROKES) / D);
  p.ellipse(x + 4, y + 6, 13, 11, C[0], 0.3);
  // flippers: the front pair sweep from forward to back, the hind pair steer
  for (const s of [-1, 1]) {
    const fa = h + s * (1.1 - st * 0.7), [fx, fy] = local(x, y, h, 6, s * 8);
    g.blob(fx + Math.cos(fa) * 8, fy + Math.sin(fa) * 8, 9, 2.8, fa - s * 0.3, (nx, ny, nz, px, py) => lit(K, nx, ny, nz, px, py));
    const ha = h + Math.PI - s * (0.6 + st * 0.15), [rx, ry] = local(x, y, h, -9, s * 6);
    g.blob(rx + Math.cos(ha) * 3, ry + Math.sin(ha) * 3, 4, 2, ha, (nx, ny, nz, px, py) => lit(K, nx, ny, nz, px, py));
  }
  // head, shell with its plates
  g.blob(...local(x, y, h, 15, 0), 4.5, 3.6, h + Math.sin(t * 2) * 0.15, (nx, ny, nz, px, py) => lit(K, nx, ny, nz, px, py, 1.1));
  g.blob(x, y, 13, 11, h, (nx, ny, nz, px, py, bu, bv) => {
    const r = Math.hypot(bu, bv);
    if (r > 0.86) return C[3];
    const ring = Math.abs(r - 0.6) < 0.06, spoke = r > 0.6 && Math.abs(Math.sin(Math.atan2(bv, bu) * 4)) < 0.12, spine = Math.abs(bv) < 0.2 && Math.abs(Math.sin(bu * 6)) < 0.15;
    return ring || spoke || spine ? C[2] : lit(C, nx, ny, nz, px, py);
  });
  g.outline(C[0]);
  g.draw(p);
  for (const s of [-1, 1]) p.dot(...local(x, y, h, 17, s * 2), K[0]);
  for (let j = 0; j < 4; j++) {
    const age = ((t * 0.8 + j * 0.25) % 1), [bx, by] = where(u - 0.03 - age * 0.04);
    p.ring(bx + Math.sin(j * 3) * 3, by + Math.cos(j * 5) * 3, 1, 1, K[5], 0.5 * (1 - age));
  }
}
