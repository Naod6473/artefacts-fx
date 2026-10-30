// La bibliothèque : tous les effets dans un mur filtré par la recherche et les tags, et un panneau qui montre
// l'effet choisi (lecture, curseur de temps, comparaison des rendus, code). Favoris et projet brouillon sont
// gardés dans le navigateur, en attendant les comptes.
import { Lecteur, boucle, vuePartagee, pleinEcran } from "./lecteur.js";
import { rendus, parId, RENDU_PAR_DEFAUT } from "../../rendus/index.js";
import { catalogue, charger, source } from "virtuel:catalogue";
import { CATEGORIES_FR, TAGS_FR, SYNONYMES } from "./tags.js";

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
  const mots = [c.n, String(+c.n), c.name, slug, c.desc, cat, CATEGORIES_FR[cat], c.couleur, ...brut, ...brut.map((t) => TAGS_FR[t])].filter(Boolean);
  return { ...c, meta, cat, tags, slug, tagsNorm: tags.map(norm).concat(brut.filter(Boolean).map(norm)), texte: norm(mots.join(" ")), jetons: new Set(norm(mots.join(" ")).split(/[^a-z0-9]+/).filter((x) => x.length > 2)) };
});
const parNumero = new Map(LIB.map((e) => [e.n, e]));

// ---------- état (l'URL garde recherche, tags, rendu, vue et effet ouvert : un lien se partage tel quel)
const etat = { q: "", tags: new Set(), rendu: memo.lire("rendu", RENDU_PAR_DEFAUT), vue: "tout", tri: "numero", choisi: null };
if (!parId[etat.rendu]) etat.rendu = RENDU_PAR_DEFAUT;
const favoris = new Set(memo.lire("favoris", []));
let projet = memo.lire("projet", []); // [{ n, rendu, note }]
const dansProjet = (e) => projet.find((p) => p.n === e.n);

function lireUrl() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.has("q")) etat.q = p.get("q");
  if (p.has("tags")) etat.tags = new Set(p.get("tags").split(",").filter(Boolean));
  if (p.has("rendu") && parId[p.get("rendu")]) etat.rendu = p.get("rendu");
  if (["favoris", "projet"].includes(p.get("vue"))) etat.vue = p.get("vue");
  if (p.has("fx")) etat.choisi = parNumero.get(p.get("fx").padStart(4, "0")) ?? null;
}
function ecrireUrl() {
  const p = new URLSearchParams();
  if (etat.q) p.set("q", etat.q);
  if (etat.tags.size) p.set("tags", [...etat.tags].join(","));
  if (etat.vue !== "tout") p.set("vue", etat.vue);
  p.set("rendu", etat.rendu);
  if (etat.choisi) p.set("fx", etat.choisi.n);
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
  if (etat.choisi && dansProjet(etat.choisi)) { dansProjet(etat.choisi).rendu = id; memo.ecrire("projet", projet); }
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

function majTags(res) {
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
    charger[e.n]().then((mod) => anim.ajouter(en.target.querySelector("canvas"), new Lecteur(mod), () => etat.rendu));
  }
}, { rootMargin: "300px" });
for (const e of LIB) {
  const el = document.createElement("article");
  el.className = "carte" + (pleinEcran(e.meta) ? " large" : "");
  el._effet = e;
  el.innerHTML = `<button type="button" class="ouvrir" aria-label="${esc(e.name)}"><canvas style="aspect-ratio:${pleinEcran(e.meta) ? "16/9" : "4/3"}"></canvas></button>
    <div class="ligne"><b>${esc(e.slug)}</b><button type="button" class="coeur" aria-label="${esc(T.favori)}">♥</button></div>
    <span class="info"><span class="num">#${e.n}</span> · ${e.loop ? AUTO.loop : AUTO.once} · ${e.duration}s</span>`;
  el.querySelector(".ouvrir").onclick = () => ouvrir(e);
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
  $("#compte").innerHTML = `<b>${String(ordre.length).padStart(3, "0")}</b>/${String(LIB.length).padStart(3, "0")}`;
  $("#vide").hidden = ordre.length > 0;
  $("#vide").textContent = etat.vue === "favoris" && !favoris.size ? T.vide_favoris : etat.vue === "projet" && !projet.length ? T.vide_projet : T.vide;
  document.querySelectorAll("[data-vue]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vue === etat.vue)));
  $("#nb-favoris").textContent = favoris.size;
  $("#nb-projet").textContent = projet.length;
  majTags(ordre);
  // une recherche par numéro ouvre l'effet directement
  if (a.numero && ordre.length === 1 && etat.choisi !== ordre[0]) ouvrir(ordre[0]);
  ecrireUrl();
}

function basculerFavori(e) {
  favoris.has(e.n) ? favoris.delete(e.n) : favoris.add(e.n);
  memo.ecrire("favoris", [...favoris]);
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

const usage = (e) => `import { createFx, createFrame, composite } from "artefacts-fx";
import * as fx from "artefacts-fx/effets/${e.id}.js"; // #${e.n}

const frame = createFrame(${e.size[0]}, ${e.size[1]});
const inst = createFx(fx, { x: ${e.origin[0]}, y: ${e.origin[1]}, seed: 1 });

function tick(dt) {
  inst.update(dt);
  inst.draw(frame);
  composite(frame, imageData.data);
}`;
let onglet = "usage";
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
$("#lien").onclick = () => copier(`${location.origin}${T.base}fx/${+etat.choisi.n}`, T.lien_copie);
async function copier(texte, ok) {
  try { await navigator.clipboard.writeText(texte); bulle(ok); } catch (_) { bulle(T.copie_ko); }
}
$("#fx-coeur").onclick = () => etat.choisi && basculerFavori(etat.choisi);
$("#fx-projet").onclick = () => {
  const e = etat.choisi;
  if (!e) return;
  projet = dansProjet(e) ? projet.filter((p) => p.n !== e.n) : [...projet, { n: e.n, rendu: etat.rendu, note: "" }];
  memo.ecrire("projet", projet);
  majProjet();
  if (etat.vue === "projet") majMur();
  else $("#nb-projet").textContent = projet.length;
};
$("#fx-note").oninput = (ev) => {
  const p = etat.choisi && dansProjet(etat.choisi);
  if (p) { p.note = ev.target.value; memo.ecrire("projet", projet); }
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
function bulle(texte) {
  const d = document.createElement("div");
  d.className = "bulle";
  d.setAttribute("role", "status");
  d.textContent = texte;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}

async function ouvrir(e) {
  etat.choisi = e;
  for (const [x, el] of cartes) el.setAttribute("aria-current", String(x === e));
  $("#fx-num").textContent = "#" + e.n;
  $("#fx-nom").textContent = e.slug;
  $("#fx-desc").textContent = e.desc;
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
  const mod = await charger[e.n]();
  if (etat.choisi !== e) return;
  grand = new Lecteur(mod);
  majLecture();
}

// ---------- clavier : / pour chercher, R pour changer de rendu, flèches pour passer d'un effet à l'autre, F favori
addEventListener("keydown", (ev) => {
  const champ = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  if (ev.key === "/" && !champ) { ev.preventDefault(); recherche.focus(); return; }
  if (ev.key === "Escape" && champ) { document.activeElement.blur(); return; }
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

// ---------- étoiles du repo GitHub (si l'API répond ; sinon le lien reste sans compteur)
fetch("https://api.github.com/repos/Naod6473/artefacts-fx").then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (d && typeof d.stargazers_count === "number") $("#etoiles").textContent = d.stargazers_count;
}).catch(() => {});

lireUrl();
recherche.value = etat.q;
$("#tri").value = etat.tri;
choisirRendu(etat.rendu);
majMur();
ouvrir(etat.choisi ?? ordre[0] ?? LIB[0]);
