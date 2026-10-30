import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, local, heading } from "./_lib.js";

export const meta = {
  name: "Octopus",
  desc: "An octopus seen from above jets round in pulses, eight curling arms flaring out on each push and trailing behind as it glides, suckers pale along them.",
  tags: ["creature", "octopus", "sea", "tentacles", "boss", "swim", "top-down", "loop"],
  size: [160, 128],
  origin: [80, 64],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a0510", "#2a0e2e", "#4a1a48", "#702a62", "#9a4078", "#c4648e", "#eaa0b4"], eyes: ["#ffe8a0", "#100808"], seed: 1 },
};

const D = meta.duration, PUSH = 4, GRID = new Grid(-80, -64, 160, 128);
const path = (u) => [36 * Math.cos(TAU * u), 26 * Math.sin(TAU * u)];
// it moves in pushes: fast just after each pulse, coasting after
const lap = (t) => {
  const q = (t / D) * PUSH, k = Math.floor(q), f = q - k;
  return (k + 1 - Math.pow(1 - f, 2.4)) / PUSH;
};

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), E = o.eyes.map(hex), g = GRID.clear();
  const u = lap(t), [x, y] = path(u), h = heading(path, u), f = ((t / D) * PUSH) % 1;
  const flare = Math.pow(1 - f, 3), back = h + Math.PI;
  p.ellipse(x + 4, y + 5, 12, 10, C[0], 0.3);
  // arms: from around the head, spread wide on the push, gathered behind while gliding, curling at the tips
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, k = i % 4, base = back + side * (0.35 + k * 0.42) * (0.55 + flare * 1.1);
    const pts = [];
    let [ax, ay] = local(x, y, h, -2 - k * 0.8, side * (2 + k * 0.8)), a = base;
    for (let j = 0; j < 15; j++) {
      pts.push([ax, ay]);
      a += side * 0.12 * Math.sin(TAU * (t / D) * 3 - j * 0.5 + i) + (j > 10 ? side * 0.3 : 0);
      ax += Math.cos(a) * 2.6; ay += Math.sin(a) * 2.6;
    }
    g.tube(pts, (v) => 3 * (1 - v) + 0.3, (v, px, py) => (v > 0.15 && Math.sin(v * 46 + i) > 0.92 ? C[6] : C[v < 0.4 ? 4 : 3]));
  }
  // the mantle: a soft bag behind the head, swelling as it draws water
  const [mx, my] = local(x, y, h, 8, 0), sw = 1 + 0.15 * flare;
  g.blob(mx, my, 11 * (1.15 - 0.15 * flare), 8 * sw, h, (nx, ny, nz, px, py, bu, bv) => (Math.sin(bu * 11 + bv * 7) > 0.85 ? C[5] : lit(C, nx, ny, nz, px, py)));
  g.blob(x, y, 5.5, 6.5, h, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 1.1));
  g.outline(C[0]);
  g.draw(p);
  for (const s of [-1, 1]) {
    const [ex, ey] = local(x, y, h, 1, s * 4.5);
    p.dot(ex, ey, E[0]); p.dot(ex + Math.cos(h), ey + Math.sin(h), E[1]);
  }
  // bubbles from the push
  for (let j = 0; j < 5; j++) {
    const [bx, by] = local(x, y, h, -16 - f * 14 - j * 3, Math.sin(j * 2.3) * 4);
    if (f < 0.6) p.ring(bx, by, 1 + (j % 2), 1, C[6], 0.5 * (1 - f / 0.6));
  }
}
