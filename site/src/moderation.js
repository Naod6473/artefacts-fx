// Modération des effets proposés (réservée à l'administrateur) : chaque proposition tourne dans le même bac à sable
// isolé que sur la page Proposer. Accepter ouvre une pull request sur le dépôt ; le site se met à jour à sa fusion.
import { Bac } from "./bac.js";
import { rendus } from "../../rendus/index.js";
import { initCompte } from "./compte.js";

const $ = (s) => document.querySelector(s);
const json = (id) => JSON.parse(document.getElementById(id).textContent);
const LANGUE = document.documentElement.lang || "fr";
const BASE = document.body.dataset.base;
const T = json("textes"), STATUTS = json("statuts"), VERIFS = json("verifs");

let bac = null, rendu = "pixel", liste = [], choisie = null;

for (const r of rendus) $("#rendu").add(new Option(r.meta.nom[LANGUE] ?? r.meta.nom.fr, r.meta.id));
$("#rendu").value = rendu;
$("#rendu").onchange = () => { rendu = $("#rendu").value; bac?.rendu(rendu); };
$("#relancer").onclick = () => bac?.relancer();
$("#filtre").onchange = charger;

async function charger() {
  const d = await compte.appel("moderation?filtre=" + $("#filtre").value);
  liste = d.propositions;
  $("#jeton").textContent = d.jeton ? "" : T.jeton_absent;
  $("#vide").hidden = liste.length > 0;
  $("#liste").replaceChildren(...liste.map((p) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-pressed", String(p.id === choisie?.id));
    const st = STATUTS[p.statut] ?? p.statut;
    b.textContent = `#${p.id} ${p.nom} · ${st} · ${new Date(p.modifie * 1000).toLocaleDateString(LANGUE)}`;
    b.onclick = () => { $("#etat").textContent = ""; examiner(p.id); };
    li.append(b);
    return li;
  }));
  if (!liste.length) $("#examen").hidden = true;
  else if (!choisie) examiner(liste[0].id);
}

async function examiner(id) {
  const p = await compte.appel("proposition?id=" + id);
  choisie = p;
  $("#liste").querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(liste[i].id === id)));
  $("#examen").hidden = false;
  $("#ex-nom").textContent = `#${p.id} ${p.nom}`;
  $("#ex-qui").textContent = `${T.par} ${[p.credit && "« " + p.credit + " »", p.auteur].filter(Boolean).join(" · ")} · ${STATUTS[p.statut] ?? p.statut}`
    + (p.pr_url ? " · " + p.pr_url : "");
  $("#ex-code").textContent = p.code;
  $("#message").value = p.message ?? "";
  bac ??= new Bac($("#apercu"), BASE);
  $("#tests").replaceChildren(li("…", "attente"));
  const r = await bac.lancer(p.code, rendu);
  if (choisie?.id !== id) return;
  $("#tests").replaceChildren(...r.resultats.map((t) => li(`${t.ok ? "✓" : t.grave ? "✗" : "!"} ${VERIFS[t.cle] ?? t.cle} ${t.detail ?? ""}`, t.ok ? "ok" : t.grave ? "ko" : "note")));
}
const li = (texte, classe) => Object.assign(document.createElement("li"), { textContent: texte, className: classe });

for (const b of document.querySelectorAll("[data-decision]")) {
  b.onclick = async () => {
    if (!choisie) return;
    const decision = b.dataset.decision;
    if (decision === "accepter" && !confirm(T.accepter_confirmer.replace("%s", choisie.nom))) return;
    document.querySelectorAll("[data-decision]").forEach((x) => (x.disabled = true));
    $("#etat").textContent = T.en_cours;
    try {
      const d = await compte.appel("moderer", { id: choisie.id, decision, message: $("#message").value });
      $("#etat").textContent = d.pr_url ? T.fait_pr + " " + d.pr_url : T.fait;
      choisie = null;
      await charger();
    } catch (err) {
      $("#etat").textContent = `${T.ko} (${err.detail || err.code})`;
    } finally {
      document.querySelectorAll("[data-decision]").forEach((x) => (x.disabled = false));
    }
  };
}

const bulle = (texte) => {
  const d = document.createElement("div");
  d.className = "bulle-compte";
  d.setAttribute("role", "status");
  d.textContent = texte;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
};
const compte = initCompte({
  base: BASE, T: json("textes-compte"), ERR: json("erreurs-compte"), bulle,
  connecte: async (m) => {
    $("#refus").hidden = !!m.admin;
    $("#contenu").hidden = !m.admin;
    if (m.admin) await charger();
  },
  deconnecte: () => { $("#refus").hidden = false; $("#contenu").hidden = true; },
});
compte.pret.then(() => { if (!compte.membre) $("#refus").hidden = false; });
