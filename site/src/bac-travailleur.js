// Tourne dans un Worker créé par l'iframe isolée du bac à sable (origine opaque, sans réseau) : charge le code
// proposé, le vérifie, puis calcule les images de l'aperçu. Ce fichier est passé en texte, déjà assemblé avec ses
// imports (import "?bundle") ; le moteur, lui, arrive par message.
//
//   ← { type: "charger", moteur, code }   → { type: "tests", resultats: [{ cle, ok, grave, detail }], meta }
//   ← { type: "image", dt, pixel }          → { type: "image", w, h, sol, px, erreur }   (px : RGBA transféré)
//   ← { type: "relancer" }

// mêmes règles que le serveur (api/propositions.php) : un effet ne dessine que des pixels, il n'a rien à appeler
// (garde-fou : la vraie barrière est l'iframe sans réseau, puis surete() et ta relecture de la pull request)
import { surete } from "./surete.js";

const INTERDITS = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|eval|Function|document|window|globalThis|self|opener|localStorage|sessionStorage|indexedDB|caches|navigator|location|postMessage|setTimeout|setInterval|Worker|SharedArrayBuffer|Atomics|prototype|__proto__)\b|\.\s*constructor\b|["'`]constructor["'`]|\bimport\s*\(|\bimport\.meta\b/;
const IMPORT_MOTEUR = /(\bfrom\s*)(["'])(?:\.\.\/)+core\/index\.js\2/g;
const MAX_OCTETS = 30000;
const RESERVEES = ["x", "y", "flip", "angle", "light"];

let M = null, urlMoteur = null, mod = null, lecteur = null;

onmessage = async (e) => {
  const m = e.data;
  if (m.type === "charger") postMessage({ type: "tests", ...(await charger(m.moteur, m.code)) });
  else if (m.type === "relancer" && lecteur) lecteur.relancer();
  else if (m.type === "image") postMessage(...image(m));
};

async function charger(moteur, code) {
  const resultats = [];
  const note = (cle, ok, grave, detail = "") => resultats.push({ cle, ok, grave, detail: String(detail).slice(0, 200) });
  const fin = () => ({ resultats, meta: mod?.meta ? resume(mod.meta) : null });

  const octets = new TextEncoder().encode(code).length;
  note("taille", octets <= MAX_OCTETS, true, `${(octets / 1000).toFixed(1)} / ${MAX_OCTETS / 1000} ko`);
  const sansCommentaires = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
  const interdit = sansCommentaires.match(INTERDITS)?.[0] ?? surete(code)[0];
  note("interdits", !interdit, true, interdit ?? "");
  if (/Math\.random/.test(sansCommentaires)) note("hasard", false, true, "Math.random");
  else note("hasard", true, true);
  const redirige = code.replace(IMPORT_MOTEUR, "$1$2__MOTEUR__$2");
  const autreImport = /\bimport\b[^;'"]*["'](?!__MOTEUR__)[^"']*["']/.exec(redirige.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1"));
  note("imports", !autreImport, true, autreImport ? autreImport[0].slice(0, 80) : "");
  if (resultats.some((r) => !r.ok && r.grave)) return fin();

  try {
    if (!M) {
      urlMoteur = URL.createObjectURL(new Blob([moteur], { type: "text/javascript" }));
      M = await import(urlMoteur);
    }
    const url = URL.createObjectURL(new Blob([redirige.replaceAll("__MOTEUR__", urlMoteur)], { type: "text/javascript" }));
    mod = await import(url);
    URL.revokeObjectURL(url);
    note("chargement", true, true);
  } catch (err) {
    note("chargement", false, true, err?.message ?? err);
    return fin();
  }

  const meta = mod.meta;
  if (!meta || typeof meta !== "object") { note("meta", false, true, "export const meta = { … }"); return fin(); }
  const pb = [];
  if (typeof meta.name !== "string" || !meta.name.trim() || meta.name.length > 40) pb.push("name");
  if (typeof meta.desc !== "string" || meta.desc.length < 12 || meta.desc.length > 200) pb.push("desc (12–200)");
  if (!Array.isArray(meta.tags) || !meta.tags.length || meta.tags.some((t) => typeof t !== "string")) pb.push("tags");
  if (!Array.isArray(meta.size) || meta.size.length !== 2 || meta.size.some((v) => !Number.isInteger(v) || v < 8 || v > 400)) pb.push("size [w, h] 8–400");
  if (!Array.isArray(meta.origin) || meta.origin.length !== 2 || meta.origin.some((v) => typeof v !== "number")) pb.push("origin [x, y]");
  if (!(meta.duration > 0 && meta.duration <= 12)) pb.push("duration 0–12");
  if (meta.bg !== undefined && !M.BACKDROPS.includes(meta.bg)) pb.push(`bg : ${M.BACKDROPS.join(", ")}`);
  const prises = Object.keys(meta.options ?? {}).filter((k) => RESERVEES.includes(k));
  if (prises.length) pb.push(`options.${prises.join(", options.")}`);
  note("meta", !pb.length, true, pb.join(", "));
  const fonction = typeof mod.draw === "function" || typeof mod.create === "function";
  note("dessin", fonction, true, fonction ? "" : "export function draw(p, t, o)");
  if (pb.length || !fonction) return fin();

  // on fait tourner l'effet comme un jeu : pas fixe, plusieurs graines, et on regarde chaque image
  const m = { fps: 30, bg: "dark", loop: false, duration: 1, options: {}, ...meta };
  const [W, H] = m.size, [ox, oy] = m.origin, MARGE = 24;
  const frame = M.createFrame(W + MARGE * 2, H + MARGE * 2, -MARGE, -MARGE);
  const n = Math.max(2, Math.round(m.duration * m.fps));
  let max = 0, deborde = 0, temps = [], erreur = null, finale = null;
  const dedans = (i) => {
    const x = (i % frame.w) - MARGE, y = Math.floor(i / frame.w) - MARGE;
    return x >= 0 && y >= 0 && x < W && y < H;
  };
  const debut = performance.now();
  for (const seed of [1, 2, 7]) {
    try {
      const inst = M.createFx({ ...mod, meta: m }, { x: ox, y: oy, seed });
      for (let i = 0; i <= n; i++) {
        if (i) inst.update(1 / m.fps);
        M.clearFrame(frame);
        const t0 = performance.now();
        inst.draw(frame);
        temps.push(performance.now() - t0);
        let dans = 0, hors = 0;
        for (let j = 0; j < frame.color.length; j++) {
          if (frame.color[j] >>> 24 || frame.light[j] & 0xffffff) dedans(j) ? dans++ : hors++;
        }
        max = Math.max(max, dans);
        deborde = Math.max(deborde, hors);
        if (performance.now() - debut > 6000) throw new Error("> 6 s");
      }
      if (seed === 1) finale = frame.color.slice();
    } catch (err) {
      erreur = err?.message ?? String(err);
      break;
    }
  }
  note("execution", !erreur, true, erreur ?? "");
  if (erreur) return fin();
  note("pixels", max > 0, true, max ? `${max} px` : "");
  temps.sort((a, b) => a - b);
  const median = temps[temps.length >> 1], pire = temps[temps.length - 1];
  note("vitesse", pire < 100, true, `${median.toFixed(1)} ms / image (max ${pire.toFixed(0)} ms)`);
  if (median > 4) note("lent", false, false, `${median.toFixed(1)} ms`);
  note("cadre", deborde === 0, false, deborde ? `${deborde} px` : "");
  // même graine, même effet : deux passages donnent la même dernière image
  try {
    const inst = M.createFx({ ...mod, meta: m }, { x: ox, y: oy, seed: 1 });
    for (let i = 1; i <= n; i++) inst.update(1 / m.fps);
    M.clearFrame(frame);
    inst.draw(frame);
    let diff = 0;
    for (let j = 0; j < frame.color.length; j++) if (frame.color[j] !== finale[j]) diff++;
    note("repetable", diff === 0, true, diff ? `${diff} px` : "");
  } catch (err) {
    note("repetable", false, true, err?.message ?? err);
  }
  if (!m.loop) {
    const vide = finale.every((c, j) => !(c >>> 24) || !dedans(j));
    note("fin", vide, false);
  }
  lecteur = new M.Lecteur({ ...mod, meta: m });
  return fin();
}

function resume(meta) {
  const s = (v) => (typeof v === "string" ? v.slice(0, 200) : "");
  return { name: s(meta.name), desc: s(meta.desc), tags: Array.isArray(meta.tags) ? meta.tags.map(s).slice(0, 20) : [], size: meta.size, duration: meta.duration, loop: !!meta.loop };
}

function image({ dt, pixel }) {
  if (!lecteur) return [{ type: "image", vide: true }];
  lecteur.avancer(dt);
  lecteur.composer();
  const out = new Uint8ClampedArray(lecteur.W * lecteur.H * 4);
  if (pixel) M.composite(lecteur.frame, out, lecteur.decor);
  else M.composite(lecteur.frame, out, M.hex("#000000"));
  return [{ type: "image", w: lecteur.W, h: lecteur.H, sol: lecteur.img.sol, px: out.buffer, erreur: lecteur.erreur }, [out.buffer]];
}
