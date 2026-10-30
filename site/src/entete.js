// Pages sans script à elles (IA, mentions légales) : seulement le bouton de compte de l'en-tête commun,
// « Se connecter » ou « Mon espace », et les boutons « Copier » (data-copier : id du texte à copier).
import { initCompte } from "./compte.js";

const json = (id) => JSON.parse(document.getElementById(id).textContent);
const bulle = (texte) => {
  const d = document.createElement("div");
  d.className = "bulle-compte";
  d.setAttribute("role", "status");
  d.textContent = texte;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
};
initCompte({ base: document.body.dataset.base, T: json("textes-compte"), ERR: json("erreurs-compte"), bulle, connecte: async () => {}, deconnecte: () => {} });

for (const b of document.querySelectorAll("[data-copier]")) b.onclick = async () => {
  try { await navigator.clipboard.writeText(document.getElementById(b.dataset.copier).textContent); b.textContent = "✓"; } catch (_) {}
};
