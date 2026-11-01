#!/usr/bin/env node
// Importe (ou réimporte) les pièces d'ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art, MIT,
// Copyright (c) 2026 ASCII Magic) dans effets/<catégorie>/<pièce>.js. Chaque fichier est la pièce d'origine, à trois
// retouches près : les imports pointent vers effets/_ascii/lib/, son meta et sa fonction create() d'origine ne sont
// plus exportés, et quatre lignes à la fin la branchent sur le moteur (effets/_ascii/fx.js).
//
//   git clone https://github.com/kailashsr38/ascii-magic-art /tmp/ama
//   node tools/ascii-magic.mjs /tmp/ama && node tools/index.mjs
//
// Les pièces faites à partir de photos (lib/image.js : Unsplash ou origine non indiquée) ne sont pas sous MIT : exclues.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src || !existsSync(join(src, "pieces"))) {
  console.error("usage : node tools/ascii-magic.mjs <clone d'ascii-magic-art>");
  process.exit(1);
}
// leurs catégories deviennent les nôtres ; « weather » existe déjà ici (effets de jeu) : leurs scènes vont dans « wild »
export const CATEGORIE = { weather: "wild" };

for (const f of ["kit.js", "scene.js"]) copyFileSync(join(src, "lib", f), join(ROOT, "effets", "_ascii", "lib", f));
copyFileSync(join(src, "LICENSE"), join(ROOT, "effets", "_ascii", "LICENSE"));

let n = 0;
// la catégorie se lit dans le meta de la pièce (parfois écrit sur une seule ligne) : on importe la pièce d'origine
const ignorees = [];
for (const f of readdirSync(join(src, "pieces")).filter((f) => f.endsWith(".js")).sort()) {
  let code = readFileSync(join(src, "pieces", f), "utf8");
  const slug = f.slice(0, -3);
  if (/lib\/image\.js/.test(code)) { ignorees.push(slug); continue; }
  const cat = (await import(pathToFileURL(join(src, "pieces", f)).href)).meta?.category;
  if (!cat) { ignorees.push(slug); continue; }
  const a = code.match(/^export const meta = \{/gm)?.length, b = code.match(/^export default function create\(/gm)?.length;
  if (a !== 1 || b !== 1) throw new Error(`${f} : forme inattendue (meta ${a}, create ${b})`);
  code = code
    .replace(/from "\.\.\/lib\//g, 'from "../_ascii/lib/')
    .replace(/^export const meta = \{/m, "const meta = {")
    .replace(/^export default function create\(/m, "function piece(");
  // l'import du branchement, juste après le premier import de la pièce (celui de lib/kit.js)
  const premier = code.match(/^import [^;]+;\n/m), fin = premier ? premier.index + premier[0].length : 0;
  code = code.slice(0, fin) + 'import { asciiFx } from "../_ascii/fx.js";\n' + code.slice(fin);
  code = `// ascii-magic-art (https://github.com/kailashsr38/ascii-magic-art), pièce « ${slug} », MIT, Copyright (c) 2026 ASCII Magic
// (ascii-magic.com). Le fichier est la pièce d'origine ; seules les lignes marquées « Artefacts » la branchent sur le moteur.
${code.trimEnd()}

// Artefacts : la pièce sur le moteur (une case = un bloc de pixels), donc dans les 11 rendus
const branchee = asciiFx(meta, piece);
const metaArtefacts = branchee.meta;
export const create = branchee.create;
export { metaArtefacts as meta };
`;
  const dir = join(ROOT, "effets", CATEGORIE[cat] ?? cat);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, f), code);
  n++;
}
console.log(`${n} pièces importées ; ignorées (photos ou sans catégorie) : ${ignorees.join(", ") || "aucune"}`);
