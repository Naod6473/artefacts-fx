import { fit, hex, TAU } from "../../core/index.js";
import { Grid, shift, lit, local, heading } from "./_lib.js";

export const meta = {
  name: "Ant Queen",
  desc: "A winged ant queen seen from above paces in the middle while a column of worker ants marches round her along a scent trail, legs ticking in tripods.",
  tags: ["creature", "ant", "swarm", "insect", "boss", "walk", "top-down", "loop"],
  size: [176, 128],
  origin: [88, 64],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#060404", "#1e100c", "#361c12", "#522a18", "#743c20", "#9a5a30", "#c48a50"], wings: ["#c8d4e0"], trail: ["#5a7040"], seed: 1 },
};

const D = meta.duration, WORKERS = 16, GRID = new Grid(-88, -64, 176, 128);
const ring = (u) => [62 * Math.cos(TAU * u) + 5 * Math.sin(3 * TAU * u), 44 * Math.sin(TAU * u)];
const home = (u) => [10 * Math.cos(TAU * u), 6 * Math.sin(2 * TAU * u)];

// an ant: head, waist, gaster; six legs in two tripods; s its size
function ant(g, C, x, y, a, step, s, k = 1) {
  for (let i = 0; i < 3; i++)
    for (const side of [-1, 1]) {
      const sw = Math.sin(step + (i % 2 ? Math.PI : 0) + (side > 0 ? Math.PI : 0)) * 0.35;
      const [hx, hy] = local(x, y, a, (1 - i) * 1.2 * s, 0), ang = a + side * (Math.PI / 2 + (1 - i) * -0.7 + sw);
      g.line(hx, hy, hx + Math.cos(ang) * 4.2 * s, hy + Math.sin(ang) * 4.2 * s, C[2]);
    }
  g.blob(...local(x, y, a, -3.4 * s, 0), 2.4 * s * k, 1.8 * s * k, a, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py));
  g.blob(x, y, 1.6 * s, 1 * s, a, C[4]);
  g.blob(...local(x, y, a, 2.4 * s, 0), 1.4 * s, 1.3 * s, a, (nx, ny, nz, px, py) => lit(C, nx, ny, nz, px, py, 0.9));
  for (const side of [-1, 1]) g.line(...local(x, y, a, 3.4 * s, side * 0.6 * s), ...local(x, y, a, 5.6 * s, side * 2.2 * s), C[3]);
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), g = GRID.clear(), u = t / D;
  // the scent trail
  for (let i = 0; i < 60; i++) {
    const [tx, ty] = ring(i / 60);
    p.dot(tx, ty, hex(o.trail[0]), 0.35);
  }
  // workers: single file round the trail, a little wobble each
  for (let i = 0; i < WORKERS; i++) {
    const uu = u * 2 - i / WORKERS + Math.sin(i * 7.1) * 0.006, [x, y] = ring(uu), a = heading(ring, uu) + Math.sin(t * 9 + i) * 0.1;
    ant(g, C, x, y, a, uu * 260, 1);
  }
  // the queen: twice their size, wings folded over her back, a heavy striped gaster
  const [x, y] = home(u), a = heading(home, u);
  p.ellipse(x + 3, y + 4, 15, 9, C[0], 0.35);
  ant(g, C, x, y, a, u * 40, 2.8, 1.3);
  g.blob(...local(x, y, a, -11, 0), 6, 4.6, a, (nx, ny, nz, px, py, bu) => (Math.sin(bu * 10) > 0.6 ? C[2] : lit(C, nx, ny, nz, px, py)));
  g.outline(C[0]);
  for (const s of [-1, 1]) g.blob(...local(x, y, a, -8, s * 3.5), 8, 2.6, a - s * 0.22, hex(o.wings[0]), 0.2);
  g.draw(p);
}
