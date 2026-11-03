// Indicateurs tirés d'Uiverse (https://uiverse.io), sous licence MIT, chacun crédité à son auteur.
// Le HTML et le CSS sont gardés tels qu'Uiverse les donne ; seule la couleur principale devient
// var(--uv-c, <couleur d'origine>), pour suivre la couleur choisie sur la page.
// l, h : taille d'origine en pixels ; ms : durée d'un tour d'animation à vitesse ×1 ;
// k : à la taille réglée t, le plus grand côté mesure t × k (un indicateur détaillé reste lisible à 32px).
export const UIVERSE = [
  // « AI Matrix Loader » de PriyanshuGupta28 : des 0 et des 1 qui tombent en lueur. Couleur d'origine #00ff88 ;
  // sur le site, la marge de 30px autour du bloc est retirée (site), le code copié la garde.
  {
    id: "uv-bright-bobcat-12", slug: "bright-bobcat-12", nom: "Matrix", auteur: "PriyanshuGupta28", l: 120, h: 160, ms: 2000, k: 3,
    site: ".ai-matrix-loader { margin: 0; }",
    html: `<div class="ai-matrix-loader">
  <div class="digit">0</div>
  <div class="digit">1</div>
  <div class="digit">0</div>
  <div class="digit">1</div>
  <div class="digit">1</div>
  <div class="digit">0</div>
  <div class="digit">0</div>
  <div class="digit">1</div>
  <div class="glow"></div>
</div>`,
    css: `.ai-matrix-loader {
  width: 120px;
  height: 160px;
  margin: 30px auto;
  position: relative;
  perspective: 800px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.digit {
  color: var(--uv-c, #00ff88);
  font-family: monospace;
  font-size: 18px;
  text-align: center;
  text-shadow: 0 0 5px var(--uv-c, #00ff88);
  animation:
    matrix-fall 2s infinite,
    matrix-flicker 0.5s infinite;
  opacity: 0;
}

.digit:nth-child(1) {
  animation-delay: 0.1s;
}
.digit:nth-child(2) {
  animation-delay: 0.3s;
}
.digit:nth-child(3) {
  animation-delay: 0.5s;
}
.digit:nth-child(4) {
  animation-delay: 0.7s;
}
.digit:nth-child(5) {
  animation-delay: 0.9s;
}
.digit:nth-child(6) {
  animation-delay: 1.1s;
}
.digit:nth-child(7) {
  animation-delay: 1.3s;
}
.digit:nth-child(8) {
  animation-delay: 1.5s;
}

.glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--uv-c, #00ff88) 10%, transparent) 0%,
    transparent 70%
  );
  animation: matrix-pulse 2s infinite;
}

@keyframes matrix-fall {
  0% {
    transform: translateY(-50px) rotateX(90deg);
    opacity: 0;
  }
  20%,
  80% {
    transform: translateY(0) rotateX(0deg);
    opacity: 0.8;
  }
  100% {
    transform: translateY(50px) rotateX(-90deg);
    opacity: 0;
  }
}

@keyframes matrix-flicker {
  0%,
  19%,
  21%,
  100% {
    opacity: 0.8;
  }
  20% {
    opacity: 0.2;
  }
}

@keyframes matrix-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.7;
  }
}`,
  },
];

export const UV = Object.fromEntries(UIVERSE.map((x) => [x.id, x]));
export const estUv = (id) => id in UV;
export const echelle = (x, taille) => (taille * (x.k ?? 1)) / Math.max(x.l, x.h);
export const lienUv = (x) => `https://uiverse.io/${x.auteur}/${x.slug}`;

// Le CSS d'Uiverse vise des classes génériques (.loader…) : chaque indicateur est enfermé dans .uv-<slug>
// et ses @keyframes sont renommées, pour ne gêner ni la page ni les autres indicateurs.
export function cssPortee(x) {
  const cls = "uv-" + x.slug;
  let css = x.css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, n] of css.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) css = css.replace(new RegExp(`(?<![\\w-])${n}(?![\\w-])`, "g"), `${cls}-${n}`);
  return prefixe(css + (x.site ?? ""), "." + cls);
}
function prefixe(css, p) {
  let out = "", i = 0;
  while (i < css.length) {
    const a = css.indexOf("{", i);
    if (a < 0) break;
    const sel = css.slice(i, a).trim();
    let n = 1, j = a + 1;
    while (j < css.length && n) { if (css[j] === "{") n++; else if (css[j] === "}") n--; j++; }
    const corps = css.slice(a + 1, j - 1);
    if (/^@(-webkit-)?keyframes|^@font-face/.test(sel)) out += `${sel}{${corps}}\n`;
    else if (sel.startsWith("@")) out += `${sel}{${prefixe(corps, p)}}\n`;
    else out += sel.split(",").map((s) => (/^(:root|html|body)\b/.test(s.trim()) ? p : `${p} ${s.trim()}`)).join(", ") + `{${corps}}\n`;
    i = j;
  }
  return out;
}

// le code à copier : HTML + CSS d'origine, à la couleur, la taille et la vitesse réglées
export function codeUv(x, r) {
  let css = x.css.replace(/var\(--uv-c,\s*[^)]+\)/g, r.couleur);
  if (r.vitesse !== 1) css = css.replace(/(animation(?:-duration|-delay)?\s*:)([^;}]+)/g, (_, k, v) => k + v.replace(/(^|[\s,])(-?\d*\.?\d+)(m?s)\b/g, (__, a, t, u) => a + +(t / r.vitesse).toFixed(3) + u));
  const z = +(echelle(x, r.taille)).toFixed(3), html = x.html.trim();
  return `<!-- ${x.nom} · Uiverse.io par ${x.auteur} (MIT) · ${lienUv(x)} -->\n`
    + (z === 1 ? html : `<div style="zoom: ${z}">\n${html}\n</div>`) + `\n\n<style>\n${css.trim()}\n</style>`;
}
