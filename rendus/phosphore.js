// Phosphore CRT : écran vert monochrome, rémanence (l'image précédente s'efface lentement) et lignes de balayage.
import { tailleCase, fondTexte, grilleCaracteres, intensite } from "./_commun.js";
import { RAMPE } from "./ascii.js";

export const meta = { id: "phosphore", nom: { fr: "Phosphore CRT", en: "CRT phosphor" } };

const NOIR = "#030803";

export function draw(ctx, img, W, H) {
  const CS = tailleCase(img, W);
  if (img.frais) fondTexte(ctx, img, W, H, CS, NOIR, false);
  else {
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = NOIR;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  grilleCaracteres(ctx, img, W, CS, (c) => {
    const v = intensite(c);
    if (v < 0.06) return null;
    return [RAMPE[Math.min(9, Math.max(1, Math.round(v * 9)))], `rgb(${(v * 120) | 0},${Math.min(255, 60 + v * 220) | 0},${(v * 90) | 0})`];
  });
  ctx.fillStyle = "rgba(0,0,0,.28)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}
