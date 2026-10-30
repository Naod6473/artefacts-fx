// La bibliothèque : un mur d'effets filtré par la recherche et les tags, et un panneau qui montre l'effet choisi
// (lecture, curseur de temps, comparaison des rendus, code).
import { Lecteur, boucle, vuePartagee, pleinEcran } from "./lecteur.js";
import { rendus, parId, RENDU_PAR_DEFAUT } from "../../rendus/index.js";
import { selection } from "./selection.js";

const $ = (s) => document.querySelector(s);
const LANGUE = document.documentElement.lang || "fr";
const T = JSON.parse($("#textes").textContent);
const nomRendu = (r) => r.meta.nom[LANGUE] ?? r.meta.nom.fr;
const memo = {
  lire(k, d) { try { return JSON.parse(localStorage.getItem("art-" + k)) ?? d; } catch (_) { return d; } },
  ecrire(k, v) { try { localStorage.setItem("art-" + k, JSON.stringify(v)); } catch (_) {} },
};

// ---------- les effets et leurs tags
const CAT = {
  fr: { fire: "feu", explosions: "explosion", water: "eau", ice: "glace", lightning: "foudre", scifi: "sci-fi", melee: "mêlée", impacts: "impact", projectiles: "projectile", spawn: "apparition", arcane: "arcane", holy: "sacré", shadow: "ombre", status: "état", nature: "nature", weather: "météo", ui: "interface", pickups: "ramassage", transitions: "transition", critters: "bestiole" },
};
const AUTO = {
  fr: { loop: "boucle", once: "une-fois", ground: "au-sol", screen: "plein-écran", actor: "sur-personnage" },
  en: { loop: "loop", once: "one-shot", ground: "on-ground", screen: "full-screen", actor: "on-character" },
};
// recherche bilingue : un mot français cherche aussi son équivalent anglais
const SYN = { eclair: "lightning", foudre: "lightning", feu: "fire", flamme: "flame", glace: "ice", eau: "water", soin: "heal", entaille: "slash", epee: "sword", fumee: "smoke", pluie: "rain", piece: "coin", ombre: "shadow", portail: "portal", bouclier: "shield", etoile: "star", orage: "storm", trou: "hole", bestiole: "critter", niveau: "level" };
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const auto = AUTO[LANGUE] ?? AUTO.en;
const LIB = selection.map(([id, mod, source]) => {
  const cat = id.split("/")[0], m = { loop: false, duration: 1, ...mod.meta };
  const tags = [...new Set([
    (CAT[LANGUE] ?? {})[cat] ?? cat,
    m.loop ? auto.loop : auto.once,
    m.bg === "ground" ? auto.ground : null,
    pleinEcran(m) ? auto.screen : null,
    m.actor ? auto.actor : null,
    ...(m.tags ?? []).filter((t) => !["loop", "one-shot", cat].includes(t)),
  ].filter(Boolean))];
  const fichier = id.split("/")[1];
  return { id, mod, source, meta: m, tags, nom: m.name, slug: fichier.replace(/-/g, "_"), cle: norm([id, m.name, m.desc, ...tags].join(" ")) };
});

// ---------- état : recherche, tags actifs, rendu, effet ouvert (gardés dans l'URL pour le partage)
const etat = { q: "", tags: new Set(), rendu: memo.lire("rendu", RENDU_PAR_DEFAUT), choisi: null };
if (!parId[etat.rendu]) etat.rendu = RENDU_PAR_DEFAUT;
function lireUrl() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.has("q")) etat.q = p.get("q");
  if (p.has("tags")) etat.tags = new Set(p.get("tags").split(",").filter(Boolean));
  if (p.has("rendu") && parId[p.get("rendu")]) etat.rendu = p.get("rendu");
  if (p.has("fx")) etat.choisi = LIB.find((e) => e.id === p.get("fx")) ?? null;
}
function ecrireUrl() {
  const p = new URLSearchParams();
  if (etat.q) p.set("q", etat.q);
  if (etat.tags.size) p.set("tags", [...etat.tags].join(","));
  p.set("rendu", etat.rendu);
  if (etat.choisi) p.set("fx", etat.choisi.id);
  history.replaceState(null, "", "#" + p.toString().replace(/%2F/g, "/").replace(/%2C/g, ","));
}

/** feu tag:boucle -fumée dur:<1 */
function correspond(e) {
  for (const t of etat.tags) if (!e.tags.includes(t)) return false;
  for (let mot of norm(etat.q).split(/\s+/).filter(Boolean)) {
    const non = mot.startsWith("-");
    if (non) mot = mot.slice(1);
    let ok;
    const dur = mot.match(/^dur:([<>])(\d+(?:\.\d+)?)$/);
    if (dur) ok = dur[1] === "<" ? e.meta.duration < +dur[2] : e.meta.duration > +dur[2];
    else if (mot.startsWith("tag:")) ok = e.tags.some((t) => norm(t) === mot.slice(4));
    else ok = e.cle.includes(mot) || (SYN[mot] && e.cle.includes(SYN[mot]));
    if (ok === non) return false;
  }
  return true;
}

// ---------- rendu des contrôles
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
  ecrireUrl();
}

const recherche = $("#recherche");
recherche.oninput = () => { etat.q = recherche.value; majMur(); };

function majTags(res) {
  const n = new Map();
  for (const e of res) for (const t of e.tags) n.set(t, (n.get(t) ?? 0) + 1);
  for (const t of etat.tags) if (!n.has(t)) n.set(t, 0);
  const tri = [...n].sort((a, b) => etat.tags.has(b[0]) - etat.tags.has(a[0]) || b[1] - a[1]).slice(0, 14);
  const box = $("#tags");
  box.replaceChildren(...tri.map(([t, c]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag";
    b.setAttribute("aria-pressed", String(etat.tags.has(t)));
    b.innerHTML = `#${t} <span>${c}</span>`;
    b.onclick = () => { etat.tags.has(t) ? etat.tags.delete(t) : etat.tags.add(t); majMur(); };
    return b;
  }));
}

// ---------- le mur
const mur = $("#mur"), cartes = new Map();
for (const e of LIB) {
  const a = document.createElement("a");
  a.href = "#fx=" + e.id;
  a.className = "carte" + (pleinEcran(e.meta) ? " large" : "");
  a.innerHTML = `<canvas></canvas><span class="ligne"><b></b><i>♥ 0</i></span><span class="info"></span>`;
  a.querySelector("b").textContent = e.slug;
  a.querySelector(".info").textContent = `${e.meta.loop ? auto.loop : auto.once} · ${e.meta.duration}s · ${e.meta.size[0]}×${e.meta.size[1]}`;
  a.onclick = (ev) => { ev.preventDefault(); ouvrir(e); };
  mur.appendChild(a);
  const l = new Lecteur(e.mod);
  anim.ajouter(a.querySelector("canvas"), l, () => etat.rendu);
  cartes.set(e, a);
}
function majMur() {
  const res = LIB.filter(correspond);
  for (const [e, a] of cartes) a.hidden = !res.includes(e);
  $("#compte").innerHTML = `<b>${String(res.length).padStart(3, "0")}</b>/${String(LIB.length).padStart(3, "0")}`;
  $("#vide").hidden = res.length > 0;
  majTags(res);
  ecrireUrl();
}

// ---------- le panneau
let grand = null;
const vue = vuePartagee(() => grand);
anim.ajouter($("#apercu"), vue, () => etat.rendu);
const petits = [...document.querySelectorAll("#comparaison canvas")];
const autres = () => rendus.map((r) => r.meta.id).filter((id) => id !== etat.rendu).slice(0, 4);
petits.forEach((cv, i) => anim.ajouter(cv, vue, () => autres()[i]));
function majComparaison() {
  const a = autres();
  document.querySelectorAll("#comparaison figcaption").forEach((c, i) => (c.textContent = nomRendu(parId[a[i]])));
}
// clic sur une petite vue : elle devient le rendu principal
document.querySelectorAll("#comparaison figure").forEach((f, i) => (f.onclick = () => choisirRendu(autres()[i])));

const lecture = $("#lecture"), temps = $("#temps"), curseur = $("#curseur");
lecture.onclick = () => {
  if (!grand) return;
  grand.enPause = !grand.enPause;
  majLecture();
};
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
import * as fx from "artefacts-fx/effets/${e.id}.js";

const frame = createFrame(${e.meta.size[0]}, ${e.meta.size[1]});
const inst = createFx(fx, { x: ${e.meta.origin[0]}, y: ${e.meta.origin[1]}, seed: 1 });

function tick(dt) {
  inst.update(dt);
  inst.draw(frame);
  composite(frame, imageData.data);
}`;
let onglet = "usage";
document.querySelectorAll("[role=tab]").forEach((b) => (b.onclick = () => { onglet = b.dataset.onglet; majCode(); }));
function majCode() {
  document.querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.onglet === onglet)));
  if (etat.choisi) $("#code").textContent = onglet === "usage" ? usage(etat.choisi) : etat.choisi.source;
}
$("#copier").onclick = async () => {
  try { await navigator.clipboard.writeText($("#code").textContent); bulle(T.copie); }
  catch (_) { bulle(T.copie_ko); }
};
$("#video").onclick = () => enregistrer();
function enregistrer() {
  const cv = $("#apercu");
  if (!cv.captureStream || typeof MediaRecorder === "undefined") return bulle(T.video_ko);
  const rec = new MediaRecorder(cv.captureStream(30), { mimeType: "video/webm" }), morceaux = [];
  rec.ondataavailable = (ev) => ev.data.size && morceaux.push(ev.data);
  rec.onstop = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(morceaux, { type: "video/webm" }));
    a.download = `${etat.choisi.slug}-${etat.rendu}.webm`;
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
  d.textContent = texte;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}

function ouvrir(e) {
  etat.choisi = e;
  grand = new Lecteur(e.mod);
  for (const [x, a] of cartes) a.setAttribute("aria-current", String(x === e));
  $("#fx-nom").textContent = e.slug;
  $("#fx-desc").textContent = e.meta.desc ?? "";
  $("#fx-tags").replaceChildren(...e.tags.map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag";
    b.textContent = "#" + t;
    b.onclick = () => { etat.tags.add(t); majMur(); };
    return b;
  }));
  $("#fx-infos").textContent = `${e.meta.loop ? auto.loop : auto.once} · ${e.meta.duration}s · ${e.meta.size[0]}×${e.meta.size[1]} · ${e.id}`;
  $("#vitesse").value = "1";
  majLecture();
  majCode();
  ecrireUrl();
}

// ---------- clavier : / pour chercher, R pour changer de rendu, flèches pour passer d'un effet à l'autre
addEventListener("keydown", (ev) => {
  const champ = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  if (ev.key === "/" && !champ) { ev.preventDefault(); recherche.focus(); }
  else if (ev.key === "Escape" && champ) recherche.blur();
  else if (champ || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  else if (ev.key === "r" || ev.key === "R") {
    const ids = rendus.map((r) => r.meta.id), i = ids.indexOf(etat.rendu);
    choisirRendu(ids[(i + (ev.shiftKey ? ids.length - 1 : 1)) % ids.length]);
  } else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
    const vis = LIB.filter((e) => !cartes.get(e).hidden), i = vis.indexOf(etat.choisi);
    const e = vis[(i + (ev.key === "ArrowRight" ? 1 : vis.length - 1)) % vis.length];
    if (e) { ouvrir(e); cartes.get(e).scrollIntoView({ block: "nearest" }); }
  }
});

lireUrl();
recherche.value = etat.q;
choisirRendu(etat.rendu);
majMur();
ouvrir(etat.choisi ?? LIB[0]);
