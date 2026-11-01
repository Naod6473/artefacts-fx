// pixelfx core: everything an effect imports comes from here.

export * from "./math.js";
export * from "./color.js";
export * from "./particles.js";
export * from "./shapes.js";
export { Particles, Bits, Lights, Blazes, P, PF, B, GRAVITY, FIRE_RAMP, SMOKE_RAMP, sparkle, flare, band, crystal } from "./sim.js";
export { Painter } from "./painter.js";
export { FONTS, textWidth } from "./font.js";
export { createFrame, clearFrame, createFx, composite, painterFor, resolveOptions } from "./fx.js";
export { stockActor, drawActor, actorAlphaOf, HERO, HERO2, HERO_PAL } from "./actor.js";
export { backdrop, BACKDROPS } from "./scene.js";
// pixelfx 0.3.0 : le personnage qui exécute les « moves » (effets/moves/)
export { createAct, actBounds, actSpan, actTiming, poseAt, lerpPose, Target, STAND, SKINS, posed } from "./act.js";
export { skeleton, posedParts } from "./rig.js";
export { READY } from "./poses.js";
export { chain, shiftKeys, shiftHits } from "./chain.js";
export { DUMMY_PAL } from "./mannequin.js";
export { performed } from "./move.js";
