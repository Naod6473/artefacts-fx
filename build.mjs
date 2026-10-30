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
const PAGES = { accueil: "index.html", bibliotheque: "bibliotheque/index.html", ia: "ia/index.html", proposer: "proposer/index.html", moderation: "moderation/index.html", espace: "compte/index.html", mentions: "mentions/index.html", apropos: "a-propos/index.html", interfaces: "interfaces/index.html", introuvable: "404.html" };
// le site peut vivre dans un sous-dossier (naod.fr/artefacts/) : tous les liens partent de chemin_web
const BASE = JSON.parse(readFileSync("config/ovh.json", "utf8")).chemin_web ?? "/";

// « import code from "../../effets/fire/torch.js?source" » donne le texte du fichier : la fiche affiche le code de l'effet
const sourceTexte = {
  name: "source",
  setup(b) {
    b.onResolve({ filter: /\?source$/ }, (a) => ({ path: resolve(a.resolveDir, a.path.replace(/\?source$/, "")), namespace: "source" }));
    b.onLoad({ filter: /.*/, namespace: "source" }, (a) => ({ contents: readFileSync(a.path, "utf8"), loader: "text" }));
    // « ?bundle » : pareil, mais le fichier est d'abord assemblé avec ses imports (le Worker du bac à sable)
    b.onResolve({ filter: /\?bundle$/ }, (a) => ({ path: resolve(a.resolveDir, a.path.replace(/\?bundle$/, "")), namespace: "bundle" }));
    b.onLoad({ filter: /.*/, namespace: "bundle" }, async (a) => {
      const r = await build({ entryPoints: [a.path], bundle: true, write: false, format: "iife", minify: true, platform: "browser" });
      return { contents: r.outputFiles[0].text, loader: "text" };
    });
  },
};

// « import { catalogue, charger, source } from "virtuel:catalogue" » : la liste des effets (numéro, nom, tags, durée…)
// calculée ici, et pour chacun un import() séparé, donc le code d'un effet n'est téléchargé que s'il est affiché
const registre = JSON.parse(readFileSync("effets/registre.json", "utf8"));
// noms et descriptions en français (effets/traductions-fr.json) ; un effet sans traduction garde son texte d'origine
const TRAD_FR = existsSync("effets/traductions-fr.json") ? JSON.parse(readFileSync("effets/traductions-fr.json", "utf8")) : {};
const catalogue = [];
for (const [n, id] of Object.entries(registre)) {
  let mod;
  try { mod = await import(pathToFileURL(resolve("effets", id + ".js")).href); } catch { continue; } // effet retiré
  const m = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
  const fr = TRAD_FR[id] ?? {};
  catalogue.push({ n, id, name: m.name, desc: m.desc ?? "", ...(fr.name ? { name_fr: fr.name } : {}), ...(fr.desc ? { desc_fr: fr.desc } : {}), tags: m.tags, loop: m.loop, duration: m.duration, size: m.size, origin: m.origin, bg: m.bg, actor: !!m.actor, couleur: couleurDominante(m.options), ...(m.author ? { author: String(m.author) } : {}) });
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
// le texte de la licence MIT (Artefacts, Patch, Hugo Duprez) servi avec le code, comme la licence le demande
cpSync("LICENSE", join(DIST, "LICENSE.txt"));
cpSync("NOTICE.md", join(DIST, "NOTICE.txt"));
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
  entryPoints: [...Object.keys(PAGES).filter((p) => existsSync(`site/src/${p}.js`)).map((p) => `site/src/${p}.js`), "site/src/fiche.js", "site/src/entete.js"],
  outdir: join(DIST, "assets"),
  bundle: true,
  plugins: [sourceTexte, catalogueVirtuel],
  format: "esm",
  splitting: true,
  chunkNames: "fx/[name]-[hash]",
  minify: true,
  legalComments: "inline",
  banner: { js: "/* Artefacts, MIT. Moteur et effets d'origine : pixelfx, MIT, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez. Licence complète : /LICENSE.txt */" },
});

// la page Interfaces : la documentation d'Inkra (site/interfaces/inkra-docs, MIT), en React, groupée à part avec ses
// styles, polices et images. Deux retouches à la volée dans App.tsx : les liens deviennent « ?p=/components/… » (la page
// vit à /fr/interfaces/, pas à la racine) et les morceaux utiles sont exportés pour site/interfaces/app.tsx.
const inkraDocs = {
  name: "inkra-docs",
  setup(b) {
    b.onLoad({ filter: /inkra-docs[\\/]src[\\/]App\.tsx$/ }, (a) => {
      let code = readFileSync(a.path, "utf8");
      const avant = code;
      code = code.replace(/function routeHref\(path: RoutePath\): string \{\n  return [^\n]*\n\}/, "function routeHref(path: RoutePath): string {\n  return `?p=${path}`;\n}");
      if (code === avant) throw new Error("inkra-docs : routeHref introuvable dans App.tsx");
      code += "\nexport { ButtonPage, DesignStandardPage, DocsNavigationPanel, DocumentPageNavigation, GettingStartedPage, MobileDrawer, SideNavigation, SidebarPreferences, readInitialTheme, useCompactLayout, validPath };\n";
      return { contents: code, loader: "tsx" };
    });
  },
};
await build({
  entryPoints: { app: "site/interfaces/app.tsx" },
  outdir: join(DIST, "assets", "interfaces"),
  bundle: true,
  plugins: [inkraDocs],
  format: "esm",
  splitting: true,
  chunkNames: "[name]-[hash]",
  assetNames: "[name]-[hash]",
  loader: { ".woff2": "file", ".png": "file", ".svg": "file", ".webm": "file", ".mp3": "file", ".wav": "file", ".jpg": "file", ".webp": "file" },
  jsx: "automatic",
  define: { "import.meta.env.BASE_URL": JSON.stringify(BASE + "assets/interfaces/"), "process.env.NODE_ENV": '"production"' },
  minify: true,
  legalComments: "inline",
  banner: { js: "/* Interfaces : Inkra (@inkra/react et sa documentation), MIT, Copyright (c) 2026 Inkra contributors. https://github.com/inkrajs/inkra */" },
});
// esbuild sort à part le CSS des morceaux chargés plus tard (React.lazy) sans le relier : on l'ajoute à app.css
{
  const d = join(DIST, "assets", "interfaces"), autres = readdirSync(d).filter((f) => f.endsWith(".css") && f !== "app.css");
  writeFileSync(join(d, "app.css"), [readFileSync(join(d, "app.css"), "utf8"), ...autres.map((f) => readFileSync(join(d, f), "utf8"))].join("\n"));
  for (const f of autres) rmSync(join(d, f));
}
// images et vidéo que la documentation appelle par une adresse absolue (/images/…, /media/…)
cpSync("site/interfaces/inkra-docs/public", DIST, { recursive: true });
cpSync("site/interfaces/inkra-docs/LICENSE", join(DIST, "assets", "interfaces", "LICENSE-inkra.txt"));

// le moteur du bac à sable (pages Proposer et Modération) : un seul fichier, passé en texte à l'iframe isolée
await build({
  entryPoints: ["site/src/moteur-bac.js"],
  outfile: join(DIST, "assets", "moteur-bac.js"),
  bundle: true,
  format: "esm",
  minify: true,
  legalComments: "inline",
  banner: { js: "/* Artefacts, MIT. Moteur : pixelfx, MIT, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez */" },
});

const echappe = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// les clés qui finissent par une phrase avec des liens (pied_credits) gardent leur HTML ; les autres sont échappées
// {{> menu}} insère site/pages/_menu.html (morceaux communs, éventuellement imbriqués), puis les {{clé}} sont remplacées ;
// le lien du menu vers la page elle-même reçoit aria-current
// Politique de sécurité de chaque page. Les effets de la communauté tournent sur le site hors bac à sable : sans
// 'unsafe-eval', leur seule porte de sortie (le constructeur Function) est fermée, et connect-src borne le réseau.
// Les pages du bac à sable (proposer, modération) ont besoin de scripts en ligne et de blob: pour l'iframe isolée,
// qui hérite de cette politique ; elles ne chargent aucun effet hors du bac.
// Mesure d'audience : Umami (sans cookie), sur toutes les pages ; son script et ses envois sont les seuls autorisés hors du site.
const UMAMI = "https://stats.pissits.com";
const UMAMI_SCRIPT = `<script defer src="${UMAMI}/script.js" data-website-id="53cc1af8-a056-4405-82de-d0ddaf305681"></script>`;
const CSP_BASE = `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.github.com ${UMAMI}; object-src 'none'; base-uri 'self'; form-action 'self'`;
const csp = (page) => ["proposer", "moderation"].includes(page)
  ? CSP_BASE + `; script-src 'self' 'unsafe-inline' blob: ${UMAMI}; worker-src blob:`
  : CSP_BASE + `; script-src 'self' ${UMAMI}`;
function remplir(modele, t, page) {
  let html = modele.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp(page)}">`
    + `\n<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="${BASE}apple-touch-icon.png">\n${UMAMI_SCRIPT}`);
  // deux niveaux suffisent (en-tête → menu) ; un « {{> nom}} » cité dans le commentaire d'un morceau reste tel quel
  for (let i = 0; i < 2; i++) html = html.replace(/\{\{> (\w+)\}\}/g, (_, f) => readFileSync(`site/pages/_${f}.html`, "utf8"));
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in t)) throw new Error(`${t.langue}.json : clé manquante « ${k} » (page ${page})`);
    return HTML_PERMIS.has(k) ? t[k] : echappe(t[k]);
  });
  return html.replace(`<a href="${BASE}${t.langue}/${t.ici}">`, `<a href="${BASE}${t.langue}/${t.ici}" aria-current="page">`);
}
const HTML_PERMIS = new Set(["pied_credits", "cpt_erreurs_json", "prop_statuts_json", "prop_verifs_json", "ml_corps", "ap_corps", "if_credit"]);
for (const langue of LANGUES) {
  const t = { ...JSON.parse(readFileSync(`site/i18n/${langue}.json`, "utf8")), langue, base: BASE };
  mkdirSync(join(DIST, langue), { recursive: true });
  for (const [page, fichier] of Object.entries(PAGES)) {
    // ici : le chemin de la page, pour le lien vers l'autre langue et le lien du menu marqué « page courante »
    t.ici = fichier.replace(/index\.html$/, "");
    const html = remplir(readFileSync(`site/pages/${page}.html`, "utf8"), t, page);
    mkdirSync(dirname(join(DIST, langue, fichier)), { recursive: true });
    writeFileSync(join(DIST, langue, fichier), html);
  }
}
// une page par effet et par langue (/fr/fx/42/), lisible sans JavaScript : titre, description et image d'aperçu
// pour les cartes de Discord, X, Facebook… et pour les moteurs de recherche ; plus le plan du site (sitemap.xml)
{
  const SITE = "https://" + JSON.parse(readFileSync("config/ovh.json", "utf8")).domaine + BASE.replace(/\/$/, "");
  const { TAGS_FR, CATEGORIES_FR } = await import("./site/src/tags.js");
  const { usage } = await import("./site/src/usage.js");
  const { apercu } = await import("./tools/apercus.mjs");
  const rapide = process.argv.includes("--rapide"); // sans les images d'aperçu (≈ 1 min), pour travailler en local
  mkdirSync(join(DIST, "apercus"), { recursive: true });
  if (!rapide) {
    for (const e of catalogue) {
      try { writeFileSync(join(DIST, "apercus", e.n + ".png"), await apercu(e.id)); } catch (err) { console.warn(`aperçu ${e.id} : ${err.message}`); }
    }
  }
  const modele = readFileSync("site/pages/_fiche.html", "utf8");
  const urls = [];
  for (const langue of LANGUES) {
    const t = { ...JSON.parse(readFileSync(`site/i18n/${langue}.json`, "utf8")), langue, base: BASE };
    const page = remplir(modele, { ...t, ici: "fx/%%num%%/" }, "fiche");
    const fr = langue === "fr";
    catalogue.forEach((e, i) => {
      const num = +e.n, cat = e.id.split("/")[0], url = (l) => `${SITE}/${l}/fx/${num}/`;
      const lien = (x, fleche) => x ? `<a href="${BASE}${langue}/fx/${+x.n}/">${fleche === "←" ? "← " : ""}${echappe(fr ? x.name_fr ?? x.name : x.name)} #${x.n}${fleche === "→" ? " →" : ""}</a>` : "<span></span>";
      const tags = e.tags.map((g) => `<li><a href="${BASE}${langue}/bibliotheque/#tags=${encodeURIComponent(g)}">${echappe(fr ? TAGS_FR[g] ?? g : g)}</a></li>`).join("");
      const valeurs = {
        n: e.n, num, id: echappe(e.id), nom: echappe(fr ? e.name_fr ?? e.name : e.name), desc: echappe(fr ? e.desc_fr ?? e.desc : e.desc), usage: echappe(usage(e)),
        credit: e.author ? echappe(` (${t.mod_par} ${e.author})`) : "",
        url: url(langue), url_fr: url("fr"), url_en: url("en"), url_autre: `${BASE}${t.langue_autre_code}/fx/${num}/`,
        image: `${SITE}/apercus/${e.n}.png`, image_rel: `${BASE}apercus/${e.n}.png`,
        categorie: echappe(fr ? CATEGORIES_FR[cat] ?? cat : cat), categorie_q: encodeURIComponent(fr ? CATEGORIES_FR[cat] ?? cat : cat),
        format: e.size[0] >= 320 && Math.abs(e.size[0] / e.size[1] - 16 / 9) < 0.05 ? "16 / 9" : "4 / 3", // comme pleinEcran() du lecteur
        duree: `${e.duration} s, ${e.loop ? t.fiche_boucle_oui : t.fiche_une_fois}`, taille: e.size.join(" × "), tags,
        precedent: lien(catalogue[i - 1], "←"), suivant: lien(catalogue[i + 1], "→"),
        jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareSourceCode", name: fr ? e.name_fr ?? e.name : e.name, description: fr ? e.desc_fr ?? e.desc : e.desc, url: url(langue),
          image: `${SITE}/apercus/${e.n}.png`, programmingLanguage: "JavaScript", license: "https://opensource.org/licenses/MIT",
          codeRepository: "https://github.com/Naod6473/artefacts-fx", inLanguage: langue, ...(e.author ? { author: { "@type": "Person", name: e.author } } : {}) }).replace(/</g, "\\u003c"),
      };
      const html = page.replace(/%%(\w+)%%/g, (_, k) => {
        if (!(k in valeurs)) throw new Error(`fiche : valeur manquante « ${k} »`);
        return valeurs[k];
      });
      mkdirSync(join(DIST, langue, "fx", String(num)), { recursive: true });
      writeFileSync(join(DIST, langue, "fx", String(num), "index.html"), html);
      urls.push(url(langue));
    });
  }
  const pages = LANGUES.flatMap((l) => Object.values(PAGES).filter((f) => !/^(moderation|compte)\/|^404/.test(f)).map((f) => `${SITE}/${l}/${f.replace(/index\.html$/, "")}`));
  writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...pages, ...urls].map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nDisallow: ${BASE}api/\nDisallow: ${BASE}fr/moderation/\nDisallow: ${BASE}en/moderation/\nDisallow: ${BASE}fr/compte/\nDisallow: ${BASE}en/compte/\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`fiches : ${urls.length} pages${rapide ? " (sans images d'aperçu)" : ", images dans apercus/"}`);
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
