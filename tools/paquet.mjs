#!/usr/bin/env node
// Prépare le paquet npm « artefacts-fx » dans paquet/ : le moteur (core/), les effets, les rendus et le lecteur
// (site/src/lecteur.js, chemins d'import ajustés), avec LICENSE, NOTICE et le README du paquet (tools/paquet/README.md).
// La publication se fait par .github/workflows/npm.yml.
//
//   node tools/paquet.mjs      puis : cd paquet && npm pack --dry-run

import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from "node:fs";

const racine = JSON.parse(readFileSync("package.json", "utf8"));
rmSync("paquet", { recursive: true, force: true });
mkdirSync("paquet/lecteur", { recursive: true });
for (const d of ["core", "effets", "rendus"]) cpSync(d, `paquet/${d}`, { recursive: true });
for (const f of ["LICENSE", "NOTICE.md"]) cpSync(f, `paquet/${f}`);
cpSync("tools/paquet/README.md", "paquet/README.md");
writeFileSync("paquet/lecteur/index.js", readFileSync("site/src/lecteur.js", "utf8")
  .replace('"../../core/index.js"', '"../core/index.js"')
  .replace('"../../rendus/index.js"', '"../rendus/index.js"'));

writeFileSync("paquet/package.json", JSON.stringify({
  name: "artefacts-fx",
  version: racine.version,
  description: "232 game visual effects written in plain JavaScript (no images), drawn into a pixel buffer and shown in the style you pick: pixel art, code glyphs, ASCII, braille, CRT, Game Boy…",
  license: "MIT",
  type: "module",
  homepage: "https://naod.fr",
  repository: { type: "git", url: "git+https://github.com/Naod6473/artefacts-fx.git" },
  keywords: ["gamedev", "vfx", "effects", "pixel-art", "particles", "canvas", "ascii", "godot"],
  sideEffects: false,
  exports: {
    ".": "./core/index.js",
    "./effets": "./effets/index.js",
    "./effets/*": "./effets/*",
    "./rendus": "./rendus/index.js",
    "./rendus/*": "./rendus/*",
    "./lecteur": "./lecteur/index.js",
    "./package.json": "./package.json",
  },
  files: ["core", "effets", "rendus", "lecteur", "LICENSE", "NOTICE.md", "README.md"],
}, null, 2) + "\n");
console.log(`paquet/ : artefacts-fx ${racine.version}`);
