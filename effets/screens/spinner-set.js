// ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art), pièce « spinner-set », MIT, Copyright (c) 2026 ASCII Magic
// (ascii-magic.com). Le fichier est la pièce d'origine ; seules les lignes marquées « Artefacts » la branchent sur le moteur.
/* spinner-set: a labelled grid of twelve classic terminal spinners. */
import { Grid, palette } from "../_ascii/lib/kit.js";
import { asciiFx } from "../_ascii/fx.js";

const meta = {
  slug: "spinner-set",
  name: "Spinner Set",
  category: "screens",
  note: "Twelve classic terminal spinners side by side, each labelled with its name and frame count.",
  tags: ["loader", "spinner", "terminal", "cli", "readme"],
  cols: 58, rows: 16, fps: 20,
  palette: palette(["#e6edf3", "#8b949e", "#7ee787", "#79c0ff", "#ffa657", "#ff7b72", "#d2a8ff", "#484f58", "#f2cc60", "#56d4dd"]),
};

const BALL = [];
for (let i = 0; i < 10; i++) {
  const p = i < 5 ? i : 9 - i;
  BALL.push("[" + " ".repeat(p) + "●" + " ".repeat(4 - p) + "]");
}

const S = [
  ["braille", "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏", 12, "3"],
  ["line", "-\\|/", 8, "0"],
  ["dots", "⣾⣽⣻⢿⡿⣟⣯⣷", 10, "2"],
  ["arc", "┤┘┴└├┌┬┐", 8, "6"],
  ["bounce", "⠁⠂⠄⡀⢀⠠⠐⠈", 10, "4"],
  ["pulse", "·•●•", 6, "5"],
  ["grow", "▁▂▃▄▅▆▇█▇▆▅▄▃▂", 14, "8"],
  ["quadrant", "▖▘▝▗", 6, "9"],
  ["arrows", "←↖↑↗→↘↓↙", 8, "3"],
  ["toggle", "■□", 4, "2"],
  ["shade", "░▒▓█▓▒", 8, "6"],
  ["ball", BALL, 10, "4"],
];

function piece() {
  const g = new Grid(meta.cols, meta.rows);
  const W = meta.cols;
  return (t) => {
    g.clear();
    g.hline(0, W - 1, 0, "─", "7"); g.hline(0, W - 1, meta.rows - 1, "─", "7");
    g.text(2, 0, " spinners ", "0");
    g.text(W - 30, 0, " 12 styles · own frame rates ", "1");
    g.text(3, 1, "   name", "1"); g.text(17, 1, "frames", "1"); g.text(25, 1, "fps", "1"); g.text(31, 1, "preview", "1");
    g.hline(1, W - 2, 2, "─", "7");
    // braille cells can render wider in some fonts, so each row ends with its preview strip
    S.forEach(([name, fr, fps, c], i) => {
      const y = 3 + i;
      const n = fr.length, f = Math.floor(t * fps);
      const cur = fr[f % n];
      g.text(3, y, cur, c);
      g.text(6, y, name, "0");
      g.text(17, y, String(n).padStart(3), "1");
      g.text(25, y, String(fps).padStart(3), "1");
      if (name === "ball") {
        g.text(31, y, cur, c);
        g.text(39, y, "loading" + ".".repeat(Math.floor(t * 2) % 4), "1");
      } else {
        for (let k = 0; k < 22; k++) g.set(31 + k, y, fr[(f + k) % n], k % 2 ? c : "7");
      }
    });
    return g.frame();
  };
}

// Artefacts : la pièce sur le moteur (une case = un bloc de pixels), donc dans les 11 rendus
const branchee = asciiFx(meta, piece);
const metaArtefacts = branchee.meta;
export const create = branchee.create;
export { metaArtefacts as meta };
