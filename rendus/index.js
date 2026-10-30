// Les rendus disponibles, dans l'ordre du sélecteur. Pour en ajouter un : créer rendus/<id>.js et l'ajouter ici.
import * as glyphes from "./glyphes.js";
import * as pixel from "./pixel.js";
import * as ascii from "./ascii.js";
import * as braille from "./braille.js";
import * as blocs from "./blocs.js";
import * as phosphore from "./phosphore.js";

export const rendus = [glyphes, pixel, ascii, braille, blocs, phosphore];
export const parId = Object.fromEntries(rendus.map((r) => [r.meta.id, r]));
export const RENDU_PAR_DEFAUT = "glyphes";
