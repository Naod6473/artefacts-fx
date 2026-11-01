// ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art), pièce « tv-static », MIT, Copyright (c) 2026 ASCII Magic
// (ascii-magic.com). Le fichier est la pièce d'origine ; seules les lignes marquées « Artefacts » la branchent sur le moteur.
/* tv-static: an untuned television, snowy static with a slow rolling bar. */
import { Grid, palette, gradient, KEYS } from "../_ascii/lib/kit.js";
import { asciiFx } from "../_ascii/fx.js";

const GREY = gradient(["#0b0b0d", "#3a3a40", "#8a8a92", "#d8d8de", "#ffffff"], 12);

const meta = {
  slug: "tv-static",
  name: "TV Static",
  category: "demoscene",
  note: "An untuned television full of snowy static, a brighter bar rolling slowly down the screen.",
  tags: ["static", "noise", "retro", "glitch", "404", "wallpaper"],
  cols: 80, rows: 28, fps: 24,
  palette: palette([...GREY, "#5cff7a"]),
};

const CH = " .:░▒▓█";

function piece() {
  const { cols, rows } = meta;
  const g = new Grid(cols, rows);
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = Math.imul(h ^ (h >>> 15), 2654435761);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (t) => {
    g.clear();
    const f = Math.floor(t * 24);
    const bar = ((t * 5) % (rows + 10)) - 5;
    for (let y = 0; y < rows; y++) {
      const db = Math.abs(y - bar);
      const lift = db < 3 ? 0.32 * (1 - db / 3) : (y > bar + 3 && y < bar + 6 ? -0.3 : 0);
      const tear = hash(0, y, f >> 2) > 0.93 ? Math.floor(hash(1, y, f) * 6) : 0;
      const scan = y % 2 ? 0.92 : 1;
      for (let x = 0; x < cols; x++) {
        const n = hash(x + tear, y, f);
        const n2 = hash(x >> 1, y, f + 7);
        let v = (n * 0.7 + n2 * 0.3) * scan + lift - 0.05;
        v = Math.max(0, Math.min(0.999, v));
        g.set(x, y, CH[Math.floor(v * CH.length)], KEYS[Math.floor(v * 12)]);
      }
    }
    if (Math.floor(t * 1.2) % 2 === 0) g.text(cols - 8, 1, " CH 03 ", "c");
    return g.frame();
  };
}

// Artefacts : la pièce sur le moteur (une case = un bloc de pixels), donc dans les 11 rendus
const branchee = asciiFx(meta, piece);
const metaArtefacts = branchee.meta;
export const create = branchee.create;
export { metaArtefacts as meta };
