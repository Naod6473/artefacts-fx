// ASCII classique : la rampe « .:-=+*#%@ » selon la luminosité, en couleur.
import { tailleCase, fondTexte, grilleCaracteres, intensite, rgb } from "./_commun.js";

export const meta = { id: "ascii", nom: { fr: "ASCII", en: "ASCII" } };

export const RAMPE = " .:-=+*#%@";

export function draw(ctx, img, W, H) {
  const CS = tailleCase(img, W);
  fondTexte(ctx, img, W, H, CS);
  grilleCaracteres(ctx, img, W, CS, (c) => {
    const v = intensite(c);
    if (v < 0.06) return null;
    return [RAMPE[Math.min(9, Math.max(1, Math.round(v * 9)))], rgb(c)];
  });
}
