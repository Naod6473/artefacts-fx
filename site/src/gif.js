// Encodeur GIF animé minimal (GIF89a), pour l'export « GIF » de la planche de sprites : une palette commune à toutes
// les images (les effets ont peu de couleurs ; au-delà de 255, les plus fréquentes, et chaque pixel prend la plus
// proche), la transparence sur l'index 0, une boucle infinie et la compression LZW.

/** images : des ImageData de même taille ; delai en centièmes de seconde. Rend un Uint8Array. */
export function gif(images, largeur, hauteur, delai, transparent) {
  const { palette, index } = paletteDe(images, transparent);
  const octets = [];
  const u8 = (...v) => octets.push(...v);
  const u16 = (v) => u8(v & 255, (v >> 8) & 255);
  const texte = (s) => u8(...[...s].map((c) => c.charCodeAt(0)));

  texte("GIF89a");
  u16(largeur);
  u16(hauteur);
  u8(0xf7, 0, 0); // palette globale de 256 couleurs
  for (let i = 0; i < 256; i++) u8(...(palette[i] ?? [0, 0, 0]));
  u8(0x21, 0xff, 11);
  texte("NETSCAPE2.0");
  u8(3, 1);
  u16(0); // boucle infinie
  u8(0);

  for (const img of images) {
    // extension de contrôle : délai, transparence (index 0), chaque image remplace la précédente
    u8(0x21, 0xf9, 4, transparent ? 0x09 : 0x08);
    u16(delai);
    u8(0, 0);
    u8(0x2c);
    u16(0);
    u16(0);
    u16(largeur);
    u16(hauteur);
    u8(0);
    const px = new Uint8Array(largeur * hauteur), d = img.data;
    for (let i = 0; i < px.length; i++) px[i] = index(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]);
    u8(8);
    const lzw = compresser(px, 8);
    for (let i = 0; i < lzw.length; i += 255) {
      const bloc = lzw.subarray(i, i + 255);
      u8(bloc.length);
      for (const b of bloc) octets.push(b);
    }
    u8(0);
  }
  u8(0x3b);
  return Uint8Array.from(octets);
}

function paletteDe(images, transparent) {
  const compte = new Map();
  for (const img of images) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (transparent && d[i + 3] < 128) continue;
      const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      compte.set(c, (compte.get(c) ?? 0) + 1);
    }
  }
  const debut = transparent ? 1 : 0, place = 256 - debut;
  let couleurs = [...compte.keys()];
  if (couleurs.length > place) {
    // trop de couleurs : on regroupe par cases de 8 niveaux, on garde les cases les plus remplies (leur moyenne)
    const cases = new Map();
    for (const [c, n] of compte) {
      const k = ((c >> 19) << 10) | (((c >> 11) & 31) << 5) | ((c >> 3) & 31);
      const z = cases.get(k) ?? { r: 0, g: 0, b: 0, n: 0 };
      z.r += (c >> 16) * n; z.g += ((c >> 8) & 255) * n; z.b += (c & 255) * n; z.n += n;
      cases.set(k, z);
    }
    couleurs = [...cases.values()].sort((a, b) => b.n - a.n).slice(0, place)
      .map((z) => (Math.round(z.r / z.n) << 16) | (Math.round(z.g / z.n) << 8) | Math.round(z.b / z.n));
  }
  const palette = [];
  if (transparent) palette.push([0, 0, 0]);
  for (const c of couleurs) palette.push([c >> 16, (c >> 8) & 255, c & 255]);
  const exact = new Map(couleurs.map((c, i) => [c, i + debut]));
  const proche = new Map();
  const index = (r, g, b, a) => {
    if (transparent && a < 128) return 0;
    const c = (r << 16) | (g << 8) | b;
    let i = exact.get(c) ?? proche.get(c);
    if (i !== undefined) return i;
    let mieux = Infinity;
    for (let k = debut; k < palette.length; k++) {
      const [pr, pg, pb] = palette[k], e = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
      if (e < mieux) { mieux = e; i = k; }
    }
    proche.set(c, i);
    return i;
  };
  return { palette, index };
}

// LZW à taille de code variable, comme le veut le format GIF (codes de 9 à 12 bits, table remise à zéro à 4096)
function compresser(px, tailleMin) {
  const clair = 1 << tailleMin, fin = clair + 1, sortie = [];
  let taille = tailleMin + 1, suivant = fin + 1, table = new Map(), tampon = 0, bits = 0;
  const ecrire = (code) => {
    tampon |= code << bits;
    bits += taille;
    while (bits >= 8) { sortie.push(tampon & 255); tampon >>>= 8; bits -= 8; }
  };
  ecrire(clair);
  let w = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], cle = w * 256 + k, connu = table.get(cle);
    if (connu !== undefined) { w = connu; continue; }
    ecrire(w);
    if (suivant < 4096) {
      table.set(cle, suivant++);
      if (suivant > 1 << taille && taille < 12) taille++;
    } else {
      ecrire(clair);
      table = new Map();
      suivant = fin + 1;
      taille = tailleMin + 1;
    }
    w = k;
  }
  ecrire(w);
  ecrire(fin);
  if (bits > 0) sortie.push(tampon & 255);
  return Uint8Array.from(sortie);
}
