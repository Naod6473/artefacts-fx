// Page de présentation : un effet en grand qui passe d'un rendu à l'autre, le même effet dans tous les rendus,
// et un aperçu de la bibliothèque.
import { Lecteur, boucle } from "./lecteur.js";
import { rendus, RENDU_PAR_DEFAUT } from "../../rendus/index.js";
import * as campfire from "../../effets/fire/campfire.js";
import * as lightningStrike from "../../effets/lightning/lightning-strike.js";
import * as portal from "../../effets/arcane/portal.js";
import * as frostNova from "../../effets/ice/frost-nova.js";
import * as levelUp from "../../effets/ui/level-up.js";
import * as bigExplosion from "../../effets/explosions/big-explosion.js";
import * as hologram from "../../effets/scifi/hologram.js";
import * as heal from "../../effets/holy/heal.js";
import * as blackHole from "../../effets/shadow/black-hole.js";
import * as slime from "../../effets/critters/slime.js";
import * as swordSlash from "../../effets/melee/sword-slash.js";
import * as coinSpin from "../../effets/pickups/coin-spin.js";
import * as waterfall from "../../effets/water/waterfall.js";
import * as glitch from "../../effets/scifi/glitch.js";

import registre from "../../effets/registre.json";
import { initCompte } from "./compte.js";

const LANGUE = document.documentElement.lang || "fr";
// numéro d'un effet (#0042) à partir de son module, pour ouvrir sa fiche dans la bibliothèque
const CHEMINS = new Map([[campfire, "fire/campfire"], [lightningStrike, "lightning/lightning-strike"], [portal, "arcane/portal"], [frostNova, "ice/frost-nova"], [levelUp, "ui/level-up"], [bigExplosion, "explosions/big-explosion"], [hologram, "scifi/hologram"], [heal, "holy/heal"], [blackHole, "shadow/black-hole"], [slime, "critters/slime"], [swordSlash, "melee/sword-slash"], [coinSpin, "pickups/coin-spin"], [waterfall, "water/waterfall"], [glitch, "scifi/glitch"]]);
const NUMEROS = Object.fromEntries(Object.entries(registre).map(([n, id]) => [id, n]));
/** Lien vers la fiche de l'effet, code source ouvert, dans le rendu donné. */
const lienCode = (mod, rendu) => `bibliotheque/#fx=${NUMEROS[CHEMINS.get(mod)]}&rendu=${rendu}&code=source`;
const nom = (r) => r.meta.nom[LANGUE] ?? r.meta.nom.fr;
const $ = (s) => document.querySelector(s);
const anim = boucle();
const T_CODE = document.body.dataset.voirCode;
const CYCLE = 3200; // ms par rendu dans la vitrine
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- la vitrine : un effet, les rendus défilent
const VEDETTES = [campfire, portal, lightningStrike, frostNova];
let vedette = 0, iRendu = 0, auto = !reduit, depuis = performance.now();
const cvV = $("#vitrine canvas"), legende = $("#vitrine-rendu"), boutons = $("#vitrine-rendus"), lienV = $("#vitrine a");
let lecteurV = new Lecteur(VEDETTES[0]);
const vue = { lecteur: lecteurV };
anim.ajouter(cvV, { avancer: (dt) => vue.lecteur.avancer(dt), dessiner: (cv, r, now) => vue.lecteur.dessiner(cv, r, now) }, () => {
  const now = performance.now();
  if (auto && now - depuis > CYCLE) {
    depuis = now;
    iRendu = (iRendu + 1) % rendus.length;
    if (iRendu === 0) { vedette = (vedette + 1) % VEDETTES.length; vue.lecteur = new Lecteur(VEDETTES[vedette]); }
    majVitrine();
  }
  return rendus[iRendu].meta.id;
});
rendus.forEach((r, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = nom(r);
  b.onclick = () => { iRendu = i; auto = false; majVitrine(); };
  boutons.appendChild(b);
});
$("#vitrine-auto").onclick = () => { auto = !auto; depuis = performance.now(); majVitrine(); };
function majVitrine() {
  legende.textContent = `${nom(rendus[iRendu])} · ${vue.lecteur.meta.name}`;
  lienV.href = lienCode(VEDETTES[vedette], rendus[iRendu].meta.id);
  boutons.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === iRendu)));
  $("#vitrine-auto").setAttribute("aria-pressed", String(auto));
}
majVitrine();

// ---------- le même effet dans tous les rendus, synchronisés
const COMPARES = [campfire, bigExplosion, portal, slime];
const grille = $("#comparaison");
let lecteurC = new Lecteur(COMPARES[0]);
const comp = { lecteur: lecteurC, tick: 0 };
const liensComp = [];
for (const r of rendus) {
  const f = document.createElement("figure");
  const a = document.createElement("a");
  const cv = document.createElement("canvas");
  const c = document.createElement("figcaption");
  c.textContent = nom(r);
  a.className = "vers-code";
  a.href = lienCode(COMPARES[0], r.meta.id);
  a.setAttribute("aria-label", `${T_CODE} · ${nom(r)}`);
  a.append(cv);
  liensComp.push([a, r]);
  f.append(a, c);
  grille.appendChild(f);
  // un seul lecteur pour toutes les cases : le temps n'avance qu'une fois par image
  anim.ajouter(cv, {
    avancer: (dt) => { const t = performance.now(); if (t !== comp.tick) { comp.tick = t; comp.lecteur.avancer(dt); } },
    dessiner: (cv, id, now) => comp.lecteur.dessiner(cv, id, now),
  }, () => r.meta.id);
}
const choix = $("#comparaison-effets");
COMPARES.forEach((m, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = m.meta.name;
  b.setAttribute("aria-pressed", String(i === 0));
  b.onclick = () => {
    comp.lecteur = new Lecteur(m);
    for (const [a, r] of liensComp) a.href = lienCode(m, r.meta.id);
    choix.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  };
  choix.appendChild(b);
});

// ---------- aperçu de la bibliothèque, dans le rendu choisi
let renduApercu = RENDU_PAR_DEFAUT;
try { renduApercu = localStorage.getItem("art-rendu") || renduApercu; } catch (_) {}
const sel = $("#apercu-rendu");
for (const r of rendus) sel.add(new Option(nom(r), r.meta.id));
sel.value = renduApercu;
sel.onchange = () => { renduApercu = sel.value; try { localStorage.setItem("art-rendu", renduApercu); } catch (_) {} };
const mur = $("#apercu");
for (const m of [lightningStrike, levelUp, hologram, heal, blackHole, swordSlash, coinSpin, waterfall, glitch, frostNova, bigExplosion, slime]) {
  const l = new Lecteur(m);
  const f = document.createElement("figure");
  const a = document.createElement("a");
  const cv = document.createElement("canvas");
  const c = document.createElement("figcaption");
  c.textContent = l.meta.name;
  a.className = "vers-code";
  a.setAttribute("aria-label", `${T_CODE} · ${l.meta.name}`);
  a.onclick = () => (a.href = lienCode(m, renduApercu)); // le rendu choisi au moment du clic
  a.href = lienCode(m, renduApercu);
  a.append(cv);
  f.append(a, c);
  mur.appendChild(f);
  anim.ajouter(cv, l, () => renduApercu, true);
}

// bouton « Se connecter » : même fenêtre que dans la bibliothèque ; favoris et projets se gèrent là-bas
{
  const T = JSON.parse(document.getElementById("textes-compte").textContent);
  const bulle = (texte) => {
    const d = document.createElement("div");
    d.className = "bulle-compte";
    d.setAttribute("role", "status");
    d.textContent = texte;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  };
  initCompte({ base: document.body.dataset.base, T, ERR: JSON.parse(document.getElementById("erreurs-compte").textContent), bulle, connecte: async () => {}, deconnecte: () => {} });
}
