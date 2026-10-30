// Braille : 8 points par case (2 x 4), chaque point allumé si sa zone est lumineuse.
import { tailleCase, fondTexte, cellule } from "./_commun.js";

export const meta = { id: "braille", nom: { fr: "Braille", en: "Braille" } };

const BITS = [[0, 0, 1], [0, 1, 2], [0, 2, 4], [1, 0, 8], [1, 1, 16], [1, 2, 32], [0, 3, 64], [1, 3, 128]];

export function draw(ctx, img, W, H) {
  const CS = tailleCase(img, W), k = W / img.w;
  fondTexte(ctx, img, W, H, CS);
  const bw = Math.max(1, Math.round(CS / 2)), bh = Math.max(1, Math.round(CS / 4)), cw = bw * 2, ch = bh * 4;
  ctx.font = `700 ${ch * k * 1.12}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let gy = 0; gy < img.h; gy += ch)
    for (let gx = 0; gx < img.w; gx += cw) {
      let m = 0, R = 0, G = 0, B = 0, n = 0;
      for (const [dx, dy, bit] of BITS) {
        const c = cellule(img, gx + dx * bw, gy + dy * bh, bw, bh);
        if (c && c[3] > 0.12) { m |= bit; R += c[0]; G += c[1]; B += c[2]; n++; }
      }
      if (!m) continue;
      // les points sont fins : on remonte la couleur pour qu'ils restent lisibles
      const f = Math.max(1, 210 / (Math.max(R, G, B) / n || 1));
      ctx.fillStyle = `rgb(${Math.min(255, (R / n) * f) | 0},${Math.min(255, (G / n) * f) | 0},${Math.min(255, (B / n) * f) | 0})`;
      ctx.fillText(String.fromCharCode(0x2800 + m), (gx + cw / 2) * k, (gy + ch / 2) * k);
    }
}
