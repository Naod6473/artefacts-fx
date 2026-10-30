# artefacts-fx

254 game visual effects written in plain JavaScript, with no images: fire, explosions, lightning, magic, impacts,
pickups, weather, UI bursts… Each effect draws into a small pixel buffer, and the same effect can be shown in ten
styles: pixel art, code glyphs, ASCII, braille, blocks, CRT phosphor, Game Boy, LED matrix, VHS and Minitel.

Browse and try them all at **https://naod.fr** (each effect has a number, like `#0002` for the campfire).

MIT licensed. The engine and the original effects come from [pixelfx](https://github.com/patch-gg/pixelfx) (MIT).

```sh
npm install artefacts-fx
```

## Draw an effect into your own pixels

The engine is framework-free: an effect updates with `dt` and draws into a frame (two `Uint32Array`, color and
light), which you composite into RGBA bytes for a canvas, a texture or anything else.

```js
import { createFx, createFrame, composite } from "artefacts-fx";
import * as campfire from "artefacts-fx/effets/fire/campfire.js"; // #0002

const frame = createFrame(96, 72);
const fx = createFx(campfire, { x: 48, y: 60, seed: 1 });
const image = new ImageData(96, 72);

function tick(dt) {
  fx.update(dt);
  fx.draw(frame);
  composite(frame, image.data); // RGBA, ready for putImageData or a texture upload
}
```

Every effect module exports `meta` (name, size, origin, duration, loop, options…) and `draw` or `create`.
Options from `meta.options` (palette, seed, speed…) can be overridden in the second argument of `createFx`.

## Show an effect in one of the eleven styles (browser)

The player handles timing, the stage and the render style on a `<canvas>`:

```js
import { Lecteur } from "artefacts-fx/lecteur";
import * as torch from "artefacts-fx/effets/fire/torch.js";

const canvas = document.querySelector("canvas");
const player = new Lecteur(torch);
let last = performance.now();
requestAnimationFrame(function loop(now) {
  player.avancer((now - last) / 1000); // advance time (seconds)
  player.dessiner(canvas, "glyphes", now); // "pixel", "ascii", "braille", "blocs", "phosphore", "gameboy", "led", "vhs", "minitel"
  last = now;
  requestAnimationFrame(loop);
});
```

## What's inside

| Import | Contents |
| --- | --- |
| `artefacts-fx` | the engine: frames, painter, particles, colors, `createFx`, `composite` |
| `artefacts-fx/effets/<category>/<name>.js` | one effect |
| `artefacts-fx/effets` | every effect, by id |
| `artefacts-fx/rendus` | the ten render styles (`rendus`, `parId`) |
| `artefacts-fx/lecteur` | the browser player used on naod.fr (`Lecteur`) |

For Godot 4, the site exports any effect as a sprite sheet with a ready `SpriteFrames` and scene, and as a GIF.

---

*En français : 254 effets visuels de jeu en JavaScript, sans image, sous licence MIT. Le site https://naod.fr permet
de les parcourir, de choisir un rendu et d'exporter planche de sprites, GIF, vidéo ou fichiers Godot 4.*
