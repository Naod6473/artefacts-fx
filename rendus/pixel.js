// Pixel : l'effet tel quel, agrandi sans lissage.
export const meta = { id: "pixel", nom: { fr: "Pixel", en: "Pixel" } };

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
  t.d.data.set(img.fond);
  t.x.putImageData(t.d, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(t.c, 0, 0, W, H);
}
