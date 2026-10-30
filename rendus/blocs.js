// Blocs : chaque case coupée en deux demi-blocs ▀▄, chacun de la couleur moyenne de sa moitié.
import { tailleCase, fondTexte, cellule, rgb, SCENE } from "./_commun.js";

export const meta = { id: "blocs", nom: { fr: "Blocs ▀▄", en: "Blocks ▀▄" } };

export function draw(ctx, img, W, H) {
  const CS = tailleCase(img, W), k = W / img.w, h1 = Math.ceil(CS / 2), h2 = Math.floor(CS / 2);
  fondTexte(ctx, img, W, H, CS);
  const allume = (c) => c && c[3] > 0.12;
  for (let gy = 0; gy < img.h; gy += CS)
    for (let gx = 0; gx < img.w; gx += CS) {
      const a = cellule(img, gx, gy, CS, h1), b = cellule(img, gx, gy + h1, CS, h2);
      if (allume(a)) { ctx.fillStyle = rgb(a); ctx.fillRect(gx * k, gy * k, CS * k, (CS / 2) * k); }
      if (allume(b)) { ctx.fillStyle = rgb(b); ctx.fillRect(gx * k, (gy + CS / 2) * k, CS * k, (CS / 2) * k); }
    }
  // un fin trait entre les colonnes, comme entre deux caractères d'un terminal
  ctx.fillStyle = SCENE;
  for (let gx = 0; gx < img.w; gx += CS) ctx.fillRect(gx * k - 0.5, 0, 1, H);
}
