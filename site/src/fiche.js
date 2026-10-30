// Page d'un effet (/fr/fx/42/) : l'image d'aperçu s'affiche tout de suite, puis l'effet tourne à sa place,
// dans le rendu choisi (le même que dans la bibliothèque, retenu par le navigateur).
import { charger } from "virtuel:catalogue";
import { Lecteur, boucle } from "./lecteur.js";
import { rendus, parId, RENDU_PAR_DEFAUT } from "../../rendus/index.js";
import { initCompte } from "./compte.js";

const $ = (s) => document.querySelector(s);
const LANGUE = document.documentElement.lang || "fr";
const CLE = "art-rendu"; // même mémoire que la bibliothèque
let rendu = RENDU_PAR_DEFAUT;
try { const r = JSON.parse(localStorage.getItem(CLE)); if (parId[r]) rendu = r; } catch (_) {}

const boutons = rendus.map((r) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = r.meta.nom[LANGUE] ?? r.meta.nom.fr;
  b.onclick = () => {
    rendu = r.meta.id;
    try { localStorage.setItem(CLE, JSON.stringify(rendu)); } catch (_) {}
    maj();
  };
  return b;
});
const maj = () => boutons.forEach((b, i) => b.setAttribute("aria-pressed", String(rendus[i].meta.id === rendu)));
$("#rendus").append(...boutons);
maj();

const mod = await charger[document.body.dataset.n]?.();
if (mod) {
  const cv = $("#apercu");
  cv.hidden = false;
  $("#poster").hidden = true;
  boucle().ajouter(cv, new Lecteur(mod), () => rendu);
}

{
  const T = JSON.parse($("#textes-compte").textContent);
  const bulle = (texte) => {
    const d = document.createElement("div");
    d.className = "bulle-compte";
    d.setAttribute("role", "status");
    d.textContent = texte;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  };
  initCompte({ base: document.body.dataset.base, T, ERR: JSON.parse($("#erreurs-compte").textContent), bulle, connecte: async () => {}, deconnecte: () => {} });
}
