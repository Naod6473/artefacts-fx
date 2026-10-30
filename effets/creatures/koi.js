import { fit, rng, TAU } from "../../core/index.js";
import { Grid, shift, spine, drawKoi, robe, pulse } from "./_lib.js";

export const meta = {
  name: "Koi",
  desc: "A kohaku koi seen from above glides a slow loop, its tail and fins beating, red saddles on a white robe, rings opening on the water where it turns.",
  tags: ["creature", "koi", "fish", "water", "pond", "top-down", "loop"],
  size: [144, 96],
  origin: [72, 48],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#14161c", "#7d8590", "#b8bdc4", "#e4e2dc", "#fbfaf6"],
    spots: ["#2a0806", "#8e1d12", "#c8331c", "#e8512c", "#ff8a5c"],
    ink: ["#050506", "#18181c", "#2a2a30", "#3e3e46", "#5a5a66"],
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-72, -48, 144, 96), LEN = 38;
const where = (u) => [46 * Math.cos(TAU * u) + 6 * Math.sin(2 * TAU * u), 22 * Math.sin(TAU * u) + 4 * Math.cos(3 * TAU * u)];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), g = GRID.clear(), u = t / D;
  const R = { white: fit(o.palette, 5), red: fit(o.spots, 5), black: fit(o.ink, 5), gold: fit(o.spots, 5) };
  const k = robe("kohaku", rng(o.seed, 7)), beat = (t / D) * 9;
  const S = spine(where, u, 16, 0.011, (v) => 2.2 * v * v * Math.sin(TAU * (beat - v * 0.9)));
  // rings on the water, left where the koi turned
  for (let j = 0; j < 4; j++) {
    const age = (t + D - j * (D / 4)) % (D / 4 * 4), life = 1.8;
    if (age > life) continue;
    const [rx, ry] = where((t - age) / D), r = 2 + age * 6, a = 0.18 * (1 - age / life);
    p.ring(rx, ry, r, 1, R.white[3], a);
  }
  // a soft shadow on the pond bed, deeper when the koi dives a little
  const dive = 0.5 + 0.5 * Math.sin((TAU * t) / D);
  for (let i = 0; i < S.length; i += 3) p.disc(S[i].x + 3 + dive * 2, S[i].y + 4 + dive * 2, 3.5 - i * 0.15, R.black[0], 0.25);
  drawKoi(g, S, LEN, R, k, beat);
  g.outline(R.black[0]);
  g.draw(p);
  // glints where light catches the water over its back
  for (let j = 0; j < 4; j++) {
    const s = pulse((t * 0.9 + j * 0.37) % 1, 0, 0.3), [x, y] = [S[2 + j * 3].x - 1, S[2 + j * 3].y - 2];
    if (s > 0) p.dot(x, y, R.white[4], s * 0.7);
  }
}
