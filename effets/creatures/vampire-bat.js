import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, local, heading, lit } from "./_lib.js";

export const meta = {
  name: "Vampire Bat",
  desc: "A vampire bat seen from above flaps a looping flight, its webbed wings folding and spreading, red eyes glowing, sonar rings pulsing ahead of it.",
  tags: ["creature", "bat", "flying", "boss", "top-down", "loop"],
  size: [176, 132],
  origin: [88, 66],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#060408", "#1a1020", "#2c1c34", "#422a4a", "#5c3e62", "#7c5a80", "#a482a4"], eyes: ["#ff3040", "#ffb0a0"], sonar: "#9ad8ff", seed: 1 },
};

const D = meta.duration, BEATS = 12, GRID = new Grid(-88, -66, 176, 132);
// a looping, slightly lopsided flight
const where = (u) => [38 * Math.sin(TAU * u) + 6 * Math.sin(3 * TAU * u), 18 * Math.sin(2 * TAU * u) + 5 * Math.cos(TAU * u)];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), u = t / D, C = fit(o.palette, 7), E = o.eyes.map(hex), SO = hex(o.sonar), g = GRID.clear();
  const [x, y] = where(u), h = heading(where, u), ph = TAU * u * BEATS;
  // seen from above, a wing shrinks on its upstroke (lifted toward us, folded) and spreads flat on the down
  const open = 0.6 + 0.4 * Math.cos(ph), lift = Math.sin(ph), span = 30 * open, L = (f, s) => local(x, y, h, f, s);
  // the shadow, far below: the bat flies high
  p.ellipse(x + 8, y + 12, 4 + span * 0.55, 5, C[0], 0.28);
  // sonar rings: a click every half beat cycle, rings opening ahead
  for (let j = 0; j < 3; j++) {
    const age = ((u * 6 + j / 3) % 1) * (D / 6), [cx, cy] = where(u - age / D), hh = heading(where, u - age / D);
    const r = 3 + age * 22, ox = cx + Math.cos(hh) * (9 + r * 0.3), oy = cy + Math.sin(hh) * (9 + r * 0.3);
    p.arc(ox, oy, r, 1.5, hh - 0.6, hh + 0.6, SO, 0.7 * (1 - age / (D / 6)));
  }
  // wings: shoulder, wrist, three fingers; the membrane scalloped between the tips
  for (const s of [-1, 1]) {
    // folded, the fingers sweep back along the body
    const back = 8 * (1 - open), sh = L(3, s * 3.5), wr = L(5 + 3 * lift, s * (5 + span * 0.4)), f1 = L(8 - back, s * (span + 4)), f2 = L(-6 - back, s * (span * 0.85 + 3)), f3 = L(-14 - back * 0.5, s * (span * 0.5 + 3)), hip = L(-11, s * 3);
    const mid = (a, b, k) => [(a[0] + b[0]) / 2 + (wr[0] - (a[0] + b[0]) / 2) * k, (a[1] + b[1]) / 2 + (wr[1] - (a[1] + b[1]) / 2) * k];
    const tilt = lift * 0.6;
    g.poly([sh, wr, f1, mid(f1, f2, 0.22), f2, mid(f2, f3, 0.22), f3, mid(f3, hip, 0.2), hip], (px, py) => {
      const dx = px - x, dy = py - y, side = Math.abs(-dx * Math.sin(h) + dy * Math.cos(h)) / Math.max(8, span);
      return lit(C, -Math.sin(h) * s * tilt * side, Math.cos(h) * s * tilt * side, 1 - side * 0.3, px, py, 0.75 + 0.15 * (1 - side));
    });
    for (const f of [f1, f2, f3]) g.line(wr[0], wr[1], f[0], f[1], C[5]);
    g.line(sh[0], sh[1], wr[0], wr[1], C[5]);
    // the thumb claw at the wrist
    g.set(...L(6 + 3 * lift, s * (4 + span * 0.42)), C[6]);
  }
  // furry body, head and big ears, little feet trailing
  g.blob(...L(-3, 0), 8, 5.2, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.15));
  g.blob(...L(5, 0), 4.2, 4, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.2));
  for (const s of [-1, 1]) {
    g.blob(...L(8, s * 3.2), 3, 1.5, h + s * 0.5, C[4]);
    g.line(...L(-11, s * 1.5), ...L(-14, s * 2.5), C[3]);
  }
  g.outline(C[0]);
  g.draw(p);
  for (const s of [-1, 1]) {
    const [ex, ey] = L(7.5, s * 1.6);
    p.dot(ex, ey, E[1]);
    p.glow(ex, ey, 2.5, E[0], 0.45);
  }
}
