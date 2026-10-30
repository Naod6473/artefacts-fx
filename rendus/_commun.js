// Outils partagés par les rendus. Un rendu reçoit l'image de l'effet (tampon RGBA) et dessine sur un canvas 2D.
//
// Contrat d'un rendu (rendus/<id>.js) :
//   export const meta = { id, nom: { fr, en }, fond }
//   export function draw(ctx, img, W, H)
// où img = { w, h, noir, fond, sol, now, frais }
//   noir : RGBA de l'effet sur fond noir (Uint8ClampedArray w*h*4), pour les rendus texte
//   fond : RGBA de l'effet sur le décor (scène ou sol), pour le rendu pixel
//   sol  : ligne du sol en pixels de l'effet, ou null
//   now  : horloge en ms, pour les animations propres au rendu (chiffres qui changent)
//   frais : vrai quand le canvas vient d'être (re)dimensionné (les rendus à rémanence repartent de zéro)
// Un nouveau rendu marche donc d'un coup sur tous les effets, anciens comme nouveaux.

export const POLICE = '"IBM Plex Mono", ui-monospace, monospace';
export const SCENE = "#0e1220";

/** Hachage entier vers [0, 1), stable : sert aux variations des glyphes sans Math.random. */
export function hs(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

/** Taille d'une case en pixels de l'effet : plus fine sur les grands canvas. */
export function tailleCase(img, W) {
  return Math.max(2, Math.round(img.w / (W > 700 ? 96 : 60)));
}

/**
 * Moyenne d'un bloc de pixels : [R, G, B, luminosité max 0..1, part couverte 0..1], ou null si le bloc est vide.
 */
export function cellule(img, gx, gy, w, h) {
  const D = img.noir, FW = img.w, FH = img.h;
  let R = 0, G = 0, B = 0, n = 0, L = 0;
  for (let y = gy; y < gy + h && y < FH; y++)
    for (let x = gx; x < gx + w && x < FW; x++) {
      const i = (y * FW + x) * 4, r = D[i], g = D[i + 1], b = D[i + 2], l = Math.max(r, g, b);
      if (l > 10) { R += r; G += g; B += b; n++; }
      if (l > L) L = l;
    }
  return n ? [R / n, G / n, B / n, L / 255, n / (w * h)] : null;
}

export const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

/** Intensité d'une case pour les rendus en caractères. */
export const intensite = (c) => c[3] * (0.5 + 0.5 * Math.sqrt(c[4]));

/** Fond uni puis, si l'effet est au sol, une ligne de ═. */
export function fondTexte(ctx, img, W, H, CS, couleur = SCENE, avecSol = true) {
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, W, H);
  if (!avecSol || img.sol == null) return;
  const k = W / img.w, gy = Math.floor(img.sol / CS) * CS;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${CS * k * 1.15}px ${POLICE}`;
  ctx.fillStyle = "#3a4566";
  for (let gx = 0; gx < img.w; gx += CS) ctx.fillText("═", (gx + CS / 2) * k, (gy + CS / 2) * k);
}

/** Boucle sur les cases et dessine un caractère par case ; car(c, gx, gy) rend [caractère, couleur, alpha] ou null. */
export function grilleCaracteres(ctx, img, W, CS, car, additif = true) {
  const k = W / img.w;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${CS * k * 1.18}px ${POLICE}`;
  if (additif) ctx.globalCompositeOperation = "lighter";
  for (let gy = 0; gy < img.h; gy += CS)
    for (let gx = 0; gx < img.w; gx += CS) {
      const c = cellule(img, gx, gy, CS, CS);
      if (!c) continue;
      const r = car(c, gx, gy);
      if (!r) continue;
      ctx.globalAlpha = r[2] ?? 1;
      ctx.fillStyle = r[1];
      ctx.fillText(r[0], (gx + CS / 2) * k, (gy + CS / 2) * k);
    }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
