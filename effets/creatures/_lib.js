// The creatures' kit, seen from above. A creature is painted into a grid from shaded parts (ellipsoids lit from the
// top left, dithered between the steps of its ramp), legs that walk with a closed-form gait, then wrapped in a
// 1 px outline and put on the painter over its own soft shadow.
// The walkers come from Antivirus TD's crawling bosses (https://github.com/Naod6473), the koi from Koïs.
//
// A walk is a closed path: where(u) gives the body's position and heading for u in [0, 1), one lap. Each leg steps
// N times a lap, so its feet are a function of u alone: planted while the body passes over them, swung to the next
// foothold in between. When u stops, the feet stop. The loop is seamless because the path and the steps are.

import { clamp, wrap, lerp, TAU } from "../../core/index.js";

export { TAU };

/** The loop time for this creature: seeds other than 1 start it somewhere else in its loop. */
export const shift = (t, D, seed = 1) => wrap(t + (seed - 1) * 0.618 * D, D);
export const ease = (x) => x * x * (3 - 2 * x);
/** 0 → 1 → 0 over [a, b] (smoothly), 0 outside. */
export const pulse = (x, a, b) => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)));

// light from the top left, a little above
const LX = -0.45, LY = -0.6, LZ = 0.66, LN = Math.hypot(LX, LY, LZ);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * A ramp step for a surface facing (nx, ny, nz): C[0] is kept for the outline, C[1..] go from shadow to highlight,
 * dithered at (x, y) so a round body shades smoothly. k lifts (above 1) or darkens the whole surface.
 */
export function lit(C, nx, ny, nz, x, y, k = 1) {
  const d = (nx * LX + ny * LY + nz * LZ) / LN, n = C.length - 1;
  const f = clamp(((d + 0.35) / 1.3) * k, 0, 1) * (n - 1) + 1;
  const i = Math.floor(f), dither = BAYER[(Math.floor(y) & 3) * 4 + (Math.floor(x) & 3)] / 16;
  return C[clamp(f - i > dither ? i + 1 : i, 1, n)];
}

/** A creature-sized canvas in local coordinates: cells [x0, x0 + w) x [y0, y0 + h). */
export class Grid {
  constructor(x0, y0, w, h) {
    this.x0 = Math.floor(x0); this.y0 = Math.floor(y0); this.w = w; this.h = h;
    this.c = new Uint32Array(w * h);
    this.a = new Float32Array(w * h);
  }
  idx(x, y) {
    const ix = Math.floor(x) - this.x0, iy = Math.floor(y) - this.y0;
    return ix < 0 || iy < 0 || ix >= this.w || iy >= this.h ? -1 : iy * this.w + ix;
  }
  set(x, y, c, a = 1) {
    const i = this.idx(x, y);
    if (i >= 0 && c) (this.c[i] = c), (this.a[i] = a);
  }
  get(x, y) {
    const i = this.idx(x, y);
    return i < 0 ? 0 : this.c[i];
  }
  /** fn(x, y) at each cell center of the box returns a color, or 0 to leave the cell. */
  shade(x0, y0, x1, y1, fn, a = 1) {
    for (let y = Math.floor(y0); y <= Math.floor(y1); y++)
      for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
        const c = fn(x + 0.5, y + 0.5);
        if (c) this.set(x, y, c, a);
      }
  }
  /**
   * An ellipsoid turned by ang (rx along ang): c is a color, or fn(nx, ny, nz, x, y) with the surface normal in
   * world space, for lit(). Return 0 to leave a hole (a pattern, a gap).
   */
  blob(cx, cy, rx, ry, ang, c, a = 1) {
    if (rx <= 0 || ry <= 0) return;
    const cs = Math.cos(ang), sn = Math.sin(ang), R = Math.max(rx, ry);
    this.shade(cx - R, cy - R, cx + R, cy + R, (x, y) => {
      const dx = x - cx, dy = y - cy, u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry, q = u * u + v * v;
      if (q > 1) return 0;
      if (typeof c !== "function") return c;
      const nz = Math.sqrt(1 - q);
      return c(u * cs - v * sn, u * sn + v * cs, nz, x, y, u, v);
    }, a);
  }
  /** A line of discs through pts, r may be fn(u): legs, tails, tentacles. c may be fn(u, x, y). */
  tube(pts, r, c, a = 1) {
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k], L = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let s = 0; s <= L; s += 0.5) {
        const u = (k - 1 + s / L) / (pts.length - 1), rr = typeof r === "function" ? r(u) : r;
        const x = ax + ((bx - ax) * s) / L, y = ay + ((by - ay) * s) / L;
        const col = (px, py) => (typeof c === "function" ? c(u, px, py) : c);
        if (rr < 0.75) {
          this.set(x, y, col(x, y), a);
          continue;
        }
        this.shade(x - rr, y - rr, x + rr, y + rr, (px, py) => (Math.hypot(px - x, py - y) > rr ? 0 : col(px, py)), a);
      }
    }
  }
  line(x0, y0, x1, y1, c, a = 1) {
    this.tube([[x0, y0], [x1, y1]], 0, c, a);
  }
  /** Filled polygon; c may be fn(x, y). */
  poly(pts, c, a = 1) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
    const n = pts.length;
    this.shade(x0, y0, x1, y1, (x, y) => {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside ? (typeof c === "function" ? c(x, y) : c) : 0;
    }, a);
  }
  /** Wrap what's drawn so far (opaque cells only) in a 1 px outline. */
  outline(c) {
    const src = this.c, w = this.w, h = this.h, solid = (i) => src[i] && this.a[i] >= 0.999, add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (solid(i)) continue;
        if ((x > 0 && solid(i - 1)) || (x < w - 1 && solid(i + 1)) || (y > 0 && solid(i - w)) || (y < h - 1 && solid(i + w))) add.push(i);
      }
    for (const i of add) (this.c[i] = c), (this.a[i] = 1);
  }
  /** Put the grid on the painter: opaque cells as they are (dithered by fade), translucent ones blended. */
  draw(p, fade = 1) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x, c = this.c[i];
        if (!c) continue;
        const a = this.a[i];
        if (a >= 0.999) p.dot(this.x0 + x, this.y0 + y, c, fade);
        else p.blend(this.x0 + x, this.y0 + y, c, a * fade);
      }
  }
  clear() {
    this.c.fill(0);
    return this;
  }
}

// ---- walking

/** Things seen from slightly above: z (height) lifts them up the screen. */
export const TILT = 0.55;

/**
 * Where a foot is at lap position u. N steps a lap, off its phase (0..1), duty the share of the step it stays
 * planted, hold(u) the foothold [x, y] it aims for when the body is at u, lift the swing height.
 * Returns [x, y, z].
 */
export function foot(u, N, off, duty, hold, lift) {
  const q = u * N + off, k = Math.floor(q), ph = q - k, mid = (j) => (j - off + duty / 2) / N;
  if (ph < duty) {
    const [x, y] = hold(mid(k));
    return [x, y, 0];
  }
  const s = (ph - duty) / (1 - duty), [ax, ay] = hold(mid(k)), [bx, by] = hold(mid(k + 1)), e = ease(s);
  return [lerp(ax, bx, e), lerp(ay, by, e), lift * Math.sin(Math.PI * s)];
}

/** The knee of a two-part leg from hip (hz high) to foot (fz high), lengths a and b, bent upward. [x, y, z]. */
export function knee(hx, hy, hz, fx, fy, fz, a, b) {
  const dx = fx - hx, dy = fy - hy, dh = Math.hypot(dx, dy) || 1e-6, dz = fz - hz;
  const L = Math.min(Math.hypot(dh, dz), a + b - 1e-3);
  const ang = Math.atan2(dz, dh) + Math.acos(clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1));
  const r = Math.cos(ang) * a;
  return [hx + (dx / dh) * r, hy + (dy / dh) * r, hz + Math.sin(ang) * a];
}

/** A point at (side, fwd) from (x, y) facing h: fwd along the heading, side to its right. */
export const local = (x, y, h, fwd, side) => [x + Math.cos(h) * fwd - Math.sin(h) * side, y + Math.sin(h) * fwd + Math.cos(h) * side];

/**
 * A walking leg, painted into g: hip at (hx, hy, hz), foot from foot(), lengths a and b. C is the ramp; the thigh
 * is drawn thicker (w) and catches more light than the shin. Returns the projected foot, for dust or prints.
 */
export function leg(g, C, hx, hy, hz, f, a, b, w = 1, tip = 0) {
  const [kx, ky, kz] = knee(hx, hy, hz, f[0], f[1], f[2], a, b);
  const P = (x, y, z) => [x, y - z * TILT];
  const H = P(hx, hy, hz), K = P(kx, ky, kz), F = P(f[0], f[1], f[2]);
  const n = C.length - 1;
  g.tube([H, K], w, (u) => C[u < 0.75 ? n - 2 : n - 1]);
  g.tube([K, F], Math.max(0, w - 0.6), (u) => C[u < 0.15 ? n - 1 : u > 0.85 && tip ? tip : n - 3]);
  return F;
}

/** A path's heading at u, from its positions. */
export function heading(where, u) {
  const [ax, ay] = where(u - 0.002), [bx, by] = where(u + 0.002);
  return Math.atan2(by - ay, bx - ax);
}

/** A chain hanging behind a moving point, as a closed form: the point's own past along the path. */
export const trail = (where, u, n, du) => Array.from({ length: n }, (_, i) => where(u - i * du));

/**
 * A body along its own wake: n points behind the head at lap position u, du apart in u, each with its heading,
 * pushed sideways by sway(i / (n - 1)) (a swimming wave, a slither). [{ x, y, a }], head first.
 */
export function spine(where, u, n, du, sway = () => 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const uu = u - i * du, [x, y] = where(uu), a = heading(where, uu), s = sway(i / (n - 1));
    out.push({ x: x - Math.sin(a) * s, y: y + Math.cos(a) * s, a });
  }
  for (let i = 0; i < n; i++) {
    const A = out[Math.max(0, i - 1)], B = out[Math.min(n - 1, i + 1)];
    out[i].a = Math.atan2(A.y - B.y, A.x - B.x);
  }
  return out;
}

/** A point along a spine at v (0 head .. 1 tail), side px to its right: [x, y, heading]. */
export function along(S, v, side = 0) {
  const f = Math.min(Math.max(v, 0), 1) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(f)), k = f - i, A = S[i], B = S[i + 1];
  const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k, a = A.a;
  return [x - Math.sin(a) * side, y + Math.cos(a) * side, a];
}

/**
 * Fill a body around a spine: width(v) its half width at v, c(v, w, nx, ny, nz, x, y) its color with w -1..1 across
 * it (left to right) and the lit normal of a round body there. Each cell is matched to its nearest spine point.
 */
export function body(g, S, width, c, a = 1) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, W = 0;
  for (let i = 0; i < S.length; i++) W = Math.max(W, width(i / (S.length - 1)));
  for (const s of S) (x0 = Math.min(x0, s.x)), (x1 = Math.max(x1, s.x)), (y0 = Math.min(y0, s.y)), (y1 = Math.max(y1, s.y));
  const n = S.length - 1;
  g.shade(x0 - W - 1, y0 - W - 1, x1 + W + 1, y1 + W + 1, (x, y) => {
    let best = Infinity, bv = 0, bs = 0, ba = 0;
    for (let i = 0; i < n; i++) {
      const A = S[i], B = S[i + 1], dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1;
      const k = Math.min(1, Math.max(0, ((x - A.x) * dx + (y - A.y) * dy) / L2)), px = A.x + dx * k, py = A.y + dy * k;
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < best) (best = d), (bv = (i + k) / n), (bs = (-(x - px) * Math.sin(A.a) + (y - py) * Math.cos(A.a))), (ba = A.a);
    }
    const w = width(bv);
    if (w <= 0 || Math.sqrt(best) > w) return 0;
    const q = bs / w, nz = Math.sqrt(Math.max(0, 1 - q * q));
    return c(bv, q, -Math.sin(ba) * q, Math.cos(ba) * q, nz, x, y);
  }, a);
}

// ---- koi, after the carp of Koïs: a white, red, black or gold robe, patches laid along the body

/** A koi's robe for its variety: { base: ramp name, patches: [{ v, rv, w, rw, c }] }, seeded. */
export function robe(variety, r) {
  const P = [];
  const saddles = (c) => {
    if (r.next() < 0.8) P.push({ v: 0.08, rv: 0.06, w: r.range(-0.1, 0.1), rw: 1.1, c });
    const n = 2 + r.int(0, 1), span = 0.5 / n;
    for (let j = 0; j < n; j++) P.push({ v: 0.26 + span * (j + 0.5) + r.range(-0.15, 0.15) * span, rv: span * r.range(0.36, 0.48), w: r.range(-0.25, 0.25), rw: r.range(0.8, 1.2), c });
  };
  let base = "white";
  if (variety === "kohaku") saddles("red");
  else if (variety === "sanke") { saddles("red"); for (let j = 0; j < 5; j++) P.push({ v: r.range(0.22, 0.67), rv: 0.025, w: r.range(-0.6, 0.6), rw: 0.25, c: "black" }); }
  else if (variety === "showa") { base = "black"; saddles("red"); P.push({ v: 0.5, rv: 0.06, w: 0.3, rw: 0.5, c: "white" }); }
  else if (variety === "tancho") P.push({ v: 0.08, rv: 0.04, w: 0, rw: 0.75, c: "red", round: true });
  else if (variety === "ogon") base = "gold";
  else if (variety === "karasu") base = "black";
  else if (variety === "higoi") { base = "red"; P.push({ v: 0.45, rv: 0.08, w: 0.35, rw: 0.45, c: "white" }); }
  return { base, patches: P, veil: variety === "ogon" || variety === "karasu" };
}

const koiW = (v, L) => Math.max(1.3, (L / 6.3) * Math.pow(Math.sin(Math.PI * Math.min(1, (v + 0.05) / 1.06)), 0.55) * (1 - 0.6 * v));

/**
 * A koi along spine S (head first), L long. R holds the ramps by name (white, red, black, gold: dark to light,
 * outline first), k the robe, beat (0..1) the tail beat. Painted into g; fins translucent.
 */
export function drawKoi(g, S, L, R, k, beat) {
  const n = S.length, tb = S[n - 3], [tx, ty] = along(S, 0.94), T = { x: tx, y: ty }, ta = Math.atan2(T.y - tb.y, T.x - tb.x);
  const sw = Math.sin(TAU * beat) * 0.45, fin = R[k.base === "white" ? "white" : k.base];
  const fc = fin[fin.length - 2];
  // tail: two lobes fanned out behind, swishing late; veiled koi trail longer, softer fins
  const tl = L * (k.veil ? 0.42 : 0.3);
  for (const s of [-1, 1]) {
    const a = ta + s * 0.5 + sw, b = ta + s * 0.05 + sw * 1.3, m = ta + s * 0.3 + sw * 1.15;
    g.poly([[T.x + Math.sin(ta) * s, T.y - Math.cos(ta) * s], [T.x + Math.cos(a) * tl, T.y + Math.sin(a) * tl], [T.x + Math.cos(m) * tl * 0.8, T.y + Math.sin(m) * tl * 0.8], [T.x + Math.cos(b) * tl * 0.75, T.y + Math.sin(b) * tl * 0.75]], fc, 0.6);
  }
  // pectoral fins, flapping
  for (const s of [-1, 1]) {
    const [px, py, pa] = along(S, 0.2, s * koiW(0.2, L) * 0.8), fa = pa + Math.PI - s * (1.1 + 0.3 * Math.sin(TAU * beat * 2 + s));
    g.blob(px + Math.cos(fa) * L * 0.07, py + Math.sin(fa) * L * 0.07, L * (k.veil ? 0.12 : 0.09), L * 0.045, fa, fc, 0.6);
  }
  // the body, patches over the base
  body(g, S, (v) => koiW(v, L), (v, w, nx, ny, nz, x, y) => {
    let c = k.base;
    for (const p of k.patches) {
      const dv = (v - p.v) / p.rv, dw = (w - p.w) / p.rw;
      if (p.round ? dv * dv + dw * dw < 1 : Math.abs(dv) < 1 && Math.abs(dw) < 1 - 0.3 * dv * dv) c = p.c;
    }
    return lit(R[c], nx, ny, nz, x, y, v < 0.12 ? 1.1 : 1);
  });
  // eyes
  for (const s of [-1, 1]) {
    const [ex, ey] = along(S, 0.06, s * koiW(0.06, L) * 0.65);
    g.set(ex, ey, R.black[1]);
  }
}
