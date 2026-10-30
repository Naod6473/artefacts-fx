// Construit le site statique dans dist/ : une page par langue, les scripts groupés, les fichiers statiques et l'API PHP.
//
//   npm run build        construit dist/
//   npm run dev          construit puis sert dist/ sur http://localhost:8080 (sans PHP)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DIST = "dist";
const LANGUES = readdirSync("site/i18n").filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const PAGES = { accueil: "index.html", bibliotheque: "bibliotheque/index.html", ia: "ia/index.html" };
// le site peut vivre dans un sous-dossier (naod.fr/artefacts/) : tous les liens partent de chemin_web
const BASE = JSON.parse(readFileSync("config/ovh.json", "utf8")).chemin_web ?? "/";

// « import code from "../../effets/fire/torch.js?source" » donne le texte du fichier : la fiche affiche le code de l'effet
const sourceTexte = {
  name: "source",
  setup(b) {
    b.onResolve({ filter: /\?source$/ }, (a) => ({ path: resolve(a.resolveDir, a.path.replace(/\?source$/, "")), namespace: "source" }));
    b.onLoad({ filter: /.*/, namespace: "source" }, (a) => ({ contents: readFileSync(a.path, "utf8"), loader: "text" }));
  },
};

// « import { catalogue, charger, source } from "virtuel:catalogue" » : la liste des effets (numéro, nom, tags, durée…)
// calculée ici, et pour chacun un import() séparé, donc le code d'un effet n'est téléchargé que s'il est affiché
const registre = JSON.parse(readFileSync("effets/registre.json", "utf8"));
const catalogue = [];
for (const [n, id] of Object.entries(registre)) {
  let mod;
  try { mod = await import(pathToFileURL(resolve("effets", id + ".js")).href); } catch { continue; } // effet retiré
  const m = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
  catalogue.push({ n, id, name: m.name, desc: m.desc ?? "", tags: m.tags, loop: m.loop, duration: m.duration, size: m.size, origin: m.origin, bg: m.bg, actor: !!m.actor, couleur: couleurDominante(m.options) });
}
const catalogueVirtuel = {
  name: "catalogue",
  setup(b) {
    b.onResolve({ filter: /^virtuel:catalogue$/ }, () => ({ path: "catalogue", namespace: "virtuel" }));
    b.onLoad({ filter: /.*/, namespace: "virtuel" }, () => {
      const fichier = (id) => JSON.stringify(resolve("effets", id + ".js"));
      const lignes = (suffixe) => catalogue.map((e) => `  "${e.n}": () => import(${fichier(e.id).slice(0, -1)}${suffixe}"),`).join("\n");
      return {
        resolveDir: resolve("."),
        contents: `export const catalogue = ${JSON.stringify(catalogue)};\nexport const charger = {\n${lignes("")}\n};\nexport const source = {\n${lignes("?source")}\n};\n`,
      };
    });
  },
};

/** Nom de la couleur la plus vive de la palette de l'effet : sert au filtre couleur:… */
function couleurDominante(options) {
  const ramp = (options.palette ?? []).filter((c) => typeof c === "string");
  let best = null, score = -1;
  for (const c of ramp) {
    const v = parseInt(c.slice(1, 7), 16), r = (v >> 16) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max ? (max - min) / max : 0;
    if (sat * max > score) { score = sat * max; best = { r, g, b, max, min, sat }; }
  }
  if (!best || best.sat < 0.25) return best && best.max > 0.7 ? "blanc" : "gris";
  const { r, g, b, max, min } = best, d = max - min;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return h < 15 ? "rouge" : h < 45 ? "orange" : h < 70 ? "jaune" : h < 160 ? "vert" : h < 200 ? "cyan" : h < 255 ? "bleu" : h < 290 ? "violet" : h < 335 ? "rose" : "rouge";
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "assets"), { recursive: true });
cpSync("site/static", DIST, { recursive: true });
cpSync("api", join(DIST, "api"), { recursive: true });
// sources du moteur, des rendus et des effets, servies telles quelles : l'export zip d'un projet les rassemble
for (const d of ["core", "rendus", "effets"]) cpSync(d, join(DIST, "assets", "src", d), { recursive: true });
for (const f of ["LICENSE", "NOTICE.md"]) cpSync(f, join(DIST, "assets", "src", f));
// données du serveur MCP (api/mcp.php) : le catalogue et le code de chaque effet, lus par PHP
{
  const { TAGS_FR, CATEGORIES_FR, SYNONYMES } = await import("./site/src/tags.js");
  const dossier = join(DIST, "api", "catalogue");
  mkdirSync(join(dossier, "sources"), { recursive: true });
  const fiches = catalogue.map((e) => {
    const cat = e.id.split("/")[0];
    writeFileSync(join(dossier, "sources", e.n + ".js"), readFileSync(join("effets", e.id + ".js")));
    return { ...e, categorie: cat, tags_fr: [CATEGORIES_FR[cat], ...e.tags.map((t) => TAGS_FR[t])].filter(Boolean) };
  });
  const { rendus } = await import("./rendus/index.js").catch(() => ({ rendus: [] }));
  writeFileSync(join(dossier, "catalogue.json"), JSON.stringify({ effets: fiches, synonymes: SYNONYMES, rendus: rendus.map((r) => r.meta) }));
}
writeFileSync(join(DIST, ".htaccess"), readFileSync("site/static/.htaccess", "utf8").replaceAll("{{base}}", BASE));

await build({
  entryPoints: Object.keys(PAGES).filter((p) => existsSync(`site/src/${p}.js`)).map((p) => `site/src/${p}.js`),
  outdir: join(DIST, "assets"),
  bundle: true,
  plugins: [sourceTexte, catalogueVirtuel],
  format: "esm",
  splitting: true,
  chunkNames: "fx/[name]-[hash]",
  minify: true,
  legalComments: "inline",
  banner: { js: "/* Artefacts, MIT. Moteur et effets d'origine : pixelfx, MIT, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez */" },
});

const echappe = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// les clés qui finissent par une phrase avec des liens (pied_credits) gardent leur HTML ; les autres sont échappées
const HTML_PERMIS = new Set(["pied_credits", "cpt_erreurs_json"]);
for (const langue of LANGUES) {
  const t = { ...JSON.parse(readFileSync(`site/i18n/${langue}.json`, "utf8")), langue, base: BASE };
  mkdirSync(join(DIST, langue), { recursive: true });
  for (const [page, fichier] of Object.entries(PAGES)) {
    // {{> compte}} insère site/pages/_compte.html (morceau commun à plusieurs pages), puis les {{clé}} sont remplacées
    const html = readFileSync(`site/pages/${page}.html`, "utf8").replace(/\{\{> (\w+)\}\}/g, (_, f) => readFileSync(`site/pages/_${f}.html`, "utf8")).replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in t)) throw new Error(`${langue}.json : clé manquante « ${k} » (page ${page})`);
      return HTML_PERMIS.has(k) ? t[k] : echappe(t[k]);
    });
    mkdirSync(dirname(join(DIST, langue, fichier)), { recursive: true });
    writeFileSync(join(DIST, langue, fichier), html);
  }
}
// sans Apache (aperçu local), la racine choisit la langue en JavaScript
writeFileSync(join(DIST, "index.html"), `<!doctype html><meta charset="utf-8"><title>Artefacts</title><script>location.replace(/^fr/i.test(navigator.language)?"${BASE}fr/":"${BASE}en/")</script><a href="${BASE}fr/">Français</a> · <a href="${BASE}en/">English</a>`);
console.log(`dist/ : ${LANGUES.join(", ")}, ${catalogue.length} effets`);

// --autonome : chaque page en un seul fichier HTML (scripts et styles dedans), pour un aperçu hors du site
if (process.argv.includes("--autonome")) {
  const out = join(DIST, "autonome");
  mkdirSync(out, { recursive: true });
  for (const page of Object.keys(PAGES).filter((p) => existsSync(`site/src/${p}.js`))) {
    const r = await build({ entryPoints: [`site/src/${page}.js`], bundle: true, write: false, plugins: [sourceTexte, catalogueVirtuel], format: "iife", minify: true });
    const js = r.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
    for (const langue of LANGUES) {
      let html = readFileSync(join(DIST, langue, PAGES[page]), "utf8");
      html = html.replace(/<link rel="stylesheet" href="[^"]*assets\/([\w.-]+\.css)">/, (_, f) => `<style>${readFileSync(join(DIST, "assets", f), "utf8")}</style>`);
      html = html.replace(/<script type="module" src="[^"]*"><\/script>/, () => `<script>${js}</script>`);
      writeFileSync(join(out, `${langue}-${page}.html`), html);
    }
  }
  console.log("dist/autonome/ : pages en un seul fichier");
}

if (process.argv.includes("--serve")) {
  const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
  createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (!p.startsWith(BASE)) { res.writeHead(302, { location: BASE }).end(); return; }
    p = "/" + p.slice(BASE.length);
    if (p.endsWith("/")) p += "index.html";
    try {
      const data = readFileSync(join(DIST, p));
      res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" }).end(data);
    } catch {
      res.writeHead(404).end("introuvable");
    }
  }).listen(8080, () => console.log(`http://localhost:8080${BASE}`));
}
