// Fond animé de toutes les pages : une grille de points très discrète, comme un tampon de pixels au repos, traversée
// par une lente vague de lumière cyan. Petit (un point tous les 22 px), lent (15 images/s), arrêté quand l'onglet est
// caché ; une seule image fixe si le visiteur demande moins d'animations.
const PAS = 22, IPS = 15;
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
  const s = t / 1000;
  for (let y = PAS / 2; y < h; y += PAS) {
    for (let x = PAS / 2; x < w; x += PAS) {
      // deux vagues lentes qui se croisent : la lumière passe en diagonale, jamais au même endroit
      const v = Math.sin(x * 0.008 + y * 0.004 - s * 0.6) + Math.sin(x * 0.003 - y * 0.007 + s * 0.35);
      const a = 0.05 + Math.max(0, v - 0.6) * 0.14;
      ctx.fillStyle = a > 0.08 ? `rgba(92, 225, 230, ${a.toFixed(3)})` : `rgba(135, 150, 173, ${a.toFixed(3)})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
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
