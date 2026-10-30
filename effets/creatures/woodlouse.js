import { fit, clamp, TAU } from "../../core/index.js";
import { Grid, shift, lit, foot, leg, local, heading, ease } from "./_lib.js";

export const meta = {
  name: "Rolling Woodlouse",
  desc: "A woodlouse seen from above trundles along on its little legs, curls up into an armoured ball, rolls away fast, then uncurls and walks on.",
  tags: ["creature", "woodlouse", "pill bug", "bug", "boss", "roll", "top-down", "loop"],
  size: [160, 112],
  origin: [80, 56],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#07080a", "#1a1e26", "#2c323e", "#424a5a", "#5c6678", "#7e889a", "#a8b2c2"], seed: 1 },
};

const D = meta.duration, GRID = new Grid(-80, -56, 160, 112);
const where = (u) => [44 * Math.cos(TAU * u), 26 * Math.sin(TAU * u)];
// walk, curl, roll, uncurl, walk: [time, lap position] keyframes, the lap position held while it curls
const K = [[0, 0], [2.4, 0.3], [2.8, 0.3], [4.2, 0.88], [4.8, 0.88], [6, 1]];
function at(t) {
  for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
    const [t0, u0] = K[i - 1], [t1, u1] = K[i], k = (t - t0) / (t1 - t0);
    return u0 + (u1 - u0) * (i === 4 ? ease(k) : k);
  }
  return 1;
}
const curlAt = (t) => (t < 2.4 ? 0 : t < 2.8 ? ease((t - 2.4) / 0.4) : t < 4.2 ? 1 : t < 4.8 ? 1 - ease((t - 4.2) / 0.6) : 0);

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), g = GRID.clear(), u = at(t), [x, y] = where(u), h = heading(where, u);
  const c = curlAt(t), len = 13 * (1 - c * 0.48), wid = 8 * (1 - c * 0.1);
  p.ellipse(x + 3, y + 4, len, wid, C[0], 0.35);
  // seven pairs of short legs, hidden as it curls
  if (c < 0.6)
    for (let k = 0; k < 7; k++)
      for (const s of [-1, 1]) {
        const hold = (uu) => {
          const [bx, by] = where(uu);
          return local(bx, by, heading(where, uu), 8 - k * 2.6, s * 11);
        };
        const [hx, hy] = local(x, y, h, (8 - k * 2.6) * (1 - c), s * 5);
        leg(g, C, hx, hy, 2, foot(u, 30, (k * 0.14 + (s > 0 ? 0.5 : 0)) % 1, 0.6, hold, 2), 4, 4.5, 0.5);
      }
  // antennae
  if (c < 0.5)
    for (const s of [-1, 1]) g.tube([local(x, y, h, len - 1, s * 2), local(x, y, h, len + 6, s * (4 + Math.sin(t * 5 + s)))], 0, C[4]);
  // the shell: plates across the back; when rolled, the bands turn with the roll
  const roll = c > 0.99 ? ((u - 0.3) * 330) / 4.5 : 0;
  g.blob(x, y, len, wid, h, (nx, ny, nz, px, py, bu, bv) => {
    const band = c > 0.99 ? Math.sin(Math.asin(clamp(bu, -1, 1)) * 4 - roll * TAU) > 0.75 : Math.sin(bu * 22) > 0.75;
    return band ? C[2] : lit(C, nx, ny, nz, px, py, 1 + 0.15 * c);
  });
  g.outline(C[0]);
  g.draw(p);
}
