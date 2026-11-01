// Les gestes des trois coups que « Sword combo » enchaîne, repris de pixelfx 0.3.0 (src/fx/melee/sword-slash.js,
// double-slash.js, heavy-cleave.js, MIT). Gardés ici pour ne pas changer les effets de mêlée déjà publiés sur le site.

import { READY } from "../../core/index.js";

// sword-slash
export const slash = (() => {
  const GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
  // the blade goes back past his head, then lags behind the hand on the way through, so the wrist breaks and it whips
  const WIND = { ...GUARD, x: -8, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
  const CUT = { ...GUARD, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 };
  const DOWN = { ...GUARD, x: 2, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true };
  return {
    target: { x: 58 },
    poses: [
      [-0.55, { ...GUARD, x: -8 }],
      [-0.3, WIND],
      [-0.08, { ...WIND, crouch: 5, lean: -5 }],
      [0, CUT, "snap"],
      [0.06, DOWN, "snap"],
      [0.3, { ...DOWN, x: 3, crouch: 6 }],
      [0.58, { ...GUARD, x: 1, crouch: 3, fx: 15, fy: -21, sa: 0.1, bx: -5, by: -21, ffx: 9, fbx: -7 }],
      [0.86, { ...GUARD, x: -8 }],
    ],
    hits: [{ t: 0.06, stop: 0.14, shake: 0.18, amp: 2, push: 2.8, straw: 18 }],
    dust: [{ t: 0.06, x: 16, n: 7, dir: 1 }, { t: 0.06, x: -11, n: 4, dir: -1 }],
  };
})();

// double-slash
export const double = (() => {
  const STANCE = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
  const HIGH = { ...STANCE, x: -7, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
  const LOW = { ...STANCE, x: 3, crouch: 6, lean: 6, fx: 22, fy: -20, sa: 0.62, bx: -8, by: -24, ffx: 13, fbx: -10, toeB: true };
  return {
    target: { x: 62 },
    poses: [
      [-0.42, { ...STANCE, x: -7 }],
      [-0.18, HIGH],
      [-0.04, { ...HIGH, crouch: 5 }],
      [0, { ...STANCE, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -9, ghost: 1 }, "snap"],
      [0.06, LOW, "snap"],
      [0.14, { ...LOW, x: 4, crouch: 6, lean: 5, fx: 20, fy: -17, sa: 0.85, ghost: 1 }],
      [0.17, { ...LOW, x: 5, crouch: 3, lean: 5, fx: 22, fy: -28, sa: 0.1, by: -18, toeB: true, ghost: 1 }, "snap"],
      [0.21, { ...LOW, x: 6, crouch: 1, lean: 6, fx: 19, fy: -37, sa: -0.95, by: -18, ffx: 13, fby: -6 }, "snap"],
      [0.5, { ...LOW, x: 6, crouch: 3, lean: 3, fx: 18, fy: -36, sa: -1.05, by: -19, ffx: 12 }],
      [0.92, { ...STANCE, x: -7 }],
    ],
    hits: [
      { t: 0.06, stop: 0.05, shake: 0.08, amp: 1, push: 1.4, straw: 8 },
      { t: 0.16, stop: 0.14, shake: 0.2, amp: 2, push: 2.8, straw: 18, y: -28 },
    ],
    dust: [{ t: 0.06, x: 16, n: 5, dir: 1 }, { t: 0.17, x: -8, n: 4, dir: -1 }],
  };
})();

// heavy-cleave
export const cleave = (() => {
  const REST_ = { ...READY, weapon: "greatsword", two: true, sa: -1, fx: 11, fy: -21 };
  const OVER = { ...REST_, x: -4, crouch: 2, lean: -2, fx: 1, fy: -42, sa: -2.45, ffx: 8, fbx: -7 };
  const FLOOR = { ...REST_, x: 0, crouch: 7, lean: 6, fx: 17, fy: -21, sa: 0.72, ffx: 11, fbx: -10, toeB: true };
  return {
    target: { x: 66 },
    poses: [
      [-0.42, { ...REST_, x: -4 }],
      [-0.3, { ...REST_, x: -3, crouch: 4, fx: 13, fy: -29, sa: -1.3 }],
      [-0.12, { ...OVER, crouch: 4 }],
      [0.2, { ...OVER, crouch: 3 }],
      [0.27, { ...REST_, x: -1, y: -2, crouch: 0, lean: 2, fx: 11, fy: -42, sa: -1.45, ffx: 10, ghost: 1 }, "snap"],
      [0.31, { ...REST_, x: 0, y: -1, crouch: 3, lean: 4, fx: 18, fy: -33, sa: -0.45, ffx: 12, ghost: 1 }, "snap"],
      [0.335, FLOOR, "snap"],
      [0.85, { ...FLOOR, crouch: 6, lean: 5 }],
      [1.3, { ...REST_, x: -2, crouch: 4, lean: 2, fx: 15, fy: -23, sa: 0.1 }],
      [1.7, { ...REST_, x: -4 }],
    ],
    hits: [{ t: 0.335, stop: 0.2, shake: 0.34, amp: 3, push: 3.2, straw: 28, y: -8 }],
    dust: [{ t: 0.335, x: 18, n: 8, dir: 1 }, { t: 0.335, x: -12, n: 5, dir: -1 }],
  };
})();

