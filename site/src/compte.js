// Compte membre (api/compte.php) : la fenêtre de connexion / inscription / mot de passe oublié, le bouton de l'en-tête,
// et les appels à l'API. Ce que le compte synchronise (favoris, projets) est géré par la page, via connecte / deconnecte.
import "./fond.js";
const $ = (s) => document.querySelector(s);
const TITRES = { connexion: "connexion_titre", inscription: "creer_titre", oubli: "oubli_titre", nouveau: "nouveau_titre" };
const BOUTONS = { connexion: "se_connecter", inscription: "creer_bouton", oubli: "oubli_bouton", nouveau: "nouveau_bouton" };

// « ≡ » de l'en-tête commun, sur téléphone : déplie les liens du menu (compte.js est chargé par toutes les pages)
const burger = $(".entete .burger");
if (burger) burger.onclick = () => {
  const ouvert = $("#menu-liens").classList.toggle("ouvert");
  burger.setAttribute("aria-expanded", String(ouvert));
};

// étoiles du dépôt dans le lien « ★ GitHub », seulement s'il y en a
fetch("https://api.github.com/repos/Naod6473/artefacts-fx").then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (d?.stargazers_count > 0 && $("#etoiles")) $("#etoiles").textContent = d.stargazers_count;
}).catch(() => {});

export function initCompte({ base, T, ERR, bulle, connecte, deconnecte }) {
  const fen = $("#fen-compte"), form = $("#cpt-form"), btn = $("#btn-compte");
  const langue = document.documentElement.lang || "fr";
  let membre = null, mode = "connexion", jetonMdp = null;

  async function appel(action, donnees) {
    const options = donnees === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(donnees) };
    const r = await fetch(`${base}api/compte/${action}`, { credentials: "same-origin", ...options });
    const d = await r.json().catch(() => ({ erreur: "defaut", detail: "HTTP " + r.status }));
    if (!r.ok || d.erreur) throw Object.assign(new Error(d.erreur ?? "defaut"), { code: d.erreur ?? "defaut", detail: d.detail ?? (ERR[d.erreur] ? "" : d.erreur) });
    return d;
  }

  // envois regroupés : pour une même clé, seule la dernière valeur part, après un court délai
  const attente = new Map();
  function differer(cle, envoi, delai = 800) {
    clearTimeout(attente.get(cle));
    attente.set(cle, setTimeout(() => { attente.delete(cle); envoi(); }, delai));
  }
  const annuler = (cle) => { clearTimeout(attente.get(cle)); attente.delete(cle); };

  const message = (code) => ERR[code] ?? ERR.defaut;
  const ecran = (nom) => ["cpt-entree", "cpt-envoye", "cpt-membre"].forEach((id) => { $("#" + id).hidden = id !== nom; });

  function choisirMode(m) {
    mode = m;
    ecran("cpt-entree");
    $("#cpt-titre").textContent = T[TITRES[m]];
    $("#cpt-valider").textContent = T[BOUTONS[m]];
    $("#cpt-l-email").hidden = m === "nouveau";
    $("#cpt-l-mdp").hidden = m === "oubli";
    $("#cpt-l-mdp").firstChild.textContent = m === "nouveau" ? T.nouveau_mdp : T.mdp;
    form.elements.mdp.autocomplete = m === "connexion" ? "current-password" : "new-password";
    for (const id of ["cpt-github", "cpt-github-aide", "cpt-ou", "cpt-intro"]) $("#" + id).hidden = m === "oubli" || m === "nouveau";
    fen.querySelectorAll("[data-mode]").forEach((b) => { b.hidden = b.dataset.mode === m || m === "nouveau"; });
    $("#cpt-erreur").textContent = "";
  }
  fen.querySelectorAll("[data-mode]").forEach((b) => { b.onclick = () => { choisirMode(b.dataset.mode); form.elements[mode === "nouveau" ? "mdp" : "email"].focus(); }; });

  function envoye(texte, email) {
    ecran("cpt-envoye");
    $("#cpt-envoye-texte").textContent = texte.replace("%s", email);
  }

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const email = form.elements.email.value.trim(), mdp = form.elements.mdp.value;
    const valider = $("#cpt-valider");
    valider.disabled = true;
    $("#cpt-erreur").textContent = "";
    try {
      if (mode === "connexion") await appel("connexion", { email, mdp });
      else if (mode === "inscription") return envoye(T.envoye_confirmer, (await appel("inscription", { email, mdp, langue }), email));
      else if (mode === "oubli") return envoye(T.envoye_oubli, (await appel("oubli", { email, langue }), email));
      else { await appel("reinitialiser", { j: jetonMdp, mdp }); jetonMdp = null; }
      form.reset();
      fen.close();
      await rafraichir();
      bulle(T.bienvenue);
    } catch (e) {
      $("#cpt-erreur").textContent = message(e.code) + (e.detail ? ` (${e.detail})` : "");
    } finally {
      valider.disabled = false;
    }
  };

  // connecté, le bouton de l'en-tête mène à « Mon espace » (favoris, projets, propositions, déconnexion)
  function majBouton() {
    btn.textContent = membre ? "◉ " + T.mon_espace : T.se_connecter;
    btn.title = membre ? membre.github || membre.email || "" : "";
    btn.setAttribute("aria-pressed", String(!!membre));
    btn.setAttribute("aria-haspopup", membre ? "false" : "dialog");
  }
  btn.onclick = () => {
    if (membre) { location.href = `${base}${langue}/compte/`; return; }
    choisirMode("connexion");
    fen.showModal();
  };
  /** Ouvre la fenêtre de connexion (pages qui demandent un compte). */
  const ouvrir = () => { choisirMode("connexion"); fen.showModal(); };

  $("#cpt-deconnexion").onclick = async () => {
    await appel("deconnexion", {}).catch(() => {});
    membre = null;
    majBouton();
    deconnecte(true);
    fen.close();
    bulle(T.deconnecte);
  };
  $("#cpt-supprimer").onclick = async () => {
    if (!confirm(T.supprimer_confirmer)) return;
    // mot de passe, ou pour un compte GitHub seul l'identifiant GitHub tapé à la main
    const saisie = prompt(membre.mdp ? T.supprimer_mdp : T.supprimer_github);
    if (saisie === null) return;
    try {
      await appel("supprimer-compte", membre.mdp ? { mdp: saisie } : { confirmation: saisie.trim() });
      membre = null;
      majBouton();
      deconnecte(true);
      fen.close();
      bulle(T.supprime);
    } catch (e) {
      bulle(message(e.code));
    }
  };

  async function rafraichir() {
    try {
      const d = await appel("moi");
      membre = d.connecte ? d : null;
    } catch (_) {
      membre = null; // API absente (aperçu local) ou injoignable : la page marche sans compte
    }
    majBouton();
    if (membre) await connecte(membre).catch(() => bulle(T.sync_ko));
  }

  /** Retour d'un lien envoyé par e-mail ou de GitHub : #compte=bienvenue, #compte=nouveau_mdp&j=… */
  function retour(code, j) {
    if (code === "nouveau_mdp" && j) {
      jetonMdp = j;
      choisirMode("nouveau");
      fen.showModal();
    } else if (code === "bienvenue") {
      bulle(T.bienvenue);
    } else if (code) {
      bulle(message(code));
    }
  }

  const pret = rafraichir();
  /** Déconnexion depuis la page (Mon espace) : même effet que le bouton de la fenêtre. */
  async function deconnecter() {
    await appel("deconnexion", {}).catch(() => {});
    membre = null;
    majBouton();
    deconnecte(true);
  }
  return { appel, differer, annuler, retour, pret, ouvrir, deconnecter, rafraichir, get membre() { return membre; } };
}
