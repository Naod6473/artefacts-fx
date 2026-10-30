// Mon espace (/fr/compte/) : là où mène le bouton de l'en-tête une fois connecté. Résumé du compte (favoris,
// projets, propositions, relectures en attente pour l'administrateur), mot de passe, déconnexion, suppression.
import { initCompte } from "./compte.js";

const $ = (s) => document.querySelector(s);
const json = (id) => JSON.parse(document.getElementById(id).textContent);
const LANGUE = document.documentElement.lang || "fr";
const BASE = document.body.dataset.base;
const T = json("textes"), TC = json("textes-compte"), ERR = json("erreurs-compte");

const bulle = (texte) => {
  const d = document.createElement("div");
  d.className = "bulle-compte";
  d.setAttribute("role", "status");
  d.textContent = texte;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
};

async function afficher(m) {
  $("#hors-connexion").hidden = true;
  $("#contenu").hidden = false;
  $("#esp-qui").textContent = [m.email, m.github && "GitHub @" + m.github].filter(Boolean).join(" · ");
  $("#esp-favoris").textContent = m.favoris.length;
  // le projet créé d'office ne compte que s'il contient des effets
  const projets = m.projets.filter((p) => p.effets.length || m.projets.length > 1);
  $("#esp-projets").textContent = projets.length;
  $("#esp-mdp-bloc").hidden = !m.mdp;
  $("#esp-projets-liste-bloc").hidden = !projets.length;
  $("#esp-projets-liste").replaceChildren(...projets.map((p) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `${BASE}${LANGUE}/bibliotheque/#vue=projet`;
    a.textContent = p.nom;
    const n = document.createElement("span");
    n.className = "dim";
    n.textContent = ` · ${p.effets.length} ${p.effets.length > 1 ? T.effets : T.effet} · ${new Date(p.modifie * 1000).toLocaleDateString(LANGUE)}`;
    li.append(a, n);
    return li;
  }));
  const [mes, mod] = await Promise.all([
    compte.appel("mes-propositions").catch(() => ({ propositions: [] })),
    m.admin ? compte.appel("moderation").catch(() => ({ propositions: [] })) : null,
  ]);
  $("#esp-propositions").textContent = mes.propositions.length;
  $("#esp-moderation").hidden = !m.admin;
  if (mod) $("#esp-attente").textContent = mod.propositions.length;
}

function horsConnexion() {
  $("#contenu").hidden = true;
  $("#hors-connexion").hidden = false;
}

const compte = initCompte({ base: BASE, T: TC, ERR, bulle, connecte: afficher, deconnecte: horsConnexion });
compte.pret.then(() => { if (!compte.membre) horsConnexion(); });
$("#esp-connexion").onclick = () => compte.ouvrir();

$("#esp-deconnexion").onclick = async () => {
  await compte.deconnecter();
  bulle(TC.deconnecte);
};
// la suppression passe par le bouton de la fenêtre de compte, qui demande confirmation et mot de passe
$("#esp-supprimer").onclick = () => $("#cpt-supprimer").click();

$("#esp-mdp").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  $("#esp-mdp-etat").textContent = "";
  try {
    await compte.appel("changer-mdp", { ancien: f.elements.ancien.value, mdp: f.elements.mdp.value });
    f.reset();
    $("#esp-mdp-etat").textContent = T.mdp_ok;
  } catch (err) {
    $("#esp-mdp-etat").textContent = ERR[err.code] ?? ERR.defaut;
  }
};
