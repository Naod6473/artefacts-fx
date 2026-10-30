// Proposer un effet : un éditeur, l'aperçu dans le bac à sable isolé, les vérifications automatiques, puis l'envoi
// à la modération (api/compte/proposer). Une proposition acceptée devient une pull request sur le dépôt GitHub.
import { Bac, valide } from "./bac.js";
import { rendus } from "../../rendus/index.js";
import { initCompte } from "./compte.js";

const $ = (s) => document.querySelector(s);
const json = (id) => JSON.parse(document.getElementById(id).textContent);
const LANGUE = document.documentElement.lang || "fr";
const BASE = document.body.dataset.base;
const T = json("textes"), STATUTS = json("statuts"), VERIFS = json("verifs"), TC = json("textes-compte");
const BROUILLON = "artefacts.proposition";

const MODELE = `import { fit, rand, clamp, TAU } from "../../core/index.js";

export const meta = {
  name: "Pulse Orb",
  desc: "${LANGUE === "fr" ? "Une petite orbe qui respire, lâche un anneau de lumière et quelques étincelles." : "A small orb that breathes, sends out a ring of light and a few sparks."}",
  tags: ["magic", "orb", "loop"],
  size: [64, 64], // ${LANGUE === "fr" ? "largeur, hauteur en pixels" : "width, height in pixels"}
  origin: [32, 32], // ${LANGUE === "fr" ? "le point (0, 0) de draw()" : "where (0, 0) of draw() sits"}
  duration: 1.5, // ${LANGUE === "fr" ? "secondes" : "seconds"}
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#140c2a", "#3b1f6e", "#7a3fc4", "#b77cff", "#e6ccff", "#ffffff"],
    seed: 1,
  },
};

// ${LANGUE === "fr" ? "p : le pinceau, centré sur meta.origin ; t : le temps, de 0 à meta.duration ; o : les options" : "p: the painter, centred on meta.origin; t: time, 0 to meta.duration; o: the options"}
export function draw(p, t, o) {
  const C = fit(o.palette, 6), k = t / meta.duration, souffle = 0.5 + 0.5 * Math.sin(k * TAU);
  // ${LANGUE === "fr" ? "l'anneau grandit et s'efface en une boucle" : "the ring grows and fades over one loop"}
  const R = 6 + k * 22;
  p.ring(0, 0, R, 2, C[3], clamp(1 - k));
  p.glowRing(0, 0, R, 4, C[3], 0.4 * (1 - k));
  // ${LANGUE === "fr" ? "rand(i, graine) donne toujours le même nombre : les images se répètent à l'identique" : "rand(i, seed) always gives the same number: frames repeat exactly"}
  for (let i = 0; i < 8; i++) {
    const a = rand(i, o.seed) * TAU + k * TAU, d = 10 + rand(i, o.seed, 1) * 12;
    p.px(Math.cos(a) * d, Math.sin(a) * d, C[4]);
  }
  p.circle(0, 0, 5 + souffle * 2, (d) => C[Math.min(5, Math.floor((1 - d) * 4) + 1)]);
  p.glow(0, 0, 14, C[3], 0.3 + 0.3 * souffle);
}
`;

const code = $("#code"), form = $("#envoi"), btnEnvoyer = $("#envoyer");
const bac = new Bac($("#apercu"), BASE);
let rendu = "pixel", dernier = null, courant = null, membre = null, mes = [];

// ---------- éditeur ----------
let brouillon = null;
try { brouillon = JSON.parse(localStorage.getItem(BROUILLON)); } catch (_) {}
code.value = brouillon?.code ?? MODELE;
courant = brouillon?.id ?? null;
form.elements.credit.value = brouillon?.credit ?? "";
const garder = () => { try { localStorage.setItem(BROUILLON, JSON.stringify({ code: code.value, id: courant, credit: form.elements.credit.value })); } catch (_) {} };

code.addEventListener("keydown", (e) => {
  // Tab insère deux espaces (Échap puis Tab pour sortir de l'éditeur au clavier)
  if (e.key !== "Tab" || e.shiftKey || code.dataset.sortir) return;
  e.preventDefault();
  code.setRangeText("  ", code.selectionStart, code.selectionEnd, "end");
  modifie();
});
code.addEventListener("keyup", (e) => { if (e.key === "Escape") code.dataset.sortir = "1"; });
code.addEventListener("blur", () => delete code.dataset.sortir);
let delai = null;
function modifie() {
  majTaille();
  garder();
  clearTimeout(delai);
  delai = setTimeout(tester, 900);
}
code.addEventListener("input", modifie);
form.elements.credit.addEventListener("input", garder);
const majTaille = () => { $("#taille").textContent = `${(new TextEncoder().encode(code.value).length / 1000).toFixed(1)} / 30 ko`; };

$("#modele").onclick = () => {
  if (code.value !== MODELE && !confirm(T.modele_confirmer)) return;
  code.value = MODELE;
  courant = null;
  modifie();
  majEtat();
};

// ---------- aperçu et vérifications ----------
for (const r of rendus) $("#rendu").add(new Option(r.meta.nom[LANGUE] ?? r.meta.nom.fr, r.meta.id));
$("#rendu").value = rendu;
$("#rendu").onchange = () => { rendu = $("#rendu").value; bac.rendu(rendu); };
$("#relancer").onclick = () => bac.relancer();
$("#tester").onclick = tester;

let numeroTest = 0;
async function tester() {
  const n = ++numeroTest;
  $("#tests").replaceChildren(ligne({ ok: null, cle: "en_cours" }));
  const r = await bac.lancer(code.value, rendu);
  if (n !== numeroTest) return;
  dernier = r;
  $("#tests").replaceChildren(...r.resultats.map(ligne));
  // le premier point bloquant s'affiche sur l'aperçu, qui sinon resterait noir sans explication
  const ko = r.resultats.find((x) => !x.ok && x.grave);
  $("#apercu-erreur").hidden = !ko;
  if (ko) $("#apercu-erreur").textContent = `✗ ${VERIFS[ko.cle] ?? ko.cle}${ko.detail ? " : " + ko.detail : ""}`;
  majEtat();
}

function ligne(r) {
  const li = document.createElement("li");
  li.className = r.ok === null ? "attente" : r.ok ? "ok" : r.grave ? "ko" : "note";
  const v = VERIFS[r.cle] ?? r.cle;
  li.textContent = `${r.ok === null ? "…" : r.ok ? "✓" : r.grave ? "✗" : "!"} ${r.ok === null ? T.en_cours : v}`;
  if (r.detail) {
    const d = document.createElement("span");
    d.className = "dim";
    d.textContent = " " + r.detail;
    li.append(d);
  }
  return li;
}

/** Bouton d'envoi et ligne d'état ; garderTexte laisse en place le message d'un envoi qui vient de se faire. */
function majEtat(garderTexte = false) {
  const ok = dernier && valide(dernier.resultats);
  btnEnvoyer.disabled = !membre || !ok;
  btnEnvoyer.textContent = courant ? T.edition : T.nouvelle;
  if (!garderTexte) $("#etat").textContent = !dernier ? "" : ok ? (membre ? T.pret : "") : T.a_corriger;
}

// ---------- envoi ----------
form.onsubmit = async (e) => {
  e.preventDefault();
  if (!form.elements.licence.checked) { $("#etat").textContent = T.licence_manque; return; }
  if (!dernier || !valide(dernier.resultats)) return;
  btnEnvoyer.disabled = true;
  $("#etat").textContent = T.en_cours;
  try {
    const d = await compte.appel("proposer", {
      id: courant, code: code.value, credit: form.elements.credit.value.trim(), nom: dernier.meta?.name ?? "", langue: LANGUE,
    });
    const texte = courant ? T.maj : T.envoye;
    courant = d.id;
    garder();
    await chargerMes();
    $("#etat").textContent = texte;
  } catch (err) {
    $("#etat").textContent = `${T.ko} (${err.detail || err.code})`;
  } finally {
    majEtat(true);
  }
};

// ---------- mes propositions ----------
async function chargerMes() {
  if (!membre) return;
  mes = (await compte.appel("mes-propositions")).propositions ?? [];
  // la proposition en cours d'édition a été acceptée ou retirée : la suite repart d'une nouvelle
  if (courant && !mes.some((p) => p.id === courant && ["attente", "a_revoir"].includes(p.statut))) courant = null;
  $("#mes").hidden = false;
  $("#mes-vide").hidden = mes.length > 0;
  $("#mes-liste").replaceChildren(...mes.map(carte));
  majEtat(true);
}

function carte(p) {
  const li = document.createElement("li");
  li.className = "prop";
  const tete = document.createElement("div");
  tete.className = "tete";
  const nom = document.createElement("strong");
  nom.textContent = p.nom;
  const st = document.createElement("span");
  st.className = "statut " + p.statut;
  st.textContent = STATUTS[p.statut] ?? p.statut;
  const date = document.createElement("span");
  date.className = "dim petit";
  date.textContent = new Date(p.modifie * 1000).toLocaleDateString(LANGUE);
  tete.append(nom, st, date);
  li.append(tete);
  if (p.message) {
    const m = document.createElement("p");
    m.className = "message";
    m.textContent = "« " + p.message + " »";
    li.append(m);
  }
  const actions = document.createElement("div");
  actions.className = "actions";
  if (p.pr_url) {
    const a = document.createElement("a");
    a.href = p.pr_url;
    a.textContent = T.pr + " ↗";
    a.rel = "noopener";
    a.target = "_blank";
    actions.append(a);
  }
  const reprendre = document.createElement("button");
  reprendre.type = "button";
  reprendre.textContent = T.reprendre;
  reprendre.onclick = async () => {
    const d = await compte.appel("proposition?id=" + p.id);
    code.value = d.code;
    form.elements.credit.value = d.credit ?? "";
    courant = ["attente", "a_revoir"].includes(p.statut) ? p.id : null;
    modifie();
    majEtat();
    code.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  actions.append(reprendre);
  if (["attente", "a_revoir"].includes(p.statut)) {
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.textContent = T.retirer;
    retirer.onclick = async () => {
      if (!confirm(T.retirer_confirmer.replace("%s", p.nom))) return;
      await compte.appel("proposition-retirer", { id: p.id });
      await chargerMes();
    };
    actions.append(retirer);
  }
  li.append(actions);
  return li;
}

// ---------- compte ----------
const bulle = (texte) => {
  const d = document.createElement("div");
  d.className = "bulle-compte";
  d.setAttribute("role", "status");
  d.textContent = texte;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
};
const compte = initCompte({
  base: BASE, T: TC, ERR: json("erreurs-compte"), bulle,
  connecte: async (m) => {
    membre = m;
    $("#hors-connexion").hidden = true;
    $("#nav-moderation").hidden = !m.admin;
    await chargerMes();
  },
  deconnecte: () => {
    membre = null;
    $("#hors-connexion").hidden = false;
    $("#nav-moderation").hidden = true;
    $("#mes").hidden = true;
    majEtat();
  },
});
$("#prop-connexion").onclick = () => $("#btn-compte").click();
compte.pret.then(() => { if (!compte.membre) $("#hors-connexion").hidden = false; });
$("#hors-connexion").hidden = true;

majTaille();
majEtat();
tester();
