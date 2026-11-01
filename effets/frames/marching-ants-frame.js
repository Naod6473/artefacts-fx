// ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art), pièce « marching-ants-frame », MIT, Copyright (c) 2026 ASCII Magic
// (ascii-magic.com). Le fichier est la pièce d'origine ; seules les lignes marquées « Artefacts » la branchent sur le moteur.
/* marching-ants-frame: a rectangular selection frame with dashes marching around it. */
import { Grid, palette } from "../_ascii/lib/kit.js";
import { asciiFx } from "../_ascii/fx.js";

const meta = {
  slug: "marching-ants-frame",
  name: "Marching Ants Frame",
  category: "frames",
  note: "A rectangular selection frame with dashes marching clockwise around an empty middle.",
  tags: ["border", "frame", "selection", "readme", "box"],
  cols: 60, rows: 9, fps: 20,
  palette: palette(["#e6edf3", "#484f58", "#79c0ff", "#8b949e"]),
};

function perimeter(w, h) {
  const p = [];
  for (let x = 0; x < w; x++) p.push([x, 0, "h"]);
  for (let y = 1; y < h; y++) p.push([w - 1, y, "v"]);
  for (let x = w - 2; x >= 0; x--) p.push([x, h - 1, "h"]);
  for (let y = h - 2; y >= 1; y--) p.push([0, y, "v"]);
  return p;
}

function piece() {
  const { cols, rows } = meta;
  const g = new Grid(cols, rows);
  const P = perimeter(cols, rows);
  const corners = { "0,0": "┏", [`${cols - 1},0`]: "┓", [`0,${rows - 1}`]: "┗", [`${cols - 1},${rows - 1}`]: "┛" };
  return (t) => {
    g.clear();
    const step = Math.floor(t * 10);
    P.forEach(([x, y, d], i) => {
      const on = (((i - step) % 8) + 8) % 8 < 4;
      const c = corners[`${x},${y}`];
      if (c) { g.set(x, y, c, "0"); return; }
      if (d === "h") g.set(x, y, on ? "━" : "╌", on ? "0" : "1");
      else g.set(x, y, on ? "┃" : "╎", on ? "0" : "1");
    });
    // small resize handles at edge midpoints
    const mx = Math.floor(cols / 2), my = Math.floor(rows / 2);
    g.set(mx, 0, "■", "2"); g.set(mx, rows - 1, "■", "2");
    g.set(0, my, "■", "2"); g.set(cols - 1, my, "■", "2");
    return g.frame();
  };
}

// Artefacts : la pièce sur le moteur (une case = un bloc de pixels), donc dans les 11 rendus
const branchee = asciiFx(meta, piece);
const metaArtefacts = branchee.meta;
export const create = branchee.create;
export { metaArtefacts as meta };
