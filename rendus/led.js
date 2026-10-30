// Matrice LED : une diode ronde par case, quatre niveaux d'éclat, les diodes éteintes restent visibles, halo additif.
import { tailleCase, cellule } from "./_commun.js";

export const meta = { id: "led", nom: { fr: "Matrice LED", en: "LED matrix" } };

export function draw(ctx, img, W, H) {
  const CS = Math.max(2, Math.round(tailleCase(img, W) * 1.5)), k = W / img.w, r = CS * k * 0.38;
  ctx.fillStyle = "#06080d";
  ctx.fillRect(0, 0, W, H);
  const allumees = [];
  ctx.fillStyle = "#121827";
  ctx.beginPath();
  for (let gy = 0; gy < img.h; gy += CS)
    for (let gx = 0; gx < img.w; gx += CS) {
      const cx = (gx + CS / 2) * k, cy = (gy + CS / 2) * k, c = cellule(img, gx, gy, CS, CS);
      const v = c ? c[3] * (0.4 + 0.6 * Math.sqrt(c[4])) : 0;
      const niveau = Math.round(v * 4) / 4;
      if (niveau > 0) allumees.push([cx, cy, c, niveau]);
      else if (img.sol != null && Math.abs(gy + CS / 2 - img.sol) < CS / 2) allumees.push([cx, cy, [58, 69, 102], 0.5]);
      else { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
    }
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  for (const [cx, cy, c, n] of allumees) {
    // couleur saturée vers le haut, comme une diode : la teinte de la case, poussée à fond
    const m = Math.max(c[0], c[1], c[2], 1), f = 255 / m;
    const col = `${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0}`;
    ctx.globalAlpha = n * 0.22;
    ctx.fillStyle = `rgb(${col})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35 + n * 0.65;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
