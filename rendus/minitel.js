// Minitel (vidéotex) : la mosaïque du Minitel, des cases de 2 × 3 points, chacune d'une seule des 8 couleurs du terminal.
import { tailleCase } from "./_commun.js";

export const meta = { id: "minitel", nom: { fr: "Minitel", en: "Minitel" } };

const COULEURS = [[255, 0, 0], [0, 255, 0], [255, 255, 0], [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255]];

export function draw(ctx, img, W, H) {
  const P = Math.max(1, Math.round(tailleCase(img, W) / 1.6)), k = W / img.w, S = img.noir;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  for (let cy = 0; cy < img.h; cy += P * 3)
    for (let cx = 0; cx < img.w; cx += P * 2) {
      // les 6 points de la case : allumés si assez lumineux ; la case prend la couleur la plus proche de leur moyenne
      let R = 0, G = 0, B = 0, n = 0;
      const points = [];
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 2; i++) {
          let r = 0, g = 0, b = 0, m = 0;
          for (let y = cy + j * P; y < cy + (j + 1) * P && y < img.h; y++)
            for (let x = cx + i * P; x < cx + (i + 1) * P && x < img.w; x++) {
              const q = (y * img.w + x) * 4;
              r += S[q]; g += S[q + 1]; b += S[q + 2]; m++;
            }
          if (!m) continue;
          r /= m; g /= m; b /= m;
          if (Math.max(r, g, b) > 60) { points.push([i, j]); R += r; G += g; B += b; n++; }
        }
      if (!n) continue;
      R /= n; G /= n; B /= n;
      const top = Math.max(R, G, B);
      let best = COULEURS[6], d0 = Infinity;
      for (const c of COULEURS) {
        const d = (c[0] - (R * 255) / top) ** 2 + (c[1] - (G * 255) / top) ** 2 + (c[2] - (B * 255) / top) ** 2;
        if (d < d0) { d0 = d; best = c; }
      }
      ctx.fillStyle = `rgb(${best})`;
      for (const [i, j] of points) ctx.fillRect((cx + i * P) * k, (cy + j * P) * k, Math.ceil(P * k), Math.ceil(P * k));
    }
}
