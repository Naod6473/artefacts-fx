// Page Loading : les indicateurs de chargement de loading-dev (https://github.com/jakubkrehel/loading, MIT, Jakub Krehel),
// vivants, réglables, et copiables en un clic (React, ou HTML + CSS tiré du rendu réel du composant). En plus : des
// chargements en texte pur (JS et GDScript), un écran de chargement de jeu (HTML ou projet Godot 4), un aperçu en
// situation, et quelques effets de la bibliothèque qui bouclent assez bien pour servir d'indicateur.
import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SPINNERS, SPINNER_MOTION } from "loading-dev";
import { Lecteur, boucle } from "../src/lecteur.js";
import { rendus, parId, RENDU_PAR_DEFAUT } from "../../rendus/index.js";
import { zip } from "../src/zip.js";
import { T } from "./textes.js";
import { UIVERSE, UV, estUv, lienUv, cssPortee, codeUv, echelle } from "./uiverse.js";

const LANGUE = document.documentElement.lang === "en" ? "en" : "fr", t = T[LANGUE], BASE = document.body.dataset.base || "/";
const NOMS = Object.keys(SPINNERS);
const pascal = (n) => n.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
const COULEURS = ["#5ce1e6", "#ffb347", "#ff5f7a", "#9cff8a", "#d6e2f0"];
const VUES = ["tous", "texte", "jeu", "situation", "effets"];

// ---------- réglages : lus dans l'adresse (lien partagé), sinon les valeurs par défaut
function lireAdresse() {
  const q = new URLSearchParams(location.search), c = q.get("c");
  return {
    taille: Math.min(64, Math.max(16, +q.get("taille") || 32)),
    couleur: /^[0-9a-f]{6}$/i.test(c ?? "") ? "#" + c.toLowerCase() : COULEURS[0],
    vitesse: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(+q.get("v")) ? +q.get("v") : 1,
    fond: q.get("fond") === "clair" ? "clair" : "sombre",
    pause: false,
    vue: VUES.includes(q.get("vue")) ? q.get("vue") : "tous",
    choisi: INDICS.includes(q.get("s")) ? q.get("s") : null,
  };
}
function adresse(r, extra = {}) {
  const q = new URLSearchParams();
  if (r.vue !== "tous") q.set("vue", r.vue);
  if (extra.s) q.set("s", extra.s);
  if (r.taille !== 32) q.set("taille", r.taille);
  if (r.couleur !== COULEURS[0]) q.set("c", r.couleur.slice(1));
  if (r.vitesse !== 1) q.set("v", r.vitesse);
  if (r.fond === "clair") q.set("fond", "clair");
  const s = q.toString();
  return location.origin + location.pathname + (s ? "?" + s : "");
}

const duree = (nom, r) => Math.round(SPINNER_MOTION[nom] / r.vitesse);
function codeReact(nom, r) {
  const C = pascal(nom), props = [`size={${r.taille}}`, `color="${r.couleur}"`];
  if (r.vitesse !== 1) props.push(`duration={${duree(nom, r)}}`);
  return `// npm install loading-dev\nimport { ${C} } from "loading-dev";\n\n<${C} ${props.join(" ")} />`;
}
// HTML + CSS sans React : la feuille de style que le composant a posée dans la page, et son balisage réel
function codeHtml(nom, el) {
  const style = document.querySelector(`style[data-href="ld-${nom}"]`)?.textContent.trim() ?? "";
  return `<!-- ${pascal(nom)} · loading-dev (MIT, Jakub Krehel) -->\n<style>\n${style}\n</style>\n\n${el?.firstElementChild?.outerHTML ?? ""}`;
}

function telecharger(blob, nom) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- chargements en texte pur
const TEXTE = [
  { id: "braille", frames: "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏".split(""), ms: 80 },
  { id: "blocs", frames: "▁▂▃▄▅▆▇█▇▆▅▄▃▂".split(""), ms: 70 },
  { id: "quart", frames: "◐◓◑◒".split(""), ms: 120 },
  { id: "terminal", frames: ["|", "/", "-", "\\"], ms: 100 },
  { id: "points", frames: [".  ", ".. ", "...", " ..", "  .", "   "], ms: 160 },
  { id: "barre", frames: Array.from({ length: 12 }, (_, i) => "[" + "=".repeat(i).padEnd(11, " ") + "]"), ms: 90 },
  { id: "lune", frames: "🌑🌒🌓🌔🌕🌖🌗🌘".match(/\p{Extended_Pictographic}/gu), ms: 110 },
  { id: "fleche", frames: "←↖↑↗→↘↓↙".split(""), ms: 100 },
];
// un indicateur, quel qu'il soit : "arc" (loading-dev) ou "tx-braille" (texte)
const TX = Object.fromEntries(TEXTE.map((x) => ["tx-" + x.id, x]));
// les indicateurs web (CSS) : loading-dev, puis ceux d'Uiverse
const WEB = [...NOMS, ...UIVERSE.map((x) => x.id)];
const INDICS = [...WEB, ...Object.keys(TX)];
const estTexte = (id) => id.startsWith("tx-");
const nomIndic = (id) => (estTexte(id) ? t["texte_" + TX[id].id] : estUv(id) ? UV[id].nom : pascal(id));
const dureeIndic = (id, r) => (estTexte(id) ? Math.round(TX[id].ms / r.vitesse) : estUv(id) ? Math.round(UV[id].ms / r.vitesse) : duree(id, r));
const ASCII = (x) => x.frames.every((f) => /^[\x20-\x7e]*$/.test(f)); // affichable avec la police par défaut de Godot

function TexteAnime({ x, pause, taille = 32, ms = x.ms }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (pause) return; const id = setInterval(() => setI((k) => (k + 1) % x.frames.length), ms); return () => clearInterval(id); }, [x, pause, ms]);
  return <span className="txt" style={{ fontSize: Math.round(taille * (x.frames[0].length > 4 ? 0.55 : 0.95)) }}>{x.frames[i]}</span>;
}
// un indicateur Uiverse : son HTML d'origine, son CSS enfermé dans .uv-<slug>, mis à la taille par zoom ;
// vitesse et pause passent par les animations elles-mêmes (playbackRate), sans toucher au CSS
function UvIndic({ x, r, taille }) {
  const ref = useRef(null), z = echelle(x, taille);
  useEffect(() => {
    if (!document.querySelector(`style[data-href="uv-${x.slug}"]`)) {
      const st = document.createElement("style");
      st.dataset.href = "uv-" + x.slug;
      st.textContent = cssPortee(x);
      document.head.append(st);
    }
  }, [x]);
  useEffect(() => {
    for (const a of ref.current?.getAnimations?.({ subtree: true }) ?? []) { a.playbackRate = r.vitesse; if (r.pause) a.pause(); else a.play(); }
  });
  return (
    <span className={"uv uv-" + x.slug} style={{ "--uv-c": r.couleur, display: "inline-block", overflow: "hidden", width: x.l * z, height: x.h * z }}>
      <span ref={ref} style={{ display: "grid", placeItems: "center", width: x.l, height: x.h, zoom: z }} dangerouslySetInnerHTML={{ __html: x.html }} />
    </span>
  );
}
function Indic({ id, r, taille = r.taille }) {
  if (estUv(id)) return <UvIndic x={UV[id]} r={r} taille={taille} />;
  if (estTexte(id)) return <span style={{ color: r.couleur }}><TexteAnime x={TX[id]} pause={r.pause} taille={taille} ms={dureeIndic(id, r)} /></span>;
  const S = SPINNERS[id];
  return <S size={taille} color={r.couleur} duration={duree(id, r)} playState={r.pause ? "paused" : "running"} />;
}

const codeTexteJs = (x, ms = x.ms) => `// ${x.id} · Artefacts (MIT)\nconst frames = ${JSON.stringify(x.frames)};\nconst el = document.querySelector("#chargement");\nlet i = 0;\nconst minuteur = setInterval(() => { el.textContent = frames[i++ % frames.length]; }, ${ms});\n// clearInterval(minuteur) une fois chargé`;
const codeTexteGd = (x, ms = x.ms) => `# ${x.id} · Artefacts (MIT) : à mettre sur un Label (Godot 4)${ASCII(x) ? "" : ", avec une police qui contient ces caractères"}\nextends Label\n\nconst FRAMES := ${JSON.stringify(x.frames)}\nconst PAS := ${(ms / 1000).toFixed(3)}\nvar _t := 0.0\nvar _i := 0\n\nfunc _process(delta: float) -> void:\n\t_t += delta\n\tif _t >= PAS:\n\t\t_t -= PAS\n\t\t_i = (_i + 1) % FRAMES.size()\n\t\ttext = FRAMES[_i]`;

// les onglets de code d'un indicateur, comme « Utiliser / Source » dans la bibliothèque
const ONGLETS = (id) => (estTexte(id) ? [["js", "JavaScript"], ["gd", "GDScript"]] : estUv(id) ? [["html", "HTML + CSS"]] : [["react", "React"], ["html", "HTML + CSS"]]);
function codeIndic(id, onglet, r, el) {
  if (estUv(id)) return codeUv(UV[id], r);
  if (estTexte(id)) return onglet === "gd" ? codeTexteGd(TX[id], dureeIndic(id, r)) : codeTexteJs(TX[id], dureeIndic(id, r));
  return onglet === "html" ? codeHtml(id, el) : codeReact(id, r);
}

// ---------- la grille, le panneau de droite et le zoom (comme dans la bibliothèque)
const mobile = matchMedia("(max-width: 900px)");
function Carte({ id, r, choisi, ouvrir }) {
  return (
    <article className={`carte${choisi ? " choisie" : ""}`}>
      <button type="button" className={`scene ouvrir ${r.fond}`} aria-label={nomIndic(id)} onClick={(ev) => ouvrir(id, ev)}><Indic id={id} r={r} /></button>
      <div className="pied"><span className="nom">{nomIndic(id)}</span><span className="ms">{dureeIndic(id, r)} ms</span></div>
    </article>
  );
}

function Panneau({ id, r, copier, ouvert, fermer, zoomer }) {
  const ref = useRef(null), [onglet, setOnglet] = useState(ONGLETS(id)[0][0]), [, majCode] = useState(0);
  useEffect(() => { setOnglet(ONGLETS(id)[0][0]); }, [id]);
  // le HTML + CSS se lit dans le rendu réel : on le relit une fois l'aperçu affiché
  useEffect(() => { const k = requestAnimationFrame(() => majCode((n) => n + 1)); return () => cancelAnimationFrame(k); }, [id, r, onglet]);
  const code = codeIndic(id, onglet, r, ref.current);
  return (
    <aside className={`panneau${ouvert ? " ouvert" : ""}`} aria-label={nomIndic(id)}>
      <button type="button" className="fermer-panneau" onClick={fermer}>← {t.retour}</button>
      <div className="titre">
        <div><span className="num">{estTexte(id) ? t.vue_texte : estUv(id) ? <a href={lienUv(UV[id])} target="_blank" rel="noopener">Uiverse · {UV[id].auteur} (MIT)</a> : "loading-dev"}</span><h2>{nomIndic(id)}</h2></div>
        <div className="boutons">
          <button type="button" aria-label={t.copier_lien} title={t.copier_lien} onClick={() => copier(adresse(r, { s: id }), t.lien_copie)}>⧉</button>
          <button type="button" aria-label={t.agrandir} title={t.agrandir} onClick={zoomer}>⤢</button>
        </div>
      </div>
      <div className={`apercu ${r.fond}`}><Indic id={id} r={r} taille={Math.min(96, r.taille * 2)} /></div>
      <p className="dim petit">{dureeIndic(id, r)} ms · {r.taille}px · {r.couleur}</p>
      <div role="tablist" className="onglets">
        {ONGLETS(id).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)}>{l}</button>)}
      </div>
      <pre className="code-panneau" tabIndex={0}>{code}</pre>
      <div className="actions"><button type="button" className="plein" onClick={() => copier(codeIndic(id, onglet, r, ref.current))}>{t.copier_code}</button></div>
      {/* hors écran : le rendu à la taille réglée, d'où l'on tire le HTML + CSS copié */}
      {!estTexte(id) && !estUv(id) && <div className="hors-ecran" aria-hidden="true" ref={ref}><Indic id={id} r={r} /></div>}
    </aside>
  );
}

function Zoom({ id, r, liste, choisir, fermer, details, copier }) {
  const [, majCode] = useState(0), ref = useRef(null);
  useEffect(() => {
    const touche = (e) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") choisir(liste[(liste.indexOf(id) + (e.key === "ArrowRight" ? 1 : liste.length - 1)) % liste.length]);
    };
    addEventListener("keydown", touche);
    return () => removeEventListener("keydown", touche);
  }, [id, liste]);
  useEffect(() => { const k = requestAnimationFrame(() => majCode((n) => n + 1)); return () => cancelAnimationFrame(k); }, [id]);
  const pas = (d) => choisir(liste[(liste.indexOf(id) + d + liste.length) % liste.length]);
  return (
    <div className="zoom" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }} role="dialog" aria-modal="true" aria-label={nomIndic(id)}>
      <button type="button" className="zoom-fleche g" aria-label={t.precedent} onClick={() => pas(-1)}>←</button>
      <div className="zoom-boite">
        <div className={`zoom-scene ${r.fond}`}><Indic id={id} r={r} taille={Math.min(200, r.taille * 4)} /></div>
        <div className="zoom-bas">
          <span className="zoom-titre"><span className="num">{liste.indexOf(id) + 1}/{liste.length}</span> {nomIndic(id)}</span>
          <span className="zoom-actions">
            <button type="button" className="plein" onClick={() => copier(codeIndic(id, ONGLETS(id)[0][0], r, ref.current))}>{t.copier} {ONGLETS(id)[0][1]}</button>
            <button type="button" onClick={details}>{t.details}</button>
            <button type="button" aria-label={t.fermer} onClick={fermer}>×</button>
          </span>
        </div>
        <pre className="zoom-code">{codeIndic(id, ONGLETS(id)[0][0], r, ref.current)}</pre>
      </div>
      <button type="button" className="zoom-fleche d" aria-label={t.suivant} onClick={() => pas(1)}>→</button>
      {!estTexte(id) && !estUv(id) && <div className="hors-ecran" aria-hidden="true" ref={ref}><Indic id={id} r={r} /></div>}
    </div>
  );
}

function Catalogue({ liste, r, setR, copier }) {
  const choisi = liste.includes(r.choisi) ? r.choisi : liste[0];
  const [zoom, setZoom] = useState(false), [panneau, setPanneau] = useState(false);
  const choisir = (id) => setR((x) => ({ ...x, choisi: id }));
  const ouvrir = (id) => { choisir(id); if (mobile.matches) setPanneau(true); else setZoom(true); };
  useEffect(() => { document.body.classList.toggle("zoome", zoom || panneau); }, [zoom, panneau]);
  if (!liste.length) return <p className="dim">{t.aucun}</p>;
  return (
    <div className="disposition">
      <div className="grille">{liste.map((id) => <Carte key={id} id={id} r={r} choisi={id === choisi} ouvrir={ouvrir} />)}</div>
      <Panneau id={choisi} r={r} copier={copier} ouvert={panneau} fermer={() => setPanneau(false)} zoomer={() => { setPanneau(false); setZoom(true); }} />
      {zoom && <Zoom id={choisi} r={r} liste={liste} choisir={choisir} copier={copier} fermer={() => setZoom(false)} details={() => { setZoom(false); if (mobile.matches) setPanneau(true); }} />}
    </div>
  );
}

// un menu de tous les indicateurs disponibles, groupés
function ChoixIndic({ value, onChange, label }) {
  return (
    <label className="champ">{label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="loading-dev">{NOMS.map((n) => <option key={n} value={n}>{pascal(n)}</option>)}</optgroup>
        {UIVERSE.length > 0 && <optgroup label="Uiverse">{UIVERSE.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</optgroup>}
        <optgroup label={t.vue_texte}>{Object.keys(TX).map((k) => <option key={k} value={k}>{nomIndic(k)}</option>)}</optgroup>
      </select>
    </label>
  );
}

// ---------- écran de chargement de jeu
const gdChargement = (frames, pas, note) => `# Écran de chargement · Artefacts (MIT) · https://naod.fr\n# Charge SCENE en arrière-plan (ResourceLoader.load_threaded_request), affiche la progression, des astuces\n# et un indicateur qui tourne, puis change de scène.\nextends Control\n\n@export_file("*.tscn") var scene := "res://main.tscn"\n@export var astuces := PackedStringArray(%ASTUCES%)\n\n${note ? "# " + note + "\n" : ""}const FRAMES := ${JSON.stringify(frames)}\nconst PAS := ${pas.toFixed(3)}\n@onready var _indic: Label = %Indicateur\n@onready var _jauge: ProgressBar = %Jauge\n@onready var _astuce: Label = %Astuce\nvar _t := 0.0\nvar _ta := 0.0\nvar _f := 0\nvar _a := 0\n\nfunc _ready() -> void:\n\tResourceLoader.load_threaded_request(scene)\n\t_indic.text = FRAMES[0]\n\t_astuce.text = astuces[0] if astuces.size() else ""\n\nfunc _process(delta: float) -> void:\n\t_t += delta\n\tif _t >= PAS:\n\t\t_t -= PAS\n\t\t_f = (_f + 1) % FRAMES.size()\n\t\t_indic.text = FRAMES[_f]\n\t_ta += delta\n\tif _ta >= 3.0 and astuces.size():\n\t\t_ta = 0.0\n\t\t_a = (_a + 1) % astuces.size()\n\t\t_astuce.text = astuces[_a]\n\tvar prog := []\n\tvar etat := ResourceLoader.load_threaded_get_status(scene, prog)\n\tif prog.size():\n\t\t_jauge.value = prog[0] * 100.0\n\tif etat == ResourceLoader.THREAD_LOAD_LOADED:\n\t\tget_tree().change_scene_to_packed(ResourceLoader.load_threaded_get(scene))\n\telif etat == ResourceLoader.THREAD_LOAD_FAILED or etat == ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:\n\t\tpush_error("Chargement impossible : " + scene)\n\t\tset_process(false)\n`;
const tscnChargement = (coul, titre) => `[gd_scene load_steps=4 format=3]\n\n[ext_resource type="Script" path="res://chargement/chargement.gd" id="1"]\n\n[sub_resource type="StyleBoxFlat" id="fond"]\nbg_color = Color(0.055, 0.071, 0.125, 1)\n\n[sub_resource type="StyleBoxFlat" id="rempli"]\nbg_color = Color(${coul}, 1)\n\n[node name="Chargement" type="Control"]\nlayout_mode = 3\nanchors_preset = 15\nanchor_right = 1.0\nanchor_bottom = 1.0\nscript = ExtResource("1")\n\n[node name="Fond" type="Panel" parent="."]\nlayout_mode = 1\nanchors_preset = 15\nanchor_right = 1.0\nanchor_bottom = 1.0\ntheme_override_styles/panel = SubResource("fond")\n\n[node name="Boite" type="VBoxContainer" parent="."]\nlayout_mode = 1\nanchors_preset = 8\nanchor_left = 0.5\nanchor_top = 0.5\nanchor_right = 0.5\nanchor_bottom = 0.5\noffset_left = -320.0\noffset_top = -60.0\noffset_right = 320.0\noffset_bottom = 60.0\ntheme_override_constants/separation = 12\n\n[node name="Haut" type="HBoxContainer" parent="Boite"]\nlayout_mode = 2\ntheme_override_constants/separation = 12\n\n[node name="Indicateur" type="Label" parent="Boite/Haut"]\nunique_name_in_owner = true\nlayout_mode = 2\ntheme_override_colors/font_color = Color(${coul}, 1)\n\n[node name="Titre" type="Label" parent="Boite/Haut"]\nlayout_mode = 2\ntheme_override_colors/font_color = Color(${coul}, 1)\ntext = ${JSON.stringify(titre)}\n\n[node name="Jauge" type="ProgressBar" parent="Boite"]\nunique_name_in_owner = true\ncustom_minimum_size = Vector2(0, 12)\nlayout_mode = 2\ntheme_override_styles/fill = SubResource("rempli")\nshow_percentage = false\n\n[node name="Astuce" type="Label" parent="Boite"]\nunique_name_in_owner = true\nlayout_mode = 2\ntheme_override_colors/font_color = Color(0.53, 0.588, 0.678, 1)\nautowrap_mode = 3\n`;

function EcranJeu({ r, setR, copier }) {
  const [p, setP] = useState(0), [titre, setTitre] = useState(t.jeu_titre_defaut), [indic, setIndic] = useState("blocks");
  const [astucesTexte, setAstuces] = useState(t.astuces.join("\n")), [jauge, setJauge] = useState("pleine");
  const astuces = astucesTexte.split("\n").map((s) => s.trim()).filter(Boolean);
  const ref = useRef(null), [, majCode] = useState(0);
  useEffect(() => { if (r.pause) return; const id = setInterval(() => setP((x) => (x >= 100 ? 0 : x + 1)), 60); return () => clearInterval(id); }, [r.pause]);
  useEffect(() => { const k = requestAnimationFrame(() => majCode((n) => n + 1)); return () => cancelAnimationFrame(k); }, [indic, r]);
  const blocs = (n) => "█".repeat(Math.round(n / 5)).padEnd(20, "░");
  const html = () => {
    const tx = estTexte(indic), x = TX[indic], uv = UV[indic];
    const sp = tx ? `<span class="sp">${x.frames[0]}</span>` : uv ? `<span class="uv-${uv.slug}" style="display:inline-block;zoom:${+echelle(uv, 28).toFixed(3)}">${uv.html.trim()}</span>` : (ref.current?.firstElementChild?.outerHTML ?? "");
    const style = tx ? "" : uv ? cssPortee(uv).replace(/var\(--uv-c,\s*[^)]+\)/g, r.couleur).trim() : (document.querySelector(`style[data-href="ld-${indic}"]`)?.textContent.trim() ?? "");
    return `<!-- Écran de chargement · Artefacts (MIT)${tx ? "" : uv ? ` · indicateur ${uv.nom}, Uiverse.io par ${uv.auteur} (MIT)` : ` · indicateur ${pascal(indic)} de loading-dev (MIT, Jakub Krehel)`} -->\n<div class="chargement">\n  <div class="haut">${sp} <b>${titre}</b></div>\n  ${jauge === "blocs" ? `<div class="jauge-txt">${blocs(0)}</div>` : `<div class="jauge"><i></i></div>`}\n  <div class="bas"><span class="astuce"></span><span class="pc">0 %</span></div>\n</div>\n<style>\n.chargement { font-family: monospace; color: #d6e2f0; background: #0e1220; padding: 22px; max-width: 640px; }\n.chargement .haut { display: flex; gap: 12px; align-items: center; color: ${r.couleur}; letter-spacing: .1em; }\n.chargement .jauge { height: 10px; margin: 16px 0 8px; border: 1px solid #2a3446; }\n.chargement .jauge i { display: block; height: 100%; width: 0; background: ${r.couleur}; transition: width .2s; }\n.chargement .jauge-txt { margin: 12px 0 6px; color: ${r.couleur}; letter-spacing: 1px; }\n.chargement .bas { display: flex; justify-content: space-between; color: #8796ad; font-size: 12px; }\n${style}\n</style>\n<script>\nconst astuces = ${JSON.stringify(astuces)};\n${tx ? `const frames = ${JSON.stringify(x.frames)};\nlet f = 0;\nsetInterval(() => document.querySelector(".chargement .sp").textContent = frames[f++ % frames.length], ${dureeIndic(indic, r)});\n` : ""}let a = 0;\nconst astuce = () => document.querySelector(".chargement .astuce").textContent = astuces[a++ % astuces.length] ?? "";\nastuce(); setInterval(astuce, 3000);\n// appelez progres(0..100) depuis votre chargement\nfunction progres(n) {\n  ${jauge === "blocs" ? `document.querySelector(".chargement .jauge-txt").textContent = "█".repeat(Math.round(n / 5)).padEnd(20, "░");` : `document.querySelector(".chargement .jauge i").style.width = n + "%";`}\n  document.querySelector(".chargement .pc").textContent = Math.round(n) + " %";\n}\n</script>`;
  };
  const godot = async () => {
    const coul = r.couleur.slice(1).match(/../g).map((h) => (parseInt(h, 16) / 255).toFixed(3)).join(", ");
    const x = estTexte(indic) ? TX[indic] : TX["tx-terminal"];
    const note = !estTexte(indic) ? t.jeu_note_ld.replace("{n}", nomIndic(indic)) : ASCII(x) ? "" : t.jeu_note_police;
    const gd = gdChargement(x.frames, dureeIndic(estTexte(indic) ? indic : "tx-terminal", r) / 1000, note).replace("%ASTUCES%", JSON.stringify(astuces));
    telecharger(await zip([
      { nom: "chargement/chargement.tscn", contenu: tscnChargement(coul, titre) },
      { nom: "chargement/chargement.gd", contenu: gd },
      { nom: "chargement/LISEZMOI.txt", contenu: t.jeu_lisezmoi },
    ]), "chargement-godot.zip");
  };
  return (
    <div className="jeu-disposition">
      <div className="jeu-bloc">
        <div className="jeu" style={{ "--c": r.couleur }}>
          <div className="jeu-haut"><Indic id={indic} r={r} taille={28} /><b>{titre}</b></div>
          {jauge === "blocs" ? <div className="jauge-txt">{blocs(p)}</div> : <div className="jauge"><i style={{ width: p + "%" }} /></div>}
          <div className="jeu-bas"><span>{astuces.length ? astuces[Math.floor(p / (101 / astuces.length)) % astuces.length] : ""}</span><span>{p} %</span></div>
        </div>
        <div className="actions large">
          <button type="button" className="plein" onClick={godot}>{t.jeu_godot}</button>
          <button type="button" onClick={() => copier(html())}>{t.jeu_html}</button>
        </div>
        {!estTexte(indic) && <p className="dim petit">{t.jeu_godot_ld}</p>}
      </div>
      <div className="reglages-jeu">
        <ChoixIndic label={t.indicateur} value={indic} onChange={setIndic} />
        <label className="champ">{t.jeu_titre} <input value={titre} maxLength={40} onChange={(e) => setTitre(e.target.value)} /></label>
        <label className="champ">{t.jauge} <select value={jauge} onChange={(e) => setJauge(e.target.value)}><option value="pleine">{t.jauge_pleine}</option><option value="blocs">{t.jauge_blocs}</option></select></label>
        <label className="champ colonne">{t.jeu_astuces} <textarea rows={4} value={astucesTexte} onChange={(e) => setAstuces(e.target.value)} /></label>
      </div>
      {!estTexte(indic) && !estUv(indic) && <div className="hors-ecran" aria-hidden="true" ref={ref}><Indic id={indic} r={r} taille={28} /></div>}
    </div>
  );
}

// ---------- en situation : chaque emplacement a son indicateur, choisi parmi tous, et son code
const PLACES = [
  { id: "bouton", defaut: "arc", taille: 16 },
  { id: "champ", defaut: "circular-dots", taille: 16 },
  { id: "carte", defaut: "radar", taille: 40 },
  { id: "message", defaut: "linear-dots", taille: 22 },
  { id: "liste", defaut: "tx-braille", taille: 18 },
];
function Place({ place, r, copier }) {
  const [indic, setIndic] = useState(place.defaut), ref = useRef(null);
  const rr = { ...r, taille: place.taille }, ind = <Indic id={indic} r={rr} />;
  const vue = {
    bouton: <button type="button" className="faux-btn" style={{ background: r.couleur, borderColor: r.couleur }}><span style={{ display: "contents" }}><Indic id={indic} r={{ ...rr, couleur: "#07090f" }} /></span> {t.sit_envoi}</button>,
    champ: <span className="faux-champ">{t.sit_recherche} {ind}</span>,
    carte: <span className="faux-carte">{ind}<span className="dim">{t.sit_apercu}</span></span>,
    message: <span className="faux-msg"><b>Naod</b> {ind}</span>,
    liste: <span className="faux-liste">{[1, 2, 3].map((k) => <span key={k}>{ind}<i style={{ width: 60 + k * 30 }} /></span>)}</span>,
  }[place.id];
  return (
    <figure className="place">
      <div className="place-vue">{vue}</div>
      <figcaption>{t["sit_" + place.id]}</figcaption>
      <ChoixIndic label={t.indicateur} value={indic} onChange={setIndic} />
      <div className="actions"><button type="button" className="plein" onClick={() => copier(codeIndic(indic, ONGLETS(indic)[0][0], rr, ref.current))}>{t.copier} {ONGLETS(indic)[0][1]}</button>
        {ONGLETS(indic)[1] && <button type="button" onClick={() => copier(codeIndic(indic, ONGLETS(indic)[1][0], rr, ref.current))}>{ONGLETS(indic)[1][1]}</button>}</div>
      {!estTexte(indic) && !estUv(indic) && <div className="hors-ecran" aria-hidden="true" ref={ref}><Indic id={indic} r={rr} /></div>}
    </figure>
  );
}

// ---------- des effets de la bibliothèque en guise d'indicateur
const EFFETS = [
  ["0123", () => import("../../effets/arcane/portal.js")],
  ["0059", () => import("../../effets/scifi/energy-core.js")],
  ["0118", () => import("../../effets/arcane/arcane-orb.js")],
  ["0124", () => import("../../effets/arcane/rune-circle.js")],
  ["0121", () => import("../../effets/arcane/magic-circle-cast.js")],
  ["0037", () => import("../../effets/ice/blizzard-vortex.js")],
  ["0241", () => import("../../effets/creatures/koi-pond.js")],
  ["0125", () => import("../../effets/arcane/spell-charge.js")],
];
const anim = boucle();
function Effet({ n, charger, rendu }) {
  const ref = useRef(null), renduRef = useRef(rendu), [nom, setNom] = useState("");
  renduRef.current = rendu;
  useEffect(() => { let ok = true; charger().then((m) => { if (!ok) return; setNom(m.meta.name); anim.ajouter(ref.current, new Lecteur(m), () => renduRef.current, true); }); return () => { ok = false; }; }, []);
  return (
    <article className="carte">
      <a className="scene effet" href={`${BASE}${LANGUE}/fx/${+n}/`}><canvas ref={ref} /></a>
      <div className="pied"><span className="nom">{nom}</span><span className="ms">#{n}</span></div>
      <div className="actions"><a className="bouton plein" href={`${BASE}${LANGUE}/bibliotheque/#fx=${n}`}>{t.effet_voir}</a></div>
    </article>
  );
}

function App() {
  const [r, setR] = useState(lireAdresse);
  const [q, setQ] = useState(""), [msg, setMsg] = useState("");
  const [rendu, setRendu] = useState(() => { try { const x = localStorage.getItem("art-rendu"); const v = x?.startsWith('"') ? JSON.parse(x) : x; return parId[v] ? v : RENDU_PAR_DEFAUT; } catch { return RENDU_PAR_DEFAUT; } });
  const set = (k) => (v) => setR((x) => ({ ...x, [k]: v }));
  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(""), 1800); return () => clearTimeout(id); }, [msg]);
  // l'adresse suit les réglages, pour qu'un lien copié dans la barre redonne la même page
  useEffect(() => { history.replaceState(null, "", adresse(r, r.choisi ? { s: r.choisi } : {})); }, [r]);
  const copier = (texte, ok = t.code_copie) => navigator.clipboard?.writeText(texte).then(() => setMsg(ok), () => setMsg(t.copie_ko));
  const liste = useMemo(() => {
    const m = q.trim().toLowerCase().replace(/\s+/g, "-");
    return WEB.filter((n) => n.includes(m) || (estUv(n) && (UV[n].nom.toLowerCase().replace(/\s+/g, "-").includes(m) || "uiverse".includes(m) || UV[n].auteur.toLowerCase().includes(m))));
  }, [q]);
  const listeTexte = useMemo(() => Object.keys(TX), []);
  return (
    <>
      <div className="vues" role="tablist">
        {VUES.map((v) => <button key={v} type="button" role="tab" aria-selected={r.vue === v} aria-pressed={r.vue === v} onClick={() => set("vue")(v)}>{t["vue_" + v].replace("{n}", WEB.length)}</button>)}
      </div>

      <div className="outils">
        {r.vue === "tous" && <input type="search" placeholder={t.recherche} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.recherche} />}
        {r.vue === "effets"
          ? <label>{t.rendu} <select value={rendu} onChange={(e) => { setRendu(e.target.value); try { localStorage.setItem("art-rendu", e.target.value); } catch { /* facultatif */ } }}>{rendus.map((x) => <option key={x.meta.id} value={x.meta.id}>{x.meta.nom[LANGUE] ?? x.meta.nom.fr}</option>)}</select></label>
          : <>
            {(r.vue === "tous" || r.vue === "texte") && <label>{t.taille} <input type="range" min="16" max="64" value={r.taille} onChange={(e) => set("taille")(+e.target.value)} /> <b>{r.taille}px</b></label>}
            {(r.vue === "tous" || r.vue === "texte") && <label>{t.vitesse} <input type="range" min="0.25" max="2" step="0.25" value={r.vitesse} onChange={(e) => set("vitesse")(+e.target.value)} /> <b>×{r.vitesse}</b></label>}
            <span className="couleurs">{COULEURS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={r.couleur === c} style={{ background: c }} onClick={() => set("couleur")(c)} />)}
              <input type="color" value={r.couleur} onChange={(e) => set("couleur")(e.target.value)} aria-label={t.autre_couleur} /></span>
            {(r.vue === "tous" || r.vue === "texte") && <button type="button" aria-pressed={r.fond === "clair"} onClick={() => set("fond")(r.fond === "clair" ? "sombre" : "clair")}>{t.fond_clair}</button>}
            <button type="button" aria-pressed={r.pause} onClick={() => set("pause")(!r.pause)}>{r.pause ? "▶ " + t.lecture : "❚❚ " + t.pause}</button>
          </>}
      </div>

      {r.vue === "tous" && <Catalogue liste={liste} r={r} setR={setR} copier={copier} />}

      {r.vue === "texte" && <section className="bloc"><p className="dim">{t.texte_intro}</p><Catalogue liste={listeTexte} r={r} setR={setR} copier={copier} /></section>}

      {r.vue === "jeu" && <section className="bloc"><p className="dim">{t.jeu_intro}</p><EcranJeu r={r} copier={copier} /></section>}

      {r.vue === "situation" && <section className="bloc">
        <p className="dim">{t.situation_intro}</p>
        <div className="situ">{PLACES.map((pl) => <Place key={pl.id} place={pl} r={r} copier={copier} />)}</div>
      </section>}

      {r.vue === "effets" && <section className="bloc">
        <p className="dim">{t.effets_intro}</p>
        <div className="grille">{EFFETS.map(([n, c]) => <Effet key={n} n={n} charger={c} rendu={rendu} />)}</div>
      </section>}

      <div className={`toast${msg ? " vu" : ""}`} role="status">{msg}</div>
    </>
  );
}

createRoot(document.getElementById("loading")).render(<StrictMode><App /></StrictMode>);
