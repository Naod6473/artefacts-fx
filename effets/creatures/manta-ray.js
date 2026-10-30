import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, local, heading, lit } from "./_lib.js";

export const meta = {
  name: "Manta Ray",
  desc: "A manta ray seen from above glides a wide circle with slow beats of its great wings, light rippling across its back, its thin tail trailing.",
  tags: ["creature", "manta", "ray", "sea", "fish", "swim", "top-down", "loop"],
  size: [176, 128],
  origin: [88, 64],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#04060c", "#0e1626", "#18243a", "#243652", "#344c6e", "#4c6a90", "#7a98ba"], spots: ["#c8d8e8"], seed: 1 },
};

const D = meta.duration, BEATS = 6, GRID = new Grid(-88, -64, 176, 128);
const where = (u) => [44 * Math.cos(TAU * u), 28 * Math.sin(TAU * u)];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), Sp = hex(o.spots[0]), g = GRID.clear(), u = t / D;
  const [x, y] = where(u), h = heading(where, u), beat = Math.sin(TAU * u * BEATS), span = 30 * (1 - 0.22 * Math.abs(beat));
  p.ellipse(x + 6, y + 8, span * 0.8, 10, C[0], 0.25);
  // tail
  const tail = [];
  for (let j = 0; j <= 8; j++) {
    const [tx, ty] = where(u - 0.01 - j * 0.012), [bx, by] = local(tx, ty, heading(where, u - j * 0.012), -10, 0);
    tail.push([bx, by]);
  }
  g.tube(tail, 0, C[3]);
  // the wings: a broad diamond, tips swept back and lifted on the beat; the lit side shifts as they bend
  const L = (f, s) => local(x, y, h, f, s);
  const tipF = -4 - 4 * beat, pts = [L(12, 0), L(10, -5), L(4, -14), L(tipF, -span), L(-8, -10), L(-12, -3), L(-12, 3), L(-8, 10), L(tipF, span), L(4, 14), L(10, 5)];
  g.poly(pts, (px, py) => {
    const dx = px - x, dy = py - y, side = -dx * Math.sin(h) + dy * Math.cos(h), fwd = dx * Math.cos(h) + dy * Math.sin(h);
    const bend = (Math.abs(side) / span) * beat, nx = -Math.sin(h) * Math.sign(side) * bend, ny = Math.cos(h) * Math.sign(side) * bend;
    const spot = Math.abs(side) < 6 && fwd < 2 && fwd > -8 && (Math.floor(px) * 3 + Math.floor(py)) % 7 === 0;
    return spot ? Sp : lit(C, nx * 0.9, ny * 0.9, 1 - Math.abs(bend) * 0.5, px, py, 0.9 + 0.2 * (1 - Math.abs(side) / span));
  });
  // cephalic fins, curled forward
  for (const s of [-1, 1]) g.tube([L(10, s * 4), L(15, s * 4.5), L(16, s * 2.5)], 1, C[4]);
  g.outline(C[0]);
  g.draw(p);
  for (const s of [-1, 1]) p.dot(...L(8, s * 5), C[6]);
}
