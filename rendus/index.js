// Les rendus disponibles, dans l'ordre du sélecteur. Pour en ajouter un : créer rendus/<id>.js et l'ajouter ici.
import * as glyphes from "./glyphes.js";
import * as pixel from "./pixel.js";
import * as ascii from "./ascii.js";
import * as braille from "./braille.js";
import * as blocs from "./blocs.js";
import * as phosphore from "./phosphore.js";
import * as gameboy from "./gameboy.js";
import * as led from "./led.js";
import * as vhs from "./vhs.js";
import * as minitel from "./minitel.js";

export const rendus = [glyphes, pixel, ascii, braille, blocs, phosphore, gameboy, led, vhs, minitel];
export const parId = Object.fromEntries(rendus.map((r) => [r.meta.id, r]));
export const RENDU_PAR_DEFAUT = "glyphes";
