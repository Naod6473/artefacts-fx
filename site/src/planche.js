// Planche de sprites : toutes les images d'un effet, dans un rendu, côte à côte dans un PNG ; et les fichiers Godot 4
// qui la découpent (SpriteFrames .tres + petite scène AnimatedSprite2D .tscn).
import { composite, hex } from "../../core/index.js";
import { Lecteur } from "./lecteur.js";
import { parId } from "../../rendus/index.js";

const NOIR = hex("#000000");
export const COTE_MAX = 8192; // au-delà, beaucoup de cartes graphiques refusent la texture

/** Nombre d'images et taille d'une case, sans rien dessiner (pour afficher la taille avant de générer). */
export function dimensions(meta, { echelle, fps }) {
  const [w, h] = meta.size;
  const n = Math.max(1, Math.round((meta.duration ?? 1) * fps));
  const cols = Math.ceil(Math.sqrt(n * (h / w))) || 1;
  const lignes = Math.ceil(n / cols);
  return { n, cols, lignes, fw: w * echelle, fh: h * echelle, largeur: cols * w * echelle, hauteur: lignes * h * echelle };
}

/**
 * Dessine la planche. Pixel : vraie transparence. Autres rendus : dessinés sur noir, puis le noir devient transparent
 * (alpha = canal le plus fort), ce qui garde les lueurs.
 */
export function planche(mod, { rendu, echelle, fps, transparent }) {
  const meta = { duration: 1, ...mod.meta };
  const d = dimensions(meta, { echelle, fps });
  const [w, h] = meta.size;
  const lecteur = new Lecteur(mod, { aspect: w / h, marge: 1 });
  lecteur.meta.actor = false; // pas de personnage de démonstration dans un sprite
  lecteur.img.sol = null; // ni ligne de sol
  const W = lecteur.W, H = lecteur.H;
  // le tampon du lecteur peut faire un pixel de plus que la taille de l'effet (arrondi) : les cases suivent le tampon
  if (W !== w || H !== h) Object.assign(d, { fw: W * echelle, fh: H * echelle, largeur: d.cols * W * echelle, hauteur: d.lignes * H * echelle });
  const atlas = document.createElement("canvas");
  atlas.width = d.largeur;
  atlas.height = d.hauteur;
  const actx = atlas.getContext("2d");
  const petit = document.createElement("canvas");
  petit.width = W;
  petit.height = H;
  const pctx = petit.getContext("2d");
  const pimg = pctx.createImageData(W, H);
  const caseCv = document.createElement("canvas");
  caseCv.width = d.fw;
  caseCv.height = d.fh;
  const cctx = caseCv.getContext("2d", { willReadFrequently: true });
  const r = parId[rendu] ?? parId.pixel;

  lecteur.aller(0);
  const pas = 1 / (meta.fps ?? 30);
  for (let i = 0; i < d.n; i++) {
    const cible = i / fps;
    // avance au pas propre à l'effet jusqu'au temps de cette image
    while (lecteur.inst && lecteur.inst.t + pas / 2 < cible) lecteur.inst.update(pas);
    lecteur.composer();
    const x = (i % d.cols) * d.fw, y = Math.floor(i / d.cols) * d.fh;
    cctx.clearRect(0, 0, d.fw, d.fh);
    if (r.meta.id === "pixel") {
      composite(lecteur.frame, pimg.data, transparent ? null : NOIR);
      pctx.putImageData(pimg, 0, 0);
      cctx.imageSmoothingEnabled = false;
      cctx.drawImage(petit, 0, 0, d.fw, d.fh);
    } else {
      composite(lecteur.frame, lecteur.img.noir, NOIR);
      lecteur.img.now = cible * 1000;
      lecteur.img.frais = i === 0;
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      r.draw(cctx, lecteur.img, d.fw, d.fh);
      if (transparent) {
        const px = cctx.getImageData(0, 0, d.fw, d.fh), o = px.data;
        for (let k = 0; k < o.length; k += 4) {
          const a = Math.max(o[k], o[k + 1], o[k + 2]);
          if (a) { o[k] = (o[k] * 255) / a; o[k + 1] = (o[k + 1] * 255) / a; o[k + 2] = (o[k + 2] * 255) / a; }
          o[k + 3] = a;
        }
        cctx.putImageData(px, 0, 0);
      }
    }
    actx.drawImage(caseCv, x, y);
  }
  return { atlas, ...d, fps, boucle: !!meta.loop, origine: meta.origin ?? [0, 0] };
}

/** SpriteFrames Godot 4 : une AtlasTexture par image, découpée dans le PNG placé à cheminPng (res://…). */
export function spriteFrames(p, cheminPng) {
  const sous = [], images = [];
  for (let i = 0; i < p.n; i++) {
    const x = (i % p.cols) * p.fw, y = Math.floor(i / p.cols) * p.fh;
    sous.push(`[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]\natlas = ExtResource("1_png")\nregion = Rect2(${x}, ${y}, ${p.fw}, ${p.fh})\n`);
    images.push(`{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${i}")\n}`);
  }
  return `[gd_resource type="SpriteFrames" load_steps=${p.n + 2} format=3]

[ext_resource type="Texture2D" path="${cheminPng}" id="1_png"]

${sous.join("\n")}
[resource]
animations = [{
"frames": [${images.join(", ")}],
"loop": ${p.boucle},
"name": &"default",
"speed": ${p.fps.toFixed(1)}
}]
`;
}

/** Scène prête à instancier : AnimatedSprite2D qui joue l'animation, placé pour que l'origine de l'effet soit en (0, 0). */
export function scene(p, cheminTres, nom, echelle) {
  const [ox, oy] = p.origine;
  return `[gd_scene load_steps=2 format=3]

[ext_resource type="SpriteFrames" path="${cheminTres}" id="1_frames"]

[node name="${nom}" type="AnimatedSprite2D"]
texture_filter = 1
sprite_frames = ExtResource("1_frames")
autoplay = "default"
centered = false
offset = Vector2(${-ox * echelle}, ${-oy * echelle})
`;
}
