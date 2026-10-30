// Le script de l'iframe isolée du bac à sable (sandbox="allow-scripts", sans réseau). Passé en texte (import "?source").
// Le code proposé tourne dans un Worker créé ici : s'il boucle sans fin, seul le Worker est bloqué, et on l'arrête.
//
//   ← { type: "lancer", moteur, travailleur, code, rendu }   → { type: "tests", resultats, meta } | { type: "bloque" }
//   ← { type: "rendu", rendu }   ← { type: "relancer" }

const cv = document.querySelector("canvas"), ctx = cv.getContext("2d");
let M = null, w = null, rendu = "pixel", attente = 0, img = null, enCours = false, avant = 0, gen = 0;

addEventListener("message", async (e) => {
  if (e.source !== parent) return;
  const m = e.data;
  if (m.type === "rendu") { rendu = m.rendu; if (img) img.frais = true; return; }
  if (m.type === "relancer") { w?.postMessage({ type: "relancer" }); return; }
  if (m.type !== "lancer") return;
  rendu = m.rendu;
  if (!M) M = await import(URL.createObjectURL(new Blob([m.moteur], { type: "text/javascript" })));
  w?.terminate();
  const g = ++gen;
  enCours = false;
  img = null;
  ctx.clearRect(0, 0, cv.width, cv.height);
  // Worker classique : un Worker « module » ne se charge pas depuis une origine opaque ; import() y marche
  w = new Worker(URL.createObjectURL(new Blob([m.travailleur], { type: "text/javascript" })));
  const garde = setTimeout(() => bloque(g), 10000);
  w.onmessage = (r) => {
    if (g !== gen) return;
    if (r.data.type === "tests") {
      clearTimeout(garde);
      parent.postMessage({ type: "tests", resultats: r.data.resultats, meta: r.data.meta }, "*");
      enCours = true;
      demander();
    } else if (r.data.type === "image") {
      clearTimeout(attente);
      if (!r.data.vide) dessiner(r.data);
      requestAnimationFrame(demander);
    }
  };
  w.onerror = (err) => {
    clearTimeout(garde);
    parent.postMessage({ type: "tests", resultats: [{ cle: "chargement", ok: false, grave: true, detail: err.message ?? "" }], meta: null }, "*");
  };
  w.postMessage({ type: "charger", moteur: m.moteur, code: m.code });
});

function bloque(g) {
  if (g !== gen) return;
  w?.terminate();
  w = null;
  enCours = false;
  parent.postMessage({ type: "bloque" }, "*");
}

function demander() {
  if (!enCours || !w) return;
  const now = performance.now(), dt = avant ? Math.min(0.05, (now - avant) / 1000) : 0;
  avant = now;
  const g = gen;
  attente = setTimeout(() => bloque(g), 2000);
  w.postMessage({ type: "image", dt, pixel: rendu === "pixel" });
}

function dessiner(d) {
  if (!img || img.w !== d.w || img.h !== d.h) img = { w: d.w, h: d.h, noir: null, fond: null, sol: d.sol, now: 0, frais: true };
  const px = new Uint8ClampedArray(d.px);
  img.noir = img.fond = px;
  img.now = performance.now();
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr);
  const H = Math.round(Math.min(innerHeight * dpr, (W * d.h) / d.w)), L = Math.round((H * d.w) / d.h);
  if (cv.width !== L || cv.height !== H) { cv.width = L; cv.height = H; img.frais = true; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  (M.parId[rendu] ?? M.parId.pixel).draw(ctx, img, L, H);
  img.frais = false;
  if (d.erreur) {
    ctx.fillStyle = "#ff7a6b";
    ctx.font = "12px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(String(d.erreur).slice(0, 60), 6, 6);
  }
}
