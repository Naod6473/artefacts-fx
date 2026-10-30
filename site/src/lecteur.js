// Le lecteur : fait tourner un effet dans un tampon de pixels, puis le passe au rendu choisi.
import { createFrame, clearFrame, createFx, composite, drawActor, painterFor, stockActor, actorAlphaOf, hex } from "../../core/index.js";
import { parId } from "../../rendus/index.js";

const SCENE = hex("#0e1220"), NOIR = hex("#000000"), SOL = hex("#141a2e"), BORD = hex("#3a4566");

/** Plein écran : un effet au format 16/9 d'au moins 320 px de large. */
export const pleinEcran = (m) => m.size[0] >= 320 && Math.abs(m.size[0] / m.size[1] - 16 / 9) < 0.05;

// chaque pas de n'importe quel lecteur prend un numéro unique : une vue sait ainsi si son image a changé
let horloge = 0;

export class Lecteur {
  /** mod : le module de l'effet ({ meta, draw } ou { meta, create }). */
  constructor(mod, { aspect, marge } = {}) {
    const meta = { fps: 30, bg: "dark", loop: false, duration: 1, options: {}, tags: [], ...mod.meta };
    this.mod = { ...mod, meta };
    this.meta = meta;
    aspect ??= pleinEcran(meta) ? 16 / 9 : 4 / 3;
    marge ??= pleinEcran(meta) ? 1 : 1.2;
    const [w, h] = meta.size, [ox, oy] = meta.origin;
    this.W = Math.ceil(Math.max(w * marge, h * marge * aspect));
    this.H = Math.ceil(this.W / aspect);
    this.x = Math.floor((this.W - w) / 2) + ox;
    this.y = Math.floor((this.H - h) / 2) + oy;
    this.frame = createFrame(this.W, this.H);
    const sol = meta.bg === "ground";
    this.decor = new Uint32Array(this.W * this.H);
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++) this.decor[y * this.W + x] = sol && y >= this.y ? (y === this.y ? BORD : SOL) : SCENE;
    const n = this.W * this.H * 4;
    this.img = { w: this.W, h: this.H, noir: new Uint8ClampedArray(n), fond: new Uint8ClampedArray(n), sol: sol ? this.y : null, now: 0, frais: true };
    this.graine = 1;
    this.options = {};
    this.vitesse = 1;
    this.enPause = false;
    this.relancer();
  }

  /** Saute au temps t (secondes) depuis le début de l'effet. */
  aller(t) {
    this.graine--;
    this.relancer();
    if (!this.inst) return;
    try { this.inst.update(t); } catch (e) { this.erreur = String(e.message || e); }
    this.images = ++horloge;
  }

  /** Temps courant dans l'effet, entre 0 et sa durée. */
  get temps() {
    if (!this.inst) return 0;
    const m = this.meta;
    return m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
  }

  relancer() {
    try {
      this.inst = createFx(this.mod, { x: this.x, y: this.y, seed: this.graine++, ...this.options });
      this.erreur = null;
    } catch (e) {
      this.inst = null;
      this.erreur = String(e.message || e);
    }
    this.acc = 0;
    this.attente = 0;
    this.images = ++horloge;
  }

  /** Avance le temps de dt secondes, au pas fixe de l'effet ; un effet qui ne boucle pas repart après une courte pause. */
  avancer(dt) {
    if (!this.inst || this.enPause) return;
    const m = this.meta, pas = 1 / m.fps;
    this.acc = Math.min(this.acc + dt * this.vitesse, 0.25);
    while (this.acc >= pas) {
      this.acc -= pas;
      this.images = ++horloge;
      if (!m.loop && this.inst.t >= m.duration) {
        this.attente += pas;
        if (this.attente > 0.45) this.relancer();
        if (!this.inst) return;
      } else {
        try { this.inst.update(pas); } catch (e) { this.erreur = String(e.message || e); }
      }
    }
  }

  composer() {
    const f = clearFrame(this.frame);
    if (!this.inst) return;
    const m = this.meta;
    try {
      this.inst.draw(f, "back");
      const t = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
      if (m.actor) drawActor(painterFor(f).place(this.x, this.y, false), this.inst.options.actor ?? stockActor(), actorAlphaOf(this.mod, t, this.inst.options));
      this.inst.draw(f, "front");
    } catch (e) {
      this.erreur = String(e.message || e);
    }
  }

  /** Dessine l'image courante sur le canvas cv avec le rendu idRendu. */
  dessiner(cv, idRendu, now) {
    // l'image de l'effet n'est composée qu'une fois par pas, même si plusieurs vues la montrent (panneau, comparaison)
    if (this.compose !== this.images) { this.composer(); this.compose = this.images; this.versFond = this.versNoir = false; }
    // clientWidth et pas getBoundingClientRect : une vue qui s'anime en transform (le zoom) garde sa taille de tampon
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(cv.clientWidth * dpr);
    if (!W) return;
    const H = Math.round((W * this.H) / this.W);
    let frais = cv._rendu !== idRendu;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; frais = true; }
    cv._rendu = idRendu;
    const rendu = parId[idRendu] ?? parId.pixel;
    if (rendu.meta.id === "pixel") { if (!this.versFond) composite(this.frame, this.img.fond, this.decor), (this.versFond = true); }
    else if (!this.versNoir) composite(this.frame, this.img.noir, NOIR), (this.versNoir = true);
    this.img.now = now;
    this.img.frais = frais;
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rendu.draw(ctx, this.img, W, H);
    if (this.erreur) {
      ctx.fillStyle = "#ff7a6b";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(this.erreur.slice(0, 50), 6, 6);
    }
  }
}

/**
 * Plusieurs canvas pour un même lecteur (un effet dans plusieurs rendus) : le temps n'avance qu'une fois par image.
 * get() rend le lecteur courant, qui peut changer.
 */
export function vuePartagee(get) {
  let dernier = -1;
  return {
    avancer(dt, now) { if (now !== dernier) { dernier = now; get()?.avancer(dt); } },
    dessiner(cv, rendu, now) { get()?.dessiner(cv, rendu, now); },
    get images() { return get()?.images; },
  };
}

/**
 * Une boucle d'animation pour plusieurs lecteurs : seuls ceux visibles à l'écran tournent.
 * ajouter(cv, lecteur, () => idRendu)
 */
// calme : une vignette parmi d'autres (cartes de la bibliothèque, aperçus de l'accueil). Si le visiteur demande
// moins d'animations (prefers-reduced-motion), elle reste sur une seule image, redessinée quand le rendu change.
const reduit = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)"); // absent dans le Worker du bac à sable
export function boucle() {
  const vues = [];
  const io = new IntersectionObserver((es) => {
    for (const en of es) {
      const v = vues.find((z) => z.cv === en.target);
      if (v) v.visible = en.isIntersecting;
    }
  }); // seulement ce qui est à l'écran
  let avant = performance.now(), vignettes = true, tour = 0;
  const image = (now) => {
    const dt = Math.min(0.05, (now - avant) / 1000), debut = performance.now();
    avant = now;
    // les vues sont parcourues à partir d'un point qui tourne, pour que le budget ci-dessous ne lèse pas toujours les mêmes
    tour = (tour + 1) % Math.max(1, vues.length);
    for (let j = 0; j < vues.length; j++) {
      const v = vues[(j + tour) % vues.length];
      if (!v.visible) continue;
      if (v.calme && reduit?.matches) {
        const r = v.rendu();
        if (v.fige === r) continue;
        if (v.fige === undefined) for (let i = 0; i < 3; i++) v.lecteur.avancer(0.2, now); // une image où l'effet est déjà là
        v.fige = r;
        v.lecteur.dessiner(v.cv, r, now);
        continue;
      }
      // une vignette est en pause sous le zoom ou la feuille du panneau
      if (v.calme && !vignettes) continue;
      // on ne redessine que quand l'effet a une nouvelle image (30 par seconde pour la plupart), pas à chaque
      // rafraîchissement de l'écran (60, 120 ou 144 par seconde)
      v.lecteur.avancer(dt, now);
      const r = v.rendu(), w = v.cv.clientWidth;
      if (v.image === v.lecteur.images && v.r === r && v.w === w) continue;
      // budget : au-delà de 8 ms dans cette image d'écran, les vignettes attendent la suivante, pour que le
      // défilement reste fluide sur une machine lente (elles ralentissent un peu au lieu de tout faire saccader)
      if (v.calme && performance.now() - debut > 8) continue;
      v.image = v.lecteur.images;
      v.r = r;
      v.w = w;
      v.lecteur.dessiner(v.cv, r, now);
    }
    requestAnimationFrame(image);
  };
  requestAnimationFrame(image);
  return {
    ajouter(cv, lecteur, rendu, calme = false) {
      vues.push({ cv, lecteur, rendu, calme, visible: false });
      io.observe(cv);
    },
    /** Met en pause (false) ou relance les vignettes, quand une vue les recouvre. */
    vignettes(oui) { vignettes = oui; },
  };
}
