// Fond animé de toutes les pages : une grille de points très discrète, comme un tampon de pixels au repos. Toutes les
// 4 secondes une onde part du coin haut gauche et traverse l'écran en diagonale : les points grossissent et
// s'allument à son passage, puis retombent. 30 images/s, arrêté quand l'onglet est caché ; une seule image fixe si le
// visiteur demande moins d'animations.
const PAS = 22, IPS = 30, PERIODE = 4, VITESSE = 300; // px par seconde
const cv = document.createElement("canvas");
cv.className = "fond-anime";
cv.setAttribute("aria-hidden", "true");
document.body.prepend(cv);
const ctx = cv.getContext("2d");
const reduit = matchMedia("(prefers-reduced-motion: reduce)");
let w = 0, h = 0, dpr = 1;

function taille() {
  dpr = Math.min(2, devicePixelRatio || 1);
  w = innerWidth;
  h = innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
}

function dessiner(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = t / 1000, phase = s % PERIODE;
  // les ondes encore à l'écran : la dernière partie et celles d'avant qui n'ont pas fini de traverser
  const portee = Math.hypot(w, h) + 200, rayons = [];
  for (let r = phase * VITESSE; r < portee; r += PERIODE * VITESSE) rayons.push(r);
  for (let y = PAS / 2; y < h; y += PAS) {
    for (let x = PAS / 2; x < w; x += PAS) {
      const d = Math.hypot(x, y);
      let e = 0;
      for (const r of rayons) { const ecart = d - r; e = Math.max(e, Math.exp(-(ecart * ecart) / 2000)); }
      const a = 0.05 + e * 0.3, taille = 1.5 + e * 2;
      ctx.fillStyle = e > 0.15 ? `rgba(92, 225, 230, ${a.toFixed(3)})` : `rgba(135, 150, 173, ${a.toFixed(3)})`;
      ctx.fillRect(Math.round(x - taille / 2), Math.round(y - taille / 2), taille, taille);
    }
  }
}

let dernier = 0;
function boucle(t) {
  if (!reduit.matches && !document.hidden) {
    if (t - dernier >= 1000 / IPS) { dernier = t; dessiner(t); }
    requestAnimationFrame(boucle);
  }
}
function demarrer() {
  taille();
  dessiner(performance.now());
  if (!reduit.matches) requestAnimationFrame(boucle);
}
addEventListener("resize", () => { taille(); dessiner(performance.now()); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) demarrer(); });
reduit.addEventListener("change", demarrer);
demarrer();
