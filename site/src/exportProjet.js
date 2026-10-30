// Export d'un projet en .zip : le code de ses effets avec tout ce qu'ils importent (moteur, rendus), une page de
// démo qui les fait tourner chacun dans son rendu avec ses réglages, et le projet en JSON.
import { zip, telecharger } from "./zip.js";

const IMPORTS = /\bfrom\s*["'](\.{1,2}\/[^"']+)["']|\bimport\s*["'](\.{1,2}\/[^"']+)["']/g;

/** Lit les fichiers donnés (chemins depuis assets/src/) et, de proche en proche, tous ceux qu'ils importent. */
async function rassembler(base, depart) {
  const lus = new Map(), file = [...depart];
  while (file.length) {
    const chemin = file.shift();
    if (lus.has(chemin)) continue;
    const r = await fetch(base + chemin);
    if (!r.ok) throw new Error(chemin);
    const texte = await r.text();
    lus.set(chemin, texte);
    for (const m of texte.matchAll(IMPORTS)) file.push(new URL(m[1] ?? m[2], "http://x/" + chemin).pathname.slice(1));
  }
  return lus;
}

const PAGE = (titre) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre.replace(/</g, "&lt;")}</title>
<style>
  body { margin: 0; background: #07090f; color: #d6e2f0; font: 13px/1.5 ui-monospace, Consolas, Menlo, monospace; padding: 24px 16px; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  #effets { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); align-items: start; gap: 16px; }
  figure { margin: 0; border: 1px solid #1c2433; background: #090c14; }
  canvas { display: block; width: 100%; background: #000; image-rendering: pixelated; }
  figcaption { padding: 8px 10px; color: #8796ad; }
</style>
</head>
<body>
<h1>${titre.replace(/</g, "&lt;")}</h1>
<div id="effets"></div>
<script type="module" src="./demo.js"></script>
</body>
</html>
`;

const DEMO = `// Démo du projet : chaque effet tourne dans son rendu, avec ses réglages (projet.json).
// Les modules JavaScript ne se chargent pas depuis file:// : servez ce dossier, par exemple avec
// « npx serve » ou « python -m http.server », puis ouvrez l'adresse affichée.
import { createFrame, clearFrame, createFx, composite, hex } from "./artefacts/core/index.js";
import { parId } from "./artefacts/rendus/index.js";

const NOIR = hex("#000000"), FOND = hex("#0e1220");
const projet = await (await fetch("./projet.json")).json();
const vues = [];
for (const e of projet.effets) {
  const mod = await import(\`./artefacts/effets/\${e.id}.js\`);
  const meta = { fps: 30, loop: false, duration: 1, ...mod.meta };
  const [w, h] = meta.size, [ox, oy] = meta.origin;
  const fig = document.createElement("figure"), cv = document.createElement("canvas"), legende = document.createElement("figcaption");
  legende.textContent = \`#\${e.n} \${e.nom} · \${e.rendu}\${e.note ? " · " + e.note : ""}\`;
  fig.append(cv, legende);
  document.getElementById("effets").append(fig);
  const n = w * h * 4;
  const nouveau = () => createFx(mod, { x: ox, y: oy, seed: 1, ...e.options });
  vues.push({ meta, cv, nouveau, inst: nouveau(), frame: createFrame(w, h), rendu: parId[e.rendu] ?? parId.pixel,
    img: { w, h, noir: new Uint8ClampedArray(n), fond: new Uint8ClampedArray(n), sol: null, now: 0, frais: true } });
}

let avant = performance.now();
function image(now) {
  const dt = Math.min(0.05, (now - avant) / 1000);
  avant = now;
  for (const v of vues) {
    v.inst.update(dt);
    if (!v.meta.loop && v.inst.t > v.meta.duration + 0.5) v.inst = v.nouveau();
    clearFrame(v.frame);
    v.inst.draw(v.frame);
    const W = Math.round(v.cv.clientWidth * Math.min(2, devicePixelRatio || 1)), H = Math.round((W * v.img.h) / v.img.w);
    if (!W) continue;
    if (v.cv.width !== W || v.cv.height !== H) { v.cv.width = W; v.cv.height = H; v.img.frais = true; }
    if (v.rendu.meta.id === "pixel") composite(v.frame, v.img.fond, FOND);
    else composite(v.frame, v.img.noir, NOIR);
    v.img.now = now;
    v.rendu.draw(v.cv.getContext("2d"), v.img, W, H);
    v.img.frais = false;
  }
  requestAnimationFrame(image);
}
requestAnimationFrame(image);
`;

/**
 * nom : nom du projet ; effets : [{ n, id, nom, rendu, note, options }] ; base : adresse de assets/src/ ;
 * lisezmoi : texte d'aide (dans la langue de la page).
 */
export async function exporterProjet({ nom, effets, base, lisezmoi }) {
  const dossier = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "projet";
  const sources = await rassembler(base, ["core/index.js", "rendus/index.js", ...effets.map((e) => `effets/${e.id}.js`)]);
  const fichiers = [...sources].map(([chemin, texte]) => ({ nom: `${dossier}/artefacts/${chemin}`, contenu: texte }));
  for (const f of ["LICENSE", "NOTICE.md"]) fichiers.push({ nom: `${dossier}/artefacts/${f}`, contenu: await (await fetch(base + f)).text() });
  fichiers.push(
    { nom: `${dossier}/index.html`, contenu: PAGE(nom) },
    { nom: `${dossier}/demo.js`, contenu: DEMO },
    { nom: `${dossier}/projet.json`, contenu: JSON.stringify({ nom, exporte: new Date().toISOString(), effets }, null, 2) + "\n" },
    { nom: `${dossier}/LISEZMOI.txt`, contenu: lisezmoi.replaceAll("%d", dossier) + "\n" },
  );
  telecharger(await zip(fichiers), `${dossier}.zip`);
}
