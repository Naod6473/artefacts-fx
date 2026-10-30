// La bibliothèque : tous les effets dans un mur filtré par la recherche et les tags, et un panneau qui montre
// l'effet choisi (lecture, curseur de temps, comparaison des rendus, code). Sans compte, favoris et projet brouillon
// sont gardés dans le navigateur ; avec un compte, ils sont sur le serveur et le membre a plusieurs projets.
import { usage as usageDe } from "./usage.js";
import { Lecteur, boucle, vuePartagee, pleinEcran } from "./lecteur.js";
import { rendus, parId, RENDU_PAR_DEFAUT } from "../../rendus/index.js";
import { catalogue, charger, source } from "virtuel:catalogue";
import { CATEGORIES_FR, TAGS_FR, SYNONYMES } from "./tags.js";
import { initCompte } from "./compte.js";
import { planche, dimensions, spriteFrames, scene, COTE_MAX } from "./planche.js";
import { zip, telecharger } from "./zip.js";
import { exporterProjet } from "./exportProjet.js";

const $ = (s) => document.querySelector(s);
const LANGUE = document.documentElement.lang || "fr";
const T = JSON.parse($("#textes").textContent);
const nomRendu = (r) => r.meta.nom[LANGUE] ?? r.meta.nom.fr;
const memo = {
  lire(k, d) { try { return JSON.parse(localStorage.getItem("art-" + k)) ?? d; } catch (_) { return d; } },
  ecrire(k, v) { try { localStorage.setItem("art-" + k, JSON.stringify(v)); } catch (_) {} },
};
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- les effets
const fr = LANGUE === "fr";
const tagLocal = (t) => (fr ? TAGS_FR[t] ?? t : t);
const AUTO = fr ? { loop: "boucle", once: "une-fois" } : { loop: "loop", once: "one-shot" };
const LIB = catalogue.map((c) => {
  const cat = c.id.split("/")[0];
  const meta = { size: c.size, origin: c.origin, bg: c.bg, loop: c.loop, duration: c.duration };
  const brut = [cat, c.loop ? "loop" : "one-shot", c.bg === "ground" ? "ground" : null, pleinEcran(meta) ? "screen" : null, c.actor ? "actor" : null, ...c.tags];
  const tags = [...new Set(brut.filter(Boolean).map((t) => (t === cat && fr ? CATEGORIES_FR[cat] ?? cat : tagLocal(t))))];
  const slug = c.id.split("/")[1].replace(/-/g, "_");
  const mots = [c.n, String(+c.n), c.name, c.name_fr, slug, c.desc, c.desc_fr, cat, CATEGORIES_FR[cat], c.couleur, ...brut, ...brut.map((t) => TAGS_FR[t])].filter(Boolean);
  // nom et description affichés dans la langue de la page ; la recherche trouve les deux langues
  return { ...c, name: fr ? c.name_fr ?? c.name : c.name, desc: fr ? c.desc_fr ?? c.desc : c.desc, meta, cat, tags, slug, tagsNorm: tags.map(norm).concat(brut.filter(Boolean).map(norm)), texte: norm(mots.join(" ")), jetons: new Set(norm(mots.join(" ")).split(/[^a-z0-9]+/).filter((x) => x.length > 2)) };
});
const parNumero = new Map(LIB.map((e) => [e.n, e]));

// ---------- état (l'URL garde recherche, tags, rendu, vue et effet ouvert : un lien se partage tel quel)
const etat = { q: "", tags: new Set(), rendu: memo.lire("rendu", RENDU_PAR_DEFAUT), vue: "tout", tri: "numero", choisi: null };
if (!parId[etat.rendu]) etat.rendu = RENDU_PAR_DEFAUT;
const favoris = new Set(memo.lire("favoris", []));
let projet = memo.lire("projet", []); // effets du projet affiché : [{ n, rendu, note }]
let projets = null, actif = null; // membre connecté : tous ses projets [{ id, nom, effets }] et celui affiché
let retourCompte = null;
// réglages de l'effet ouvert : options changées à la main, et teinte appliquée aux couleurs
const REG_VIDE = () => ({ opts: {}, h: 0, s: 1, l: 0, tout: false });
let reg = REG_VIDE();
const regModifie = () => Object.keys(reg.opts).length > 0 || reg.h !== 0 || reg.s !== 1 || reg.l !== 0;
const regTexte = () => (regModifie() ? JSON.stringify(reg) : "");
function lireReg(texte) {
  try {
    const r = JSON.parse(texte);
    return { ...REG_VIDE(), ...r, opts: r && typeof r.opts === "object" && r.opts ? r.opts : {} };
  } catch (_) { return REG_VIDE(); }
}
const dansProjet = (e) => projet.find((p) => p.n === e.n);

function lireUrl() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.has("q")) etat.q = p.get("q");
  if (p.has("tags")) etat.tags = new Set(p.get("tags").split(",").filter(Boolean));
  if (p.has("rendu") && parId[p.get("rendu")]) etat.rendu = p.get("rendu");
  if (["favoris", "projet"].includes(p.get("vue"))) etat.vue = p.get("vue");
  if (p.has("fx")) etat.choisi = parNumero.get(p.get("fx").padStart(4, "0")) ?? null;
  // arrivée depuis l'accueil (« voir le code ») : onglet code source ouvert et visible
  if (p.get("code") === "source") { onglet = "source"; allerAuCode = true; }
  if (p.has("compte")) retourCompte = [p.get("compte"), p.get("j")];
  if (p.has("o")) { reg = lireReg(p.get("o")); regDepuisUrl = true; }
}
function ecrireUrl() {
  const p = new URLSearchParams();
  if (etat.q) p.set("q", etat.q);
  if (etat.tags.size) p.set("tags", [...etat.tags].join(","));
  if (etat.vue !== "tout") p.set("vue", etat.vue);
  p.set("rendu", etat.rendu);
  if (etat.choisi) p.set("fx", etat.choisi.n);
  if (etat.choisi && regModifie()) p.set("o", regTexte());
  history.replaceState(null, "", "#" + p.toString().replace(/%2C/g, ",").replace(/%3A/g, ":"));
}

// ---------- recherche : #42, feu, exlposion (une faute tolérée), tag:boucle, -fumée, dur:<1, couleur:cyan
function proche(a, b) {
  // distance d'édition ≤ 1 (une lettre en trop, en moins, changée, ou deux lettres inversées)
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, fautes = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++fautes > 1) return false;
    if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; continue; }
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return fautes + (a.length - i) + (b.length - j) <= 1;
}
function analyser(q) {
  const out = { mots: [], tags: [], non: [], dur: null, couleur: null, numero: null };
  for (let w of norm(q).split(/\s+/).filter(Boolean)) {
    const neg = w.startsWith("-") && w.length > 1;
    if (neg) w = w.slice(1);
    let m;
    if ((m = w.match(/^#?(\d{1,4})$/))) out.numero = m[1].padStart(4, "0");
    else if ((m = w.match(/^dur:([<>])(\d+(?:[.,]\d+)?)$/))) out.dur = [m[1], parseFloat(m[2].replace(",", "."))];
    else if (w.startsWith("tag:")) (neg ? out.non : out.tags).push({ tag: w.slice(4) });
    else if (w.startsWith("couleur:") || w.startsWith("color:")) out.couleur = w.split(":")[1];
    else (neg ? out.non : out.mots).push({ mot: w });
  }
  return out;
}
const COULEURS_EN = { red: "rouge", orange: "orange", yellow: "jaune", green: "vert", cyan: "cyan", blue: "bleu", purple: "violet", pink: "rose", white: "blanc", grey: "gris", gray: "gris" };
/** Score d'un effet pour la recherche, ou -1 s'il ne correspond pas. */
function score(e, a) {
  for (const t of etat.tags) if (!e.tags.includes(t)) return -1;
  if (etat.vue === "favoris" && !favoris.has(e.n)) return -1;
  if (etat.vue === "projet" && !dansProjet(e)) return -1;
  if (a.numero) return e.n === a.numero ? 1000 : -1;
  if (a.dur && !(a.dur[0] === "<" ? e.duration < a.dur[1] : e.duration > a.dur[1])) return -1;
  if (a.couleur && e.couleur !== (COULEURS_EN[a.couleur] ?? a.couleur)) return -1;
  for (const { tag } of a.tags) if (!e.tagsNorm.includes(tag)) return -1;
  for (const { mot, tag } of a.non) if ((tag && e.tagsNorm.includes(tag)) || (mot && e.texte.includes(mot))) return -1;
  let s = 1;
  for (const { mot } of a.mots) {
    const syn = SYNONYMES[mot];
    if (norm(e.name).startsWith(mot) || e.slug.startsWith(mot)) s += 50;
    else if (e.tagsNorm.includes(mot) || (syn && e.tagsNorm.includes(syn))) s += 30;
    else if (e.texte.includes(mot) || (syn && e.texte.includes(syn))) s += 10;
    else if (mot.length >= 4 && [...e.jetons].some((j) => proche(mot, j))) s += 5;
    else return -1;
  }
  return s;
}

// ---------- contrôles du haut
const anim = boucle();
const rangee = $("#rendus");
for (const r of rendus) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = nomRendu(r);
  b.dataset.rendu = r.meta.id;
  b.onclick = () => choisirRendu(r.meta.id);
  rangee.appendChild(b);
}
function choisirRendu(id) {
  etat.rendu = id;
  memo.ecrire("rendu", id);
  rangee.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rendu === id)));
  majComparaison();
  if (etat.choisi && dansProjet(etat.choisi)) { dansProjet(etat.choisi).rendu = id; sauverProjet(); }
  ecrireUrl();
}
const recherche = $("#recherche");
recherche.oninput = () => { etat.q = recherche.value; majMur(); };
recherche.onkeydown = (ev) => {
  if (ev.key !== "Enter") return;
  const premier = LIB.find((e) => !cartes.get(e).hidden);
  if (premier) ouvrir(premier);
};
document.querySelectorAll("[data-vue]").forEach((b) => (b.onclick = () => { etat.vue = b.dataset.vue; majMur(); }));
$("#tri").onchange = (ev) => { etat.tri = ev.target.value; majMur(); };

$("#filtrer").onclick = () => $("#filtrer").setAttribute("aria-expanded", String($("#tags").classList.toggle("deplies")));
function majTags(res) {
  $("#nb-filtres").textContent = etat.tags.size ? `(${etat.tags.size})` : "";
  const n = new Map();
  for (const e of res) for (const t of e.tags) n.set(t, (n.get(t) ?? 0) + 1);
  for (const t of etat.tags) if (!n.has(t)) n.set(t, 0);
  const tri = [...n].sort((a, b) => etat.tags.has(b[0]) - etat.tags.has(a[0]) || b[1] - a[1]).slice(0, 16);
  $("#tags").replaceChildren(...tri.map(([t, c]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag";
    b.setAttribute("aria-pressed", String(etat.tags.has(t)));
    b.innerHTML = `#${esc(t)} <span>${c}</span>`;
    b.onclick = () => { etat.tags.has(t) ? etat.tags.delete(t) : etat.tags.add(t); majMur(); };
    return b;
  }));
}

// ---------- le mur : une carte par effet ; son code n'est chargé que lorsqu'elle arrive à l'écran
const mur = $("#mur"), cartes = new Map();
const charge = new IntersectionObserver((es) => {
  for (const en of es) {
    if (!en.isIntersecting) continue;
    charge.unobserve(en.target);
    const e = en.target._effet;
    charger[e.n]().then((mod) => anim.ajouter(en.target.querySelector("canvas"), new Lecteur(mod), () => etat.rendu, true));
  }
}, { rootMargin: "300px" });
for (const e of LIB) {
  const el = document.createElement("article");
  el.className = "carte" + (pleinEcran(e.meta) ? " large" : "");
  el._effet = e;
  el.innerHTML = `<button type="button" class="ouvrir" aria-label="${esc(e.name)}"><canvas style="aspect-ratio:${pleinEcran(e.meta) ? "16/9" : "4/3"}"></canvas></button>
    <div class="ligne"><b>${esc(e.name)}</b><button type="button" class="coeur" aria-label="${esc(T.favori)}">♥</button></div>
    <span class="info"><span class="num">#${e.n}</span> · ${e.loop ? AUTO.loop : AUTO.once} · ${e.duration}s</span>`;
  el.querySelector(".ouvrir").onclick = (ev) => { ouvrir(e); montrerPanneau(ev.detail === 0); };
  el.querySelector(".coeur").onclick = () => basculerFavori(e);
  mur.appendChild(el);
  cartes.set(e, el);
  charge.observe(el);
}
let ordre = [];
function majMur() {
  const a = analyser(etat.q);
  const res = LIB.map((e) => [e, score(e, a)]).filter(([, s]) => s >= 0);
  const cle = { numero: (x, y) => x[0].n.localeCompare(y[0].n), recent: (x, y) => y[0].n.localeCompare(x[0].n), nom: (x, y) => x[0].name.localeCompare(y[0].name), duree: (x, y) => x[0].duration - y[0].duration }[etat.tri];
  res.sort((x, y) => (etat.q ? y[1] - x[1] : 0) || cle(x, y));
  ordre = res.map(([e]) => e);
  const visibles = new Set(ordre);
  for (const [e, el] of cartes) el.hidden = !visibles.has(e);
  mur.append(...ordre.map((e) => cartes.get(e))); // l'ordre du DOM suit le tri
  const n = ordre.length;
  $("#compte").innerHTML = n === LIB.length ? `<b>${n}</b> ${T.effets}` : `<b>${n}</b> ${n > 1 ? T.affiches : T.affiche} / ${LIB.length}`;
  $("#vide").hidden = ordre.length > 0;
  $("#vide").textContent = etat.vue === "favoris" && !favoris.size ? T.vide_favoris : etat.vue === "projet" && !projet.length ? T.vide_projet : T.vide;
  document.querySelectorAll("[data-vue]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vue === etat.vue)));
  $("#nb-favoris").textContent = favoris.size;
  $("#nb-projet").textContent = projet.length;
  $("#projets").hidden = !(projets && etat.vue === "projet");
  $("#projet-zip").hidden = !(etat.vue === "projet" && projet.length);
  majTags(ordre);
  // une recherche par numéro ouvre l'effet directement
  if (a.numero && ordre.length === 1 && etat.choisi !== ordre[0]) ouvrir(ordre[0]);
  ecrireUrl();
}

function basculerFavori(e) {
  favoris.has(e.n) ? favoris.delete(e.n) : favoris.add(e.n);
  sauverFavoris();
  majCoeurs();
  if (etat.vue === "favoris") majMur();
  else $("#nb-favoris").textContent = favoris.size;
}
function majCoeurs() {
  for (const [e, el] of cartes) el.querySelector(".coeur").setAttribute("aria-pressed", String(favoris.has(e.n)));
  if (etat.choisi) $("#fx-coeur").setAttribute("aria-pressed", String(favoris.has(etat.choisi.n)));
}

// ---------- le panneau
let grand = null;
const vue = vuePartagee(() => grand);
anim.ajouter($("#apercu"), vue, () => etat.rendu);
const autres = () => rendus.map((r) => r.meta.id).filter((id) => id !== etat.rendu).slice(0, 4);
document.querySelectorAll("#comparaison canvas").forEach((cv, i) => anim.ajouter(cv, vue, () => autres()[i]));
function majComparaison() {
  const a = autres();
  document.querySelectorAll("#comparaison figcaption").forEach((c, i) => (c.textContent = nomRendu(parId[a[i]])));
}
document.querySelectorAll("#comparaison figure").forEach((f, i) => (f.onclick = () => choisirRendu(autres()[i])));

const lecture = $("#lecture"), temps = $("#temps"), curseur = $("#curseur");
lecture.onclick = () => { if (grand) { grand.enPause = !grand.enPause; majLecture(); } };
function majLecture() {
  lecture.setAttribute("aria-label", grand?.enPause ? T.lire : T.pause);
  lecture.textContent = grand?.enPause ? "▶" : "❚❚";
}
curseur.oninput = () => {
  if (!grand) return;
  grand.enPause = true;
  grand.aller((curseur.value / 1000) * grand.meta.duration);
  majLecture();
};
$("#vitesse").onchange = (ev) => { if (grand) grand.vitesse = +ev.target.value; };
(function suivre() {
  if (grand) {
    const d = grand.meta.duration, t = grand.temps;
    if (!grand.enPause) curseur.value = Math.round((t / d) * 1000);
    temps.textContent = `${t.toFixed(1).replace(".", T.virgule)} / ${d.toFixed(1).replace(".", T.virgule)} s`;
  }
  requestAnimationFrame(suivre);
})();

const usage = (e) => usageDe(e, optionsCode(e));
let onglet = "usage", allerAuCode = false;
document.querySelectorAll("[role=tab]").forEach((b) => (b.onclick = () => { onglet = b.dataset.onglet; majCode(); }));
async function majCode() {
  document.querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.onglet === onglet)));
  const e = etat.choisi;
  if (!e) return;
  if (onglet === "usage") { $("#code").textContent = usage(e); return; }
  $("#code").textContent = "…";
  const texte = (await source[e.n]()).default;
  if (etat.choisi === e && onglet === "source") $("#code").textContent = texte;
}
$("#copier").onclick = () => copier($("#code").textContent, T.copie);
$("#lien").onclick = () => (regModifie() ? copier(location.href, T.rg_lien_copie) : copier(`${location.origin}${T.base}fx/${+etat.choisi.n}`, T.lien_copie));
async function copier(texte, ok) {
  try { await navigator.clipboard.writeText(texte); bulle(ok); } catch (_) { bulle(T.copie_ko); }
}
$("#fx-coeur").onclick = () => etat.choisi && basculerFavori(etat.choisi);
$("#fx-projet").onclick = () => {
  const e = etat.choisi;
  if (!e) return;
  projet = dansProjet(e) ? projet.filter((p) => p.n !== e.n) : [...projet, { n: e.n, rendu: etat.rendu, note: "", o: regTexte() }];
  sauverProjet();
  majProjet();
  if (etat.vue === "projet") majMur();
  else $("#nb-projet").textContent = projet.length;
};
$("#fx-note").oninput = (ev) => {
  const p = etat.choisi && dansProjet(etat.choisi);
  if (p) { p.note = ev.target.value; sauverProjet(); }
};
function majProjet() {
  const p = etat.choisi && dansProjet(etat.choisi);
  $("#fx-projet").textContent = p ? T.retirer_projet : T.ajouter_projet;
  $("#fx-projet").setAttribute("aria-pressed", String(!!p));
  $("#note").hidden = !p;
  $("#fx-note").value = p?.note ?? "";
}
$("#video").onclick = () => enregistrer();
function enregistrer() {
  const cv = $("#apercu");
  if (!grand || !cv.captureStream || typeof MediaRecorder === "undefined") return bulle(T.video_ko);
  const rec = new MediaRecorder(cv.captureStream(30), { mimeType: "video/webm" }), morceaux = [];
  rec.ondataavailable = (ev) => ev.data.size && morceaux.push(ev.data);
  rec.onstop = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(morceaux, { type: "video/webm" }));
    a.download = `artefacts-${etat.choisi.n}-${etat.choisi.slug}-${etat.rendu}.webm`;
    a.click();
    bulle(T.video_ok);
  };
  grand.aller(0);
  grand.enPause = false;
  rec.start();
  bulle(T.video_en_cours);
  setTimeout(() => rec.stop(), Math.max(1, grand.meta.duration) * 1000 + 200);
}
// une seule bulle, annoncée aux lecteurs d'écran ; un nouveau message remplace le précédent
let bulleEl = null, bulleMinuteur = 0;
function bulle(texte) {
  if (!bulleEl) {
    bulleEl = document.createElement("div");
    bulleEl.className = "bulle";
    bulleEl.setAttribute("role", "status");
    bulleEl.setAttribute("aria-live", "polite");
    document.body.appendChild(bulleEl);
  }
  bulleEl.textContent = texte;
  bulleEl.hidden = false;
  clearTimeout(bulleMinuteur);
  bulleMinuteur = setTimeout(() => (bulleEl.hidden = true), 2600);
}

// Sur mobile le panneau est une feuille plein écran, ouverte par une carte et fermée par « Retour » ou Échap ; au
// clavier (clic sans souris : detail 0), le focus passe dans le panneau, et revient à la carte à la fermeture.
const aside = document.querySelector("aside");
const mobile = matchMedia("(max-width: 980px)");
function montrerPanneau(clavier) {
  if (mobile.matches) {
    aside.classList.add("ouvert");
    document.body.classList.add("feuille");
    aside.scrollTop = 0;
    $("#fermer-panneau").focus();
  } else if (clavier) $("#fx-nom").focus();
}
function fermerPanneau() {
  if (!aside.classList.contains("ouvert")) return;
  aside.classList.remove("ouvert");
  document.body.classList.remove("feuille");
  cartes.get(etat.choisi)?.querySelector(".ouvrir")?.focus();
}
$("#fermer-panneau").onclick = fermerPanneau;
mobile.addEventListener("change", fermerPanneau);

async function ouvrir(e) {
  etat.choisi = e;
  for (const [x, el] of cartes) el.setAttribute("aria-current", String(x === e));
  $("#fx-num").textContent = "#" + e.n;
  $("#fx-nom").textContent = e.name;
  $("#fx-desc").textContent = e.desc + (e.author ? ` (${T.par} ${e.author})` : "");
  $("#fx-tags").replaceChildren(...e.tags.map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag";
    b.textContent = "#" + t;
    b.onclick = () => { etat.tags.add(t); majMur(); };
    return b;
  }));
  $("#fx-infos").textContent = `${e.loop ? AUTO.loop : AUTO.once} · ${e.duration}s · ${e.size[0]}×${e.size[1]} · ${e.id}`;
  $("#vitesse").value = "1";
  majCoeurs();
  majProjet();
  majCode();
  ecrireUrl();
  const p = dansProjet(e);
  if (p && parId[p.rendu] && p.rendu !== etat.rendu) choisirRendu(p.rendu);
  // réglages : ceux du lien à l'arrivée, sinon ceux gardés dans le projet, sinon aucun
  if (regDepuisUrl) regDepuisUrl = false;
  else reg = p?.o ? lireReg(p.o) : REG_VIDE();
  const mod = await charger[e.n]();
  if (etat.choisi !== e) return;
  grand = new Lecteur(mod);
  modOuvert = mod;
  grand.options = optionsDe(mod.meta);
  grand.relancer();
  majReglages();
  majCode();
  ecrireUrl();
  majLecture();
}

// ---------- clavier : / pour chercher, R pour changer de rendu, flèches pour passer d'un effet à l'autre, F favori
addEventListener("keydown", (ev) => {
  const champ = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  if (ev.key === "/" && !champ) { ev.preventDefault(); recherche.focus(); return; }
  if (ev.key === "Escape" && champ) { document.activeElement.blur(); return; }
  if (ev.key === "Escape") { fermerPanneau(); return; }
  if (champ || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === "r" || ev.key === "R") {
    const ids = rendus.map((r) => r.meta.id), i = ids.indexOf(etat.rendu);
    choisirRendu(ids[(i + (ev.shiftKey ? ids.length - 1 : 1)) % ids.length]);
  } else if (ev.key === "f" && etat.choisi) basculerFavori(etat.choisi);
  else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
    const i = ordre.indexOf(etat.choisi);
    const e = ordre[(i + (ev.key === "ArrowRight" ? 1 : ordre.length - 1)) % ordre.length];
    if (e) { ouvrir(e); cartes.get(e).scrollIntoView({ block: "nearest" }); }
  }
});

// ---------- réglages en direct : couleurs (teinte, saturation, luminosité), lueur, options de l'effet
let modOuvert = null, regDepuisUrl = false;
const reglagesCourants = () => reg;
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i;
const estRampe = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === "string" && HEX.test(c));
function versRgb(c) {
  let h = c.slice(1);
  if (h.length === 3) h = [...h].map((x) => x + x).join("");
  const v = parseInt(h.slice(0, 6), 16);
  return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
/** Une couleur décalée en teinte (degrés), multipliée en saturation, décalée en luminosité. */
function teinter(c, { h, s, l }) {
  const [r, g, b] = versRgb(c), max = Math.max(r, g, b), min = Math.min(r, g, b);
  let H = 0, S = 0, L = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    S = L > 0.5 ? d / (2 - max - min) : d / (max + min);
    H = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    H /= 6;
  }
  H = (((H + h / 360) % 1) + 1) % 1;
  S = Math.min(1, Math.max(0, S * s));
  L = Math.min(1, Math.max(0, L + l));
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q;
  const canal = (t) => {
    t = ((t % 1) + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return "#" + [canal(H + 1 / 3), canal(H), canal(H - 1 / 3)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}
/** Les options à passer à createFx : celles changées à la main, couleurs teintées. */
function optionsDe(meta, reg = reglagesCourants()) {
  const def = meta.options ?? {}, o = { ...reg.opts };
  if (reg.h || reg.s !== 1 || reg.l) {
    for (const [k, v] of Object.entries(def)) {
      if (k !== "palette" && !reg.tout) continue;
      const base = o[k] ?? v;
      if (estRampe(base)) o[k] = base.map((c) => teinter(c, reg));
      else if (typeof base === "string" && HEX.test(base)) o[k] = teinter(base, reg);
    }
  }
  return o;
}
/** Les options changées, écrites comme dans le code de l'onglet Utiliser. */
function optionsCode(e) {
  if (!modOuvert || etat.choisi?.n !== e.n) return "";
  return Object.entries(optionsDe(modOuvert.meta)).map(([k, v]) => `, ${/^[a-z_$][\w$]*$/i.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)}`).join("");
}
function appliquerReglages() {
  if (!grand || !modOuvert) return;
  const t = grand.temps;
  grand.options = optionsDe(modOuvert.meta);
  grand.aller(t);
  $("#rg-modifie").hidden = !regModifie();
  const p = etat.choisi && dansProjet(etat.choisi);
  if (p) { p.o = regTexte(); sauverProjet(); }
  if (onglet === "usage") majCode();
  ecrireUrl();
}
function champ(nom, controle, sortie) {
  const l = document.createElement("label");
  l.className = "rg";
  const s = document.createElement("span");
  s.textContent = nom;
  s.title = nom;
  l.append(s, controle);
  if (sortie) l.append(sortie);
  return l;
}
function glissiere(nom, min, max, pas, valeur, change) {
  const i = Object.assign(document.createElement("input"), { type: "range", min, max, step: pas, value: valeur });
  const o = document.createElement("output");
  const ecrire = () => (o.textContent = +(+i.value).toFixed(2));
  ecrire();
  i.oninput = () => { ecrire(); change(+i.value); };
  return champ(nom, i, o);
}
function caseACocher(nom, valeur, change) {
  const i = Object.assign(document.createElement("input"), { type: "checkbox", checked: valeur });
  i.onchange = () => change(i.checked);
  const l = champ(nom, i);
  l.classList.add("case");
  l.prepend(i);
  return l;
}
function majReglages() {
  const def = modOuvert?.meta.options ?? {}, champs = [];
  const opt = (k) => reg.opts[k] ?? def[k];
  const changer = (k, v) => {
    if (v === def[k] || JSON.stringify(v) === JSON.stringify(def[k])) delete reg.opts[k];
    else reg.opts[k] = v;
    appliquerReglages();
  };
  champs.push(glissiere(T.rg_teinte, -180, 180, 5, reg.h, (v) => { reg.h = v; appliquerReglages(); }));
  champs.push(glissiere(T.rg_saturation, 0, 2, 0.05, reg.s, (v) => { reg.s = v; appliquerReglages(); }));
  champs.push(glissiere(T.rg_luminosite, -0.4, 0.4, 0.02, reg.l, (v) => { reg.l = v; appliquerReglages(); }));
  const autresCouleurs = Object.entries(def).some(([k, v]) => k !== "palette" && (estRampe(v) || (typeof v === "string" && HEX.test(v))));
  if (autresCouleurs) champs.push(caseACocher(T.rg_toutes, reg.tout, (v) => { reg.tout = v; appliquerReglages(); }));
  champs.push(glissiere(T.rg_lueur, 0, 2, 0.05, reg.opts.light ?? 1, (v) => changer("light", v === 1 ? undefined : v)));
  champs.push(caseACocher(T.rg_miroir, !!reg.opts.flip, (v) => changer("flip", v || undefined)));
  const sep = document.createElement("div");
  sep.className = "rg-sep";
  champs.push(sep);
  for (const [k, v] of Object.entries(def)) {
    if (k === "seed" || k === "palette" || estRampe(v)) continue;
    if (typeof v === "number" && v !== 0) {
      const entier = Number.isInteger(v), a = v / 4, b = v * 3;
      const min = entier ? Math.round(Math.min(a, b)) || (v > 0 ? 1 : -1) : Math.min(a, b), max = entier ? Math.round(Math.max(a, b)) : Math.max(a, b);
      champs.push(glissiere(k, min, max, entier ? 1 : Math.abs(v) / 50, opt(k), (x) => changer(k, x)));
    } else if (typeof v === "string" && HEX.test(v)) {
      const i = Object.assign(document.createElement("input"), { type: "color", value: teinter(opt(k), { h: 0, s: 1, l: 0 }) });
      i.oninput = () => changer(k, i.value);
      champs.push(champ(k, i));
    } else if (typeof v === "string") {
      const i = Object.assign(document.createElement("input"), { type: "text", value: opt(k), maxLength: 40, spellcheck: false });
      i.oninput = () => changer(k, i.value);
      champs.push(champ(k, i));
    }
  }
  $("#rg-champs").replaceChildren(...champs);
  $("#rg-modifie").hidden = !regModifie();
  if (regModifie()) $("#reglages").open = true;
}
$("#rg-graine").onclick = () => { reg.opts.seed = 1 + Math.floor(Math.random() * 9999); appliquerReglages(); };
$("#rg-raz").onclick = () => { reg = REG_VIDE(); majReglages(); appliquerReglages(); };

// ---------- export du projet affiché en .zip (code des effets, moteur, rendus, page de démo)
$("#projet-zip").onclick = async () => {
  const b = $("#projet-zip");
  b.disabled = true;
  bulle(T.px_en_cours);
  try {
    const effets = [];
    for (const p of projet) {
      const e = parNumero.get(p.n);
      if (!e) continue;
      const mod = await charger[p.n]();
      effets.push({ n: p.n, id: e.id, nom: e.slug, rendu: p.rendu, note: p.note ?? "", options: optionsDe(mod.meta, p.o ? lireReg(p.o) : REG_VIDE()) });
    }
    await exporterProjet({ nom: actif?.nom ?? T.projet_defaut, effets, base: T.base + "assets/src/", lisezmoi: T.px_lisezmoi.replaceAll("|", "\n") });
  } catch (_) {
    bulle(T.px_ko);
  } finally {
    b.disabled = false;
  }
};

// ---------- planche de sprites (PNG) et fichiers Godot 4
const fenPl = $("#fen-planche");
let plMod = null, plRes = null, plMinuteur = 0;
$("#pl-rendu").replaceChildren(...rendus.map((r) => new Option(nomRendu(r), r.meta.id)));
const reglagesPl = () => ({ rendu: $("#pl-rendu").value, echelle: +$("#pl-echelle").value, fps: +$("#pl-fps").value, transparent: $("#pl-transparent").checked });
const nomPl = () => `${etat.choisi.n}-${etat.choisi.slug}-${$("#pl-rendu").value}`;
const pngDe = (cv) => new Promise((ok) => cv.toBlob(ok, "image/png"));
$("#planche").onclick = async () => {
  const e = etat.choisi;
  if (!e) return;
  plMod = await charger[e.n]();
  $("#pl-effet").textContent = `#${e.n} ${e.name}`;
  $("#pl-rendu").value = etat.rendu;
  $("#pl-echelle").value = etat.rendu === "pixel" ? "2" : "3";
  $("#pl-fps").value = String([15, 12, 8].find((f) => f <= (plMod.meta.fps ?? 30)) ?? 8);
  fenPl.showModal();
  majPlanche();
};
$("#pl-rendu").onchange = () => { $("#pl-echelle").value = $("#pl-rendu").value === "pixel" ? "2" : "3"; majPlanche(); };
for (const id of ["#pl-echelle", "#pl-fps", "#pl-transparent"]) $(id).onchange = majPlanche;
function majPlanche() {
  clearTimeout(plMinuteur);
  plRes = null;
  const r = reglagesPl(), d = dimensions({ duration: 1, ...plMod.meta }, r);
  const tropGrand = d.largeur > COTE_MAX || d.hauteur > COTE_MAX;
  $("#pl-infos").textContent = T.pl_infos.replace("%n", d.n).replace("%g", `${d.cols}×${d.lignes}`).replace("%t", `${d.largeur}×${d.hauteur}`) + (tropGrand ? " · " + T.pl_trop_grand : "");
  $("#pl-png").disabled = $("#pl-godot").disabled = true;
  if (tropGrand) return;
  plMinuteur = setTimeout(() => {
    plRes = planche(plMod, { ...r, options: optionsDe(plMod.meta) });
    const cv = $("#pl-canvas");
    cv.width = plRes.atlas.width;
    cv.height = plRes.atlas.height;
    cv.getContext("2d").drawImage(plRes.atlas, 0, 0);
    $("#pl-png").disabled = $("#pl-godot").disabled = false;
  }, 150);
}
$("#pl-png").onclick = async () => plRes && telecharger(await pngDe(plRes.atlas), nomPl() + ".png");
$("#pl-godot").onclick = async () => {
  if (!plRes) return;
  let dossier = $("#pl-dossier").value.trim().replace(/^res:\/\//, "").replace(/^\/+|\/+$/g, "");
  dossier = "res://" + (dossier ? dossier + "/" : "");
  const e = etat.choisi, nom = nomPl(), echelle = +$("#pl-echelle").value;
  const noeud = e.slug.split("_").map((m) => m[0].toUpperCase() + m.slice(1)).join("");
  const lisezmoi = T.pl_lisezmoi.replaceAll("|", "\n").replaceAll("%e", `#${e.n} ${e.slug}`).replaceAll("%n2", plRes.n).replaceAll("%n", +e.n)
    .replaceAll("%d", dossier).replaceAll("%fps", plRes.fps).replaceAll("%f", nom).replaceAll("%c", `${plRes.fw}×${plRes.fh}`);
  telecharger(await zip([
    { nom: `${nom}/${nom}.png`, contenu: await pngDe(plRes.atlas) },
    { nom: `${nom}/${nom}.tres`, contenu: spriteFrames(plRes, `${dossier}${nom}/${nom}.png`) },
    { nom: `${nom}/${nom}.tscn`, contenu: scene(plRes, `${dossier}${nom}/${nom}.tres`, noeud, echelle) },
    { nom: `${nom}/LISEZMOI.txt`, contenu: lisezmoi + "\n" },
  ]), `${nom}-godot.zip`);
};

// ---------- compte : favoris et projets suivent le membre sur tous ses appareils ; rien n'est visible des autres
const compte = initCompte({ base: T.base, T, ERR: JSON.parse($("#erreurs-compte").textContent), bulle, connecte, deconnecte });

async function connecte(m) {
  // ce qui a été fait avant de se connecter (favoris, brouillon) rejoint le compte, puis quitte le navigateur
  const avant = [...favoris];
  favoris.clear();
  for (const n of [...m.favoris, ...avant]) favoris.add(n);
  if (avant.some((n) => !m.favoris.includes(n))) envoyerFavoris(0);
  memo.ecrire("favoris", []);
  projets = m.projets;
  const brouillon = memo.lire("projet", []);
  if (brouillon.length || !projets.length) {
    const nom = projets.length ? T.projet_brouillon : T.projet_defaut;
    const { id } = await compte.appel("projet", { nom, effets: brouillon });
    projets.unshift({ id, nom, effets: brouillon });
    memo.ecrire("projet", []);
  }
  const voulu = memo.lire("projet-actif", null);
  choisirProjet((projets.find((p) => p.id === voulu) ?? projets[0]).id);
}
function deconnecte() {
  projets = actif = null;
  favoris.clear();
  projet = memo.lire("projet", []);
  rafraichirVues();
}
function choisirProjet(id) {
  actif = projets.find((p) => p.id === id);
  projet = actif.effets;
  memo.ecrire("projet-actif", id);
  majListeProjets();
  rafraichirVues();
}
function majListeProjets() {
  $("#projet-actif").replaceChildren(...projets.map((p) => new Option(`${p.nom} (${p.effets.length})`, p.id, false, p === actif)));
  $("#projet-supprimer").disabled = projets.length < 2;
}
function rafraichirVues() {
  majMur();
  majCoeurs();
  if (etat.choisi) majProjet();
}
function sauverProjet() {
  if (!projets) return memo.ecrire("projet", projet);
  const p = actif;
  p.effets = projet;
  compte.differer("projet" + p.id, () => compte.appel("projet", { id: p.id, nom: p.nom, effets: p.effets }).catch(() => bulle(T.sync_ko)));
  majListeProjets();
}
function sauverFavoris() {
  if (projets) envoyerFavoris(800);
  else memo.ecrire("favoris", [...favoris]);
}
function envoyerFavoris(delai) {
  compte.differer("favoris", () => compte.appel("favoris", { favoris: [...favoris] }).catch(() => bulle(T.sync_ko)), delai);
}
$("#projet-actif").onchange = (ev) => choisirProjet(+ev.target.value);
$("#projet-nouveau").onclick = async () => {
  const nom = prompt(T.projet_nom, T.projet_defaut)?.trim().slice(0, 80);
  if (!nom) return;
  try {
    const { id } = await compte.appel("projet", { nom, effets: [] });
    projets.unshift({ id, nom, effets: [] });
    choisirProjet(id);
  } catch (_) { bulle(T.sync_ko); }
};
$("#projet-renommer").onclick = () => {
  const nom = prompt(T.projet_nom, actif.nom)?.trim().slice(0, 80);
  if (!nom) return;
  actif.nom = nom;
  sauverProjet();
};
$("#projet-supprimer").onclick = async () => {
  if (projets.length < 2 || !confirm(T.projet_suppr_confirmer.replace("%s", actif.nom))) return;
  const id = actif.id;
  compte.annuler("projet" + id);
  try {
    await compte.appel("projet-supprimer", { id });
    projets = projets.filter((p) => p.id !== id);
    choisirProjet(projets[0].id);
  } catch (_) { bulle(T.sync_ko); }
};

// ---------- étoiles du repo GitHub (si l'API répond ; sinon le lien reste sans compteur)

lireUrl();
recherche.value = etat.q;
$("#tri").value = etat.tri;
choisirRendu(etat.rendu);
majMur();
const arriveSurUnEffet = !!etat.choisi; // lien vers un effet précis (#fx=12) : sur mobile, sa feuille s'ouvre
ouvrir(etat.choisi ?? ordre[0] ?? LIB[0]);
if (arriveSurUnEffet && mobile.matches) montrerPanneau(false);
if (retourCompte) compte.pret.then(() => compte.retour(...retourCompte));
if (allerAuCode) {
  cartes.get(etat.choisi)?.scrollIntoView({ block: "center" });
  $("#code").scrollIntoView({ block: "nearest" });
}
