// ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art), pièce « rotozoomer », MIT, Copyright (c) 2026 ASCII Magic
// (ascii-magic.com). Le fichier est la pièce d'origine ; seules les lignes marquées « Artefacts » la branchent sur le moteur.
/* rotozoomer: a classic rotating, zooming XOR texture filling the screen. */
import { Grid, palette, hsl, KEYS } from "../_ascii/lib/kit.js";
import { asciiFx } from "../_ascii/fx.js";

const N = 32;
const COLS = [...Array.from({ length: 16 }, (_, i) => hsl(330 + i * 3, 85, 25 + i * 3.6)), ...Array.from({ length: 16 }, (_, i) => hsl(195 + i * 3, 80, 18 + i * 3.6))];

const meta = {
  slug: "rotozoomer",
  name: "Rotozoomer",
  category: "demoscene",
  note: "The demoscene rotozoomer, a checkered XOR texture spinning and zooming in and out.",
  tags: ["demoscene", "retro", "pattern", "wallpaper", "hero"],
  cols: 84, rows: 30, fps: 30,
  palette: palette(COLS),
};

const CH = "░▒▓█";

function piece() {
  const { cols, rows } = meta;
  const g = new Grid(cols, rows);
  return (t) => {
    g.clear();
    const a = t * 0.45;
    const zoom = 0.3 + 0.18 * Math.sin(t * 0.6);
    const ca = Math.cos(a) * zoom, sa = Math.sin(a) * zoom;
    const ox = Math.sin(t * 0.3) * 16, oy = t * 2.5;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = x - cols / 2, py = (y - rows / 2) * 2;
      const u = px * ca - py * sa + ox, v = px * sa + py * ca + oy;
      const iu = Math.floor(u), iv = Math.floor(v);
      const check = ((iu >> 3) + (iv >> 3)) & 1;
      const sh = ((iu ^ iv) & 7) + ((((iu & 7) === 0) || ((iv & 7) === 0)) ? 8 : 4);
      const k = Math.min(15, sh);
      g.set(x, y, CH[Math.min(3, k >> 2)], KEYS[(check ? 0 : 16) + k]);
    }
    return g.frame();
  };
}

// Artefacts : la pièce sur le moteur (une case = un bloc de pixels), donc dans les 11 rendus
const branchee = asciiFx(meta, piece);
const metaArtefacts = branchee.meta;
export const create = branchee.create;
export { metaArtefacts as meta };
