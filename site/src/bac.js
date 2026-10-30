// Bac à sable : fait tourner un effet proposé (du code qui n'est pas encore relu) sans qu'il puisse toucher au site.
// Une iframe sandbox="allow-scripts" sans allow-same-origin a une origine opaque : pas de cookies, pas d'accès à la
// page ni à l'API ; sa politique de sécurité interdit en plus tout réseau. Le code y tourne dans un Worker.
import interieur from "./bac-interieur.js?source";
import travailleur from "./bac-travailleur.js?source";

const CSP = "default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; style-src 'unsafe-inline'";
let moteur = null;

export class Bac {
  /** conteneur : l'élément où placer l'aperçu ; base : chemin du site (pour assets/moteur-bac.js). */
  constructor(conteneur, base) {
    this.base = base;
    this.cadre = document.createElement("iframe");
    this.cadre.className = "bac";
    this.cadre.setAttribute("sandbox", "allow-scripts");
    this.cadre.setAttribute("title", "aperçu");
    this.cadre.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">`
      + `<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;display:grid;place-items:center}canvas{display:block;image-rendering:pixelated}</style>`
      + `<canvas></canvas><script type="module">${interieur.replace(/<\/script/gi, "<\\/script")}</script>`;
    this.pret = new Promise((ok) => this.cadre.addEventListener("load", ok, { once: true }));
    conteneur.append(this.cadre);
    this.attente = null;
    addEventListener("message", (e) => {
      if (e.source !== this.cadre.contentWindow || !this.attente) return;
      if (e.data?.type === "tests") this.attente({ resultats: e.data.resultats ?? [], meta: e.data.meta ?? null });
      else if (e.data?.type === "bloque") this.attente({ resultats: [{ cle: "bloque", ok: false, grave: true, detail: "" }], meta: null });
      else return;
      this.attente = null;
    });
  }

  /** Charge et vérifie le code ; rend { resultats: [{ cle, ok, grave, detail }], meta } puis l'aperçu tourne. */
  async lancer(code, rendu) {
    moteur ??= fetch(this.base + "assets/moteur-bac.js").then((r) => r.text());
    const texte = await moteur;
    await this.pret;
    // un lancement remplace le précédent : sa promesse reçoit le résultat du nouveau
    const precedent = this.attente;
    const p = new Promise((ok) => (this.attente = (r) => { precedent?.(r); ok(r); }));
    this.cadre.contentWindow.postMessage({ type: "lancer", moteur: texte, travailleur, code, rendu }, "*");
    return p;
  }

  rendu(id) { this.cadre.contentWindow?.postMessage({ type: "rendu", rendu: id }, "*"); }
  relancer() { this.cadre.contentWindow?.postMessage({ type: "relancer" }, "*"); }
}

/** Les vérifications réussies ? (seules les graves bloquent l'envoi) */
export const valide = (resultats) => resultats.length > 0 && resultats.every((r) => r.ok || !r.grave);
