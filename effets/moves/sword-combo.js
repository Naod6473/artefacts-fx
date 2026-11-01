import { chain, shiftKeys, shiftHits, READY, performed } from "../../core/index.js";
import * as slash from "../melee/sword-slash.js";
import * as double from "../melee/double-slash.js";
import * as cleave from "../melee/heavy-cleave.js";
import * as gestes from "./_combo.js";

const A = 0, B = 0.5, C = 1.04, STEP = 10, FINISH = C + 0.335;

const META = {
  name: "Sword combo",
  desc: "Three strokes walking forward: a slash, a crossing double cut, and a two-handed cleave into the floor that throws the target about.",
  tags: ["move", "melee", "sword", "combo", "one-shot"],
  size: [264, 150],
  origin: [72, 130],
  duration: FINISH + 1.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { seed: 1 },
};

const until = (keys, t) => keys.filter((k) => k[0] <= t);
const STAND_ = { ...READY, weapon: "sword", fx: 11, fy: -15, sa: 0.38 };
export const act = {
  target: { x: 118 },
  poses: [
    ...shiftKeys(until(gestes.slash.poses, 0.3), A),
    ...shiftKeys(until(gestes.double.poses, 0.27).filter((k) => k[0] >= -0.14), B, { dx: STEP }),
    ...shiftKeys(gestes.cleave.poses.filter((k) => k[0] >= -0.3), C, { dx: STEP * 2, weapon: "sword" }),
    [FINISH + 1.6, { ...STAND_, x: STEP * 2 - 4 }],
  ],
  hits: [...shiftHits(gestes.slash.hits, A), ...shiftHits(gestes.double.hits, B), ...shiftHits(gestes.cleave.hits, C)],
  dust: [...shiftHits(gestes.slash.dust, A).map((d) => ({ ...d })), ...shiftHits(gestes.cleave.dust, C).map((d) => ({ ...d, x: d.x + STEP * 2 }))],
};

const play = chain([
  { fx: slash, t: A },
  { fx: double, t: B, x: STEP },
  { fx: cleave, t: C, x: STEP * 2 },
]);

// Artefacts : le personnage, la cible et l'impact dessinés par l'effet lui-même (core/move.js)
export const { meta, create } = performed({ meta: META, act, create: play }, { box: [-64, -95, 279, 48] });
