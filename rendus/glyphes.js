// Glyphes de code : · : 0 1 hexa # █ selon la luminosité, les chiffres changent au fil du temps.
import { hs, tailleCase, fondTexte, grilleCaracteres, intensite, rgb } from "./_commun.js";

export const meta = { id: "glyphes", nom: { fr: "Glyphes de code", en: "Code glyphs" } };

const HEX = "0123456789ABCDEF";

export function draw(ctx, img, W, H) {
  const CS = tailleCase(img, W), tk = Math.floor(img.now / 180);
  fondTexte(ctx, img, W, H, CS);
  grilleCaracteres(ctx, img, W, CS, (c, gx, gy) => {
    const v = intensite(c);
    if (v < 0.06) return null;
    const id = gx * 31 + gy * 17;
    const ch = v < 0.22 ? "·" : v < 0.38 ? ":" : v < 0.55 ? (hs(id + tk) < 0.5 ? "0" : "1") : v < 0.75 ? HEX[Math.floor(hs(id * 3 + tk) * 16)] : v < 0.9 ? "#" : "█";
    return [ch, rgb(c), Math.min(1, 0.45 + v)];
  });
}
