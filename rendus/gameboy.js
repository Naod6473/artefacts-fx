// Game Boy : quatre verts, trame de Bayer pour les dégradés, gros pixels nets. La lumière de l'effet décide de la teinte.
export const meta = { id: "gameboy", nom: { fr: "Game Boy", en: "Game Boy" } };

const TEINTES = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
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
  const S = img.noir, D = t.d.data;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      // luminance perçue, relevée pour que les lueurs sombres restent visibles
      const l = Math.sqrt((S[i] * 0.3 + S[i + 1] * 0.59 + S[i + 2] * 0.11) / 255);
      const n = Math.max(0, Math.min(3, Math.round(l * 3 + BAYER[(y & 3) * 4 + (x & 3)] * 0.9)));
      const c = TEINTES[n];
      D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255;
    }
  // le sol, en deuxième teinte : on garde le repère des effets au sol
  if (img.sol != null && img.sol < img.h) for (let x = 0; x < img.w; x++) D.set(TEINTES[1], (img.sol * img.w + x) * 4);
  t.x.putImageData(t.d, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(t.c, 0, 0, W, H);
}
