// Construit le site statique dans dist/ : une page par langue, les scripts groupés, les fichiers statiques et l'API PHP.
//
//   npm run build        construit dist/
//   npm run dev          construit puis sert dist/ sur http://localhost:8080 (sans PHP)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname } from "node:path";

const DIST = "dist";
const LANGUES = readdirSync("site/i18n").filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const PAGES = { accueil: "index.html", bibliotheque: "bibliotheque/index.html" };
// le site peut vivre dans un sous-dossier (naod.fr/artefacts/) : tous les liens partent de chemin_web
const BASE = JSON.parse(readFileSync("config/ovh.json", "utf8")).chemin_web ?? "/";

// « import code from "../../effets/fire/torch.js?source" » donne le texte du fichier : la fiche affiche le code de l'effet
const sourceTexte = {
  name: "source",
  setup(b) {
    b.onResolve({ filter: /\?source$/ }, (a) => ({ path: join(a.resolveDir, a.path.replace(/\?source$/, "")), namespace: "source" }));
    b.onLoad({ filter: /.*/, namespace: "source" }, (a) => ({ contents: readFileSync(a.path, "utf8"), loader: "text" }));
  },
};

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "assets"), { recursive: true });
cpSync("site/static", DIST, { recursive: true });
cpSync("api", join(DIST, "api"), { recursive: true });
writeFileSync(join(DIST, ".htaccess"), readFileSync("site/static/.htaccess", "utf8").replaceAll("{{base}}", BASE));

await build({
  entryPoints: Object.keys(PAGES).map((p) => `site/src/${p}.js`),
  outdir: join(DIST, "assets"),
  bundle: true,
  plugins: [sourceTexte],
  format: "iife",
  minify: true,
  legalComments: "inline",
  banner: { js: "/* Artefacts, MIT. Moteur et effets d'origine : pixelfx, MIT, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez */" },
});

const echappe = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// les clés qui finissent par une phrase avec des liens (pied_credits) gardent leur HTML ; les autres sont échappées
const HTML_PERMIS = new Set(["pied_credits"]);
for (const langue of LANGUES) {
  const t = { ...JSON.parse(readFileSync(`site/i18n/${langue}.json`, "utf8")), langue, base: BASE };
  mkdirSync(join(DIST, langue), { recursive: true });
  for (const [page, fichier] of Object.entries(PAGES)) {
    const html = readFileSync(`site/pages/${page}.html`, "utf8").replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in t)) throw new Error(`${langue}.json : clé manquante « ${k} » (page ${page})`);
      return HTML_PERMIS.has(k) ? t[k] : echappe(t[k]);
    });
    mkdirSync(dirname(join(DIST, langue, fichier)), { recursive: true });
    writeFileSync(join(DIST, langue, fichier), html);
  }
}
// sans Apache (aperçu local), la racine choisit la langue en JavaScript
writeFileSync(join(DIST, "index.html"), `<!doctype html><meta charset="utf-8"><title>Artefacts</title><script>location.replace(/^fr/i.test(navigator.language)?"${BASE}fr/":"${BASE}en/")</script><a href="${BASE}fr/">Français</a> · <a href="${BASE}en/">English</a>`);
console.log(`dist/ : ${LANGUES.join(", ")}`);

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
