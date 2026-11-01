// Artefacts : un « move » de pixelfx (un personnage qui exécute une attaque, core/act.js) emballé en effet ordinaire.
// Le site, les rendus, les aperçus et les exports ne connaissent que { meta, create } : ici le personnage, la cible, le
// gel à l'impact et la secousse sont dessinés par l'effet lui-même, dans un cadre assez grand pour tout contenir.
//
//   export const { meta, create } = performed({ meta: META, act, create: play }, { box: [x0, y0, x1, y1] });
//
// box : ce que l'effet dessine vraiment, en px depuis les pieds (mesuré, graines 1 à 4) ; sinon actBounds, plus étroit.

import { createFrame, clearFrame } from "./fx.js";
import { createAct, actBounds, actSpan } from "./act.js";

const PAD = 3; // marge pour la secousse

/** { meta, create } d'un effet joué par le personnage, à partir du module pixelfx { meta, act, create }. */
export function performed(src, { box } = {}) {
  const b = box ? { x0: box[0], y0: box[1], x1: box[2], y1: box[3] } : actBounds(src), span = actSpan(src);
  // le temps s'arrête pendant les gels : la durée réelle les ajoute (deux coups au même instant gèlent une seule fois)
  const gels = new Map();
  for (const h of src.act?.hits ?? []) if (h.stop) gels.set(h.t, Math.max(gels.get(h.t) ?? 0, h.stop));
  const gel = [...gels.values()].reduce((s, v) => s + v, 0);
  const x0 = Math.floor(b.x0) - PAD, y0 = Math.floor(b.y0) - PAD, x1 = Math.ceil(b.x1) + PAD, y1 = Math.ceil(b.y1) + PAD;
  const { actor, ...rest } = src.meta;
  const meta = {
    ...rest,
    size: [x1 - x0, y1 - y0],
    origin: [-x0, -y0],
    duration: Math.ceil((span.to - span.from + gel) * 100) / 100,
  };
  const create = (o) => {
    const act = createAct(src, o);
    let tampon = null;
    return {
      update(dt) {
        if (!act.done()) act.update(dt);
      },
      draw(p) {
        const f = p.frame, [sx, sy] = act.shake;
        if (!sx && !sy) return act.draw(f);
        if (!tampon || tampon.w !== f.w || tampon.h !== f.h) tampon = createFrame(f.w, f.h, f.ox, f.oy);
        clearFrame(tampon);
        act.draw(tampon);
        // toute l'image secouée de (sx, sy)
        for (let y = 0; y < f.h; y++) {
          const yy = y - sy;
          if (yy < 0 || yy >= f.h) continue;
          for (let x = 0; x < f.w; x++) {
            const xx = x - sx;
            if (xx < 0 || xx >= f.w) continue;
            const i = y * f.w + x, j = yy * f.w + xx;
            if (tampon.color[j]) f.color[i] = tampon.color[j];
            if (tampon.light[j]) f.light[i] = tampon.light[j];
          }
        }
      },
    };
  };
  return { meta, create };
}
