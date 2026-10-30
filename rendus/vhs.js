// VHS : couleurs qui bavent (rouge et bleu décalés), lignes qui tremblent, une bande de défilement qui descend,
// image un peu floue et lignes de balayage. Tout dépend de img.now : rien de tiré au hasard.
import { hs } from "./_commun.js";

export const meta = { id: "vhs", nom: { fr: "VHS", en: "VHS" } };

const tampons = new WeakMap();

export function draw(ctx, img, W, H) {
  let t = tampons.get(img);
  if (!t || t.c.width !== img.w || t.c.height !== img.h) {
    const c = document.createElement("canvas");
    c.width = img.w;
    c.height = img.h;
    const x = c.getContext("2d");
    t = { c, x, d: x.createImageData(img.w, img.h) };
    tampons.set(img, t);
  }
  const S = img.noir, D = t.d.data, w = img.w, h = img.h;
  const pas = Math.floor(img.now / 70), bande = ((img.now / 4000) % 1.3) * h - 0.15 * h, haut = Math.max(2, h * 0.06);
  for (let y = 0; y < h; y++) {
    const dans = y > bande && y < bande + haut;
    // tremblement de la ligne : léger partout, fort dans la bande
    const dx = Math.round((hs(y * 7919 + pas) - 0.5) * (dans ? 6 : 0.9));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, px = (xx) => (y * w + Math.max(0, Math.min(w - 1, xx))) * 4;
      const r = S[px(x - dx - 1)], g = S[px(x - dx) + 1], b = S[px(x - dx + 1) + 2];
      const bruit = dans ? hs(x * 31 + y * 977 + pas) * 70 : 0;
      // noir un peu délavé, comme une cassette : le fond tire sur le bleu nuit
      D[i] = Math.min(255, 14 + r * 0.95 + bruit);
      D[i + 1] = Math.min(255, 12 + g * 0.9 + bruit);
      D[i + 2] = Math.min(255, 26 + b * 0.95 + bruit);
      D[i + 3] = 255;
    }
  }
  t.x.putImageData(t.d, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(t.c, 0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,.22)";
  const l = Math.max(2, Math.round(H / 180));
  for (let y = 0; y < H; y += l * 2) ctx.fillRect(0, y, W, l);
  ctx.font = `700 ${Math.max(10, Math.round(H / 22))}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(235,240,255,.85)";
  ctx.fillText("PLAY ▶", W * 0.04, H * 0.05);
}
