import { fit, rng, TAU } from "../../core/index.js";
import { shift } from "./_lib.js";

export const meta = {
  name: "Locust Swarm",
  desc: "A swarm of locusts seen from above churns along a winding path, a hundred insects whirling round its heart, wings flickering, a dark cloud of shadow beneath.",
  tags: ["creature", "insect", "swarm", "flying", "boss", "top-down", "loop"],
  size: [176, 132],
  origin: [88, 66],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a0804", "#3a3010", "#6a5a1e", "#9a8430", "#c8b04a", "#ece080"], wings: "#d8e4f0", count: 110, seed: 1 },
};

const D = meta.duration;
// the swarm's heart wanders a lazy loop
const heart = (u) => [40 * Math.sin(TAU * u), 17 * Math.sin(2 * TAU * u + 0.6)];

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), u = t / D, C = fit(o.palette, 6), Wg = fit([o.wings], 1)[0], r = rng(o.seed, 5);
  const n = Math.max(10, Math.min(220, Math.round(o.count))), [hx, hy] = heart(u), bugs = [];
  // each locust orbits the heart on a tilted, wobbling ellipse, a whole number of turns a loop; z is its height
  for (let i = 0; i < n; i++) {
    const R = 6 + 28 * Math.sqrt(r.next()), turns = (r.next() < 0.5 ? 1 : -1) * r.int(2, 5), ph = r.range(0, TAU), tilt = r.range(0, Math.PI);
    const ecc = r.range(0.4, 0.9), wob = r.int(1, 4), zph = r.range(0, TAU), flick = r.range(0, TAU);
    const a = ph + TAU * turns * u, rr = R * (1 + 0.18 * Math.sin(TAU * wob * u + ph));
    const lx = Math.cos(a) * rr, ly = Math.sin(a) * rr * ecc, cs = Math.cos(tilt), sn = Math.sin(tilt);
    const z = Math.sin(TAU * wob * u + zph);
    const x = hx + lx * cs - ly * sn, y = hy + lx * sn + ly * cs - z * 4;
    // facing: along the orbit
    const va = a + Math.sign(turns) * Math.PI / 2, dx = Math.cos(va) * cs - Math.sin(va) * ecc * sn, dy = Math.cos(va) * sn + Math.sin(va) * ecc * cs;
    bugs.push({ x, y, z, d: Math.atan2(dy, dx), f: flick, sx: x + 6 + z * 3, sy: y + 10 + z * 6 });
  }
  // the shadow cloud first, soft and dark
  for (const b of bugs) p.blend(b.sx, b.sy, C[0], 0.35);
  p.ellipse(hx + 6, hy + 10, 26, 16, C[0], 0.12);
  bugs.sort((a, b) => a.z - b.z);
  for (const b of bugs) {
    const cx = Math.cos(b.d), cy = Math.sin(b.d), shade = C[b.z > 0.3 ? 5 : b.z > -0.3 ? 4 : 3];
    // body: two pixels head to tail, a dark tail tip
    p.dot(b.x, b.y, shade);
    p.dot(b.x - cx, b.y - cy, C[2]);
    if (b.z > 0.2) p.dot(b.x - cx * 2, b.y - cy * 2, C[1]);
    // wings flicker: a pale glint either side, on and off fast
    const w = 0.5 + 0.5 * Math.sin(t * 70 + b.f);
    if (w > 0.4) for (const s of [-1, 1]) p.blend(b.x - cx * 0.5 - cy * s * 1.5, b.y - cy * 0.5 + cx * s * 1.5, Wg, 0.35 * w);
  }
}
