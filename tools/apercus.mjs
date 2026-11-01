// Image d'aperçu d'un effet (1200 × 630, le format des cartes Discord, X, Facebook…) : l'image la plus remplie de
// l'effet, sur sa scène, agrandie en pixels nets au centre d'un fond sombre. Utilisé par build.mjs.
import { loadEffect, renderFrames, upscale, canvas, isScreen } from "./lib/fxlib.mjs";
import { encodePNG } from "./lib/png.mjs";

export const LARGEUR = 1200, HAUTEUR = 630;

/** PNG (Buffer) de l'aperçu de l'effet id ("fire/torch"). */
export async function apercu(id) {
  const fx = await loadEffect(id);
  const ecran = isScreen(fx.meta);
  // les scènes d'ascii-magic-art durent 12 s et sont pleines dès le début : une image par seconde suffit (731 aperçus)
  const r = renderFrames(fx, { margin: ecran ? 0 : 8, fps: fx.meta.ascii ? 1 : Math.min(fx.meta.fps, 15) });
  // l'image où l'effet couvre le plus de pixels : le cœur de l'animation, ni le début vide ni la fin
  let meilleure = r.frames[0], max = -1;
  for (const f of r.frames) {
    let n = 0;
    for (let i = 3; i < f.clear.length; i += 4) if (f.clear[i] > 40) n++;
    if (n > max) { max = n; meilleure = f; }
  }
  // recadré sur ce qui est dessiné (avec de l'air autour) : une petite torche dans un grand cadre reste lisible
  let x0 = 0, y0 = 0, w = r.w, h = r.h;
  if (!ecran) {
    let a = r.w, b = r.h, c = -1, d = -1;
    for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) {
      if (meilleure.clear[(j * r.w + i) * 4 + 3] > 10) { a = Math.min(a, i); b = Math.min(b, j); c = Math.max(c, i); d = Math.max(d, j); }
    }
    if (c >= 0) {
      const marge = Math.max(6, Math.round(Math.max(c - a, d - b) * 0.2));
      x0 = Math.max(0, a - marge); y0 = Math.max(0, b - marge);
      w = Math.min(r.w, c + marge + 1) - x0; h = Math.min(r.h, d + marge + 1) - y0;
    }
  }
  const coupe = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) coupe.set(meilleure.color.subarray(((y0 + j) * r.w + x0) * 4, ((y0 + j) * r.w + x0 + w) * 4), j * w * 4);
  const k = Math.max(1, Math.floor(Math.min((LARGEUR - 120) / w, (HAUTEUR - 90) / h)));
  const img = upscale(coupe, w, h, k);
  const c = canvas(LARGEUR, HAUTEUR, [7, 9, 15, 255]);
  const x = Math.round((LARGEUR - w * k) / 2), y = Math.round((HAUTEUR - h * k) / 2);
  // un liseré autour de la scène, comme sur le site
  const bord = [28, 36, 51, 255];
  for (let i = -1; i <= w * k; i++) for (const yy of [y - 1, y + h * k]) c.data.set(bord, (yy * LARGEUR + x + i) * 4);
  for (let j = -1; j <= h * k; j++) for (const xx of [x - 1, x + w * k]) c.data.set(bord, ((y + j) * LARGEUR + xx) * 4);
  c.paste(img, w * k, h * k, x, y);
  return encodePNG(LARGEUR, HAUTEUR, c.data);
}
