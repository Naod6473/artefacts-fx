// Branche une pièce d'ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art, MIT, Copyright (c) 2026
// ASCII Magic) sur le moteur d'Artefacts. La pièce reste telle quelle : elle rend à chaque instant une grille de
// caractères et de clés de couleur. Ici, chaque case devient un bloc de pixels (le dessin du caractère, ou pour les
// scènes peintes en demi-teintes un aplat de sa couleur à la luminosité du caractère), dans le tampon commun à tous
// les effets : les 11 rendus marchent donc dessus comme sur les autres. Code d'Artefacts, MIT.
import { masque, encre } from "./glyphes.js";

const ENCRE = "#e4e4e7"; // la couleur du texte sans clé de couleur, comme dans le lecteur d'origine
// Les mots-clés de mise en page du site d'origine (bannière, fond d'écran, README…) ne disent rien de l'effet.
const SANS = new Set(["hero", "wallpaper", "readme", "halftone", "banner"]);

const hexVers = (h) => {
  const v = parseInt(h.slice(1, 7), 16);
  return (255 << 24) | ((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255);
};
const assombrir = (c, k) => (255 << 24) | (Math.round(((c >>> 16) & 255) * k) << 16) | (Math.round(((c >>> 8) & 255) * k) << 8) | Math.round((c & 255) * k);

/**
 * Le module d'un effet à partir d'une pièce : { meta, create }.
 * source : le meta de la pièce ; piece : sa fonction create() d'origine (rend une fonction t → image).
 * Les scènes peintes (meta.cell === "square") font 2 × 2 pixels par case, le texte 4 × 8 (3 × 6 au-delà de 100 colonnes).
 */
export function asciiFx(source, piece) {
  const carre = source.cell === "square";
  const cw = carre ? 2 : source.cols > 100 ? 3 : 4, ch = carre ? 2 : cw * 2;
  const cles = Object.keys(source.palette ?? {});
  const meta = {
    name: source.name,
    desc: source.note,
    author: "ASCII Magic",
    tags: [...new Set(source.tags.filter((t) => !SANS.has(t)).concat("ascii", "loop"))],
    size: [source.cols * cw, source.rows * ch],
    origin: [0, 0],
    duration: 12,
    loop: true,
    fps: source.fps ?? 24,
    bg: "dark",
    options: cles.length ? { palette: cles.map((k) => source.palette[k]) } : {},
    ascii: { slug: source.slug, categorie: source.category, cases: [source.cols, source.rows], carre },
  };
  const create = (o) => {
    const rendre = piece();
    // la pièce garde son propre temps : certaines (simulations, mini-jeux) avancent pas à pas
    let t = 0, image = null, quand = -1;
    const masques = new Map(), couleurs = new Map();
    let palette = null, sourcePal; // sourcePal : undefined tant qu'aucune palette n'est prête
    const couleur = (cle, pal) => {
      if (pal !== sourcePal) {
        // palette de l'effet (réglable dans l'atelier) ou palette propre à l'image
        sourcePal = pal;
        palette = new Map();
        if (pal === null) cles.forEach((k, i) => palette.set(k, hexVers(o.palette?.[i] ?? source.palette[k])));
        else for (const k in pal) palette.set(k, hexVers(pal[k]));
        couleurs.clear();
      }
      return palette.get(cle) ?? hexVers(ENCRE);
    };
    return {
      update(dt) {
        t += dt;
      },
      draw(p) {
        if (quand !== t) (image = rendre(t)), (quand = t);
        const texte = typeof image === "string" ? image : image.text;
        const cl = typeof image === "string" ? null : image.color;
        const pal = typeof image === "object" && image.palette ? image.palette : null;
        const W = p.w, C = p.C, fade = p.fade;
        const x0 = Math.round(p.tx) - p.ox, y0 = Math.round(p.ty) - p.oy;
        let col = 0, ligne = 0, j = 0;
        for (let i = 0; i < texte.length; i++) {
          const c = texte[i];
          if (c === "\n") { ligne++; col = 0; j++; continue; }
          // le calque de couleur suit le texte case par case (les caractères hors BMP n'existent pas ici)
          const k = cl ? cl[j] : " ";
          j++;
          const cx = col++;
          if (c === " ") continue;
          const base = couleur(k === " " ? null : k, pal);
          const sx = x0 + cx * cw, sy = y0 + ligne * ch;
          if (carre) {
            // scène peinte : la couleur de la case à la luminosité de son niveau (▁ … █)
            const cle = c + k;
            let v = couleurs.get(cle);
            if (v === undefined) couleurs.set(cle, (v = assombrir(base, encre(c))));
            for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) poser(C, W, p.h, sx + x, sy + y, v, fade);
            continue;
          }
          let m = masques.get(c);
          if (!m) masques.set(c, (m = masque(c, cw, ch)));
          for (let y = 0, q = 0; y < ch; y++)
            for (let x = 0; x < cw; x++, q++) {
              const a = m[q];
              if (!a) continue;
              poser(C, W, p.h, sx + x, sy + y, a === 255 ? base : assombrir(base, a / 255), fade);
            }
        }
      },
    };
  };
  return { meta, create };
}

// 4x4 ordonné : pendant le fondu de fin, les pixels s'éteignent en trame comme ceux des autres effets
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
function poser(C, W, H, x, y, c, fade) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  if (fade < 1 && fade <= BAYER[((y & 3) << 2) | (x & 3)]) return;
  C[y * W + x] = c;
}
