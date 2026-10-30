// L'extrait « Utiliser cet effet », le même dans le panneau de la bibliothèque et sur la page de chaque effet. Les
// chemins sont ceux du dossier artefacts/ de l'export zip (ou d'une copie du dépôt).
export const usage = (e, options = "") => `import { createFx, createFrame, composite } from "./artefacts/core/index.js";
import * as fx from "./artefacts/effets/${e.id}.js"; // #${e.n}

const frame = createFrame(${e.size[0]}, ${e.size[1]});
const inst = createFx(fx, { x: ${e.origin[0]}, y: ${e.origin[1]}, seed: 1${options} });

function tick(dt) {
  inst.update(dt);
  inst.draw(frame);
  composite(frame, imageData.data);
}`;
