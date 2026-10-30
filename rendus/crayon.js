// Crayon : l'effet dessiné aux crayons de couleur sur du papier crème. Chaque case devient quelques hachures
// tremblées (plus nombreuses, puis croisées, là où l'effet brille) sur un lavis léger de la même couleur ; les traits
// « bouillonnent » quelques fois par seconde, comme une animation dessinée image par image.
// Inspiré du rendu crayon d'Inkra (https://github.com/inkrajs/inkra, MIT) : papier, grain du trait, lavis.
import { tailleCase, cellule, intensite, hs } from "./_commun.js";

export const meta = { id: "crayon", nom: { fr: "Crayon", en: "Pencil" } };

const PAPIER = "#f4f0e3", GRAPHITE = [70, 66, 60];
const papiers = new Map(); // grain du papier, par taille de canvas

function papier(W, H) {
  const cle = W + "x" + H;
  let c = papiers.get(cle);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = PAPIER;
  x.fillRect(0, 0, W, H);
  // fibres : de petits points plus sombres ou plus clairs, semés de façon stable
  for (let i = 0, n = (W * H) / 18; i < n; i++) {
    const a = hs(i * 2654435761 + 11), b = hs(i * 40503 + 977), v = hs(i * 69069 + 5);
    x.fillStyle = v < 0.5 ? `rgba(120,100,70,${0.05 + v * 0.08})` : `rgba(255,255,250,${(v - 0.5) * 0.3})`;
    x.fillRect(a * W, b * H, 1 + (v * 7) % 1.5, 1);
  }
  if (papiers.size > 24) papiers.clear();
  papiers.set(cle, c);
  return c;
}

/**
 * Couleur d'une mine : la teinte de l'effet, plus saturée et assez foncée pour se voir sur le papier clair.
 * Un blanc (cœur d'une flamme, éclair) devient un graphite léger.
 */
function mine(c) {
  const M = Math.max(c[0], c[1], c[2], 1), m = Math.min(c[0], c[1], c[2]), sat = (M - m) / M;
  if (sat < 0.18) return GRAPHITE;
  const k = 0.55 + 0.35 * sat; // on retire une partie du gris pour garder la teinte franche
  return [0, 1, 2].map((i) => Math.max(0, Math.min(255, ((c[i] - m * k) / (M - m * k)) * 205)));
}

/** Un trait de crayon tremblé de (x0, y0) à (x1, y1), en trois segments décalés de ±j. */
function trait(ctx, x0, y0, x1, y1, j, s) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const a = (hs(s) - 0.5) * j, b = (hs(s + 1) - 0.5) * j;
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + dx * 0.34 + nx * a, y0 + dy * 0.34 + ny * a);
  ctx.lineTo(x0 + dx * 0.68 + nx * b, y0 + dy * 0.68 + ny * b);
  ctx.lineTo(x1, y1);
}

export function draw(ctx, img, W, H) {
  const CS = tailleCase(img, W), k = W / img.w, P = CS * k;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(papier(W, H), 0, 0);
  const bouge = Math.floor(img.now / 140) * 7919; // les traits changent un peu, 7 fois par seconde
  const A = -0.62, ca = Math.cos(A), sa = Math.sin(A), cb = Math.cos(A + 1.45), sb = Math.sin(A + 1.45);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, P * 0.13);
  // le sol, au graphite
  if (img.sol != null) {
    ctx.strokeStyle = `rgba(${GRAPHITE},0.55)`;
    ctx.beginPath();
    const y = img.sol * k;
    for (let x = 0; x < W; x += P * 6) trait(ctx, x, y + (hs(x | 0) - 0.5) * P * 0.3, x + P * 6.4, y + (hs((x | 0) + 9) - 0.5) * P * 0.3, P * 0.4, x | 0);
    ctx.stroke();
  }
  for (let gy = 0; gy < img.h; gy += CS)
    for (let gx = 0; gx < img.w; gx += CS) {
      const c = cellule(img, gx, gy, CS, CS);
      if (!c) continue;
      const v = intensite(c);
      if (v < 0.1) continue;
      const m = mine(c), col = `${m[0] | 0},${m[1] | 0},${m[2] | 0}`, cx = (gx + CS / 2) * k, cy = (gy + CS / 2) * k;
      const s = (gx * 73856093) ^ (gy * 19349663) ^ bouge;
      // lavis : une tache ronde et pâle, qui déborde un peu de la case ; les lueurs faibles n'ont que lui
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(${col},${0.06 + v * v * 0.3})`;
      ctx.beginPath();
      ctx.arc(cx + (hs(s + 70) - 0.5) * P * 0.3, cy + (hs(s + 71) - 0.5) * P * 0.3, P * 0.78, 0, 6.2832);
      ctx.fill();
      if (v < 0.22) continue;
      ctx.globalCompositeOperation = "source-over";
      // hachures : 1 à 3 longs traits parallèles, croisés là où l'effet est le plus lumineux
      const n = v > 0.6 ? 3 : v > 0.38 ? 2 : 1, half = P * 0.95;
      ctx.strokeStyle = `rgba(${col},${Math.min(0.95, 0.3 + v * 0.6)})`;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const o = ((i + 0.5) / n - 0.5) * P * 0.9 + (hs(s + i * 5) - 0.5) * P * 0.25, l = half * (0.75 + hs(s + i * 5 + 2) * 0.4);
        const ox = -sa * o, oy = ca * o;
        trait(ctx, cx + ox - ca * l, cy + oy - sa * l, cx + ox + ca * l, cy + oy + sa * l, P * 0.35, s + i * 5 + 3);
      }
      if (v > 0.82) {
        const l = half * 0.8, o = (hs(s + 40) - 0.5) * P * 0.4;
        trait(ctx, cx - sb * o - cb * l, cy + cb * o - sb * l, cx - sb * o + cb * l, cy + cb * o + sb * l, P * 0.3, s + 41);
      }
      ctx.stroke();
    }
  ctx.globalCompositeOperation = "source-over";
}
