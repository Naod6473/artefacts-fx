# Mentions

**pixelfx.** Le moteur (`core/`), les 232 premiers effets (`effets/`) et les outils `tools/check.mjs`, `tools/index.mjs`,
`tools/lib/` viennent de [pixelfx](https://github.com/patch-gg/pixelfx), MIT License, Copyright (c) 2026 Patch,
Copyright (c) 2026 Hugo Duprez. Les 12 attaques de `effets/moves/` (#0255–#0266) et le personnage qui les exécute
(`core/act.js`, `core/rig.js`, `core/poses.js`, `core/chain.js`, `core/mannequin.js`) viennent de pixelfx 0.3.0, même licence ;
`core/move.js` les adapte au site.

**Hollow Crown.** Le gel à l'impact, la secousse, la cible qui encaisse et les poses tenues par pas de 12 images par seconde
(`core/act.js`) reprennent la façon dont Hollow Crown joue ses compétences (https://github.com/rehan-remade/hollow-crown),
MIT License, Copyright (c) 2026 rehan-remade. Les rendus de `rendus/` sont repris de la maquette d'Artefacts.

**Hugo Duprez.** `core/sim.js` et les effets qui le disent en tête de fichier adaptent les effets pixel art open source
de Sprite Fusion (https://www.spritefusion.com/pixel-art-vfx), Copyright (c) 2026 Hugo Duprez, MIT License.

**ascii-magic-art.** Les 731 scènes animées en caractères des catégories landscapes, screens, live-data, explainers,
lettering, solids, cosmos, motion-lab, wild, animals, things, algorithms, demoscene, arcade, frames, occasions, cities,
mascots, empty-states, retro, science, music, food et india (#0267–#0997), ainsi que `effets/_ascii/lib/kit.js` et
`effets/_ascii/lib/scene.js`, viennent d'[ascii-magic-art](https://github.com/kailashsr38/ascii-magic-art) (commit b324cb0),
MIT License, Copyright (c) 2026 ASCII Magic (ascii-magic.com) ; texte complet dans `effets/_ascii/LICENSE`. Chaque fichier
garde la pièce d'origine et le dit en tête ; `effets/_ascii/fx.js` et `effets/_ascii/glyphes.js` (code d'Artefacts) les
branchent sur le moteur. Trois scènes du dépôt d'origine faites à partir de photos (ocean-sunset, starry-ridge :
Unsplash License ; temple-sunset : photo d'origine non indiquée) ne sont pas sous MIT et ne sont pas reprises.

**PVFX Foundry.** Les 47 effets tagués pvfx (#0998–#1044), rangés dans les catégories de la bibliothèque, sont tirés des planches de sprites « lit » de
PVFX Foundry 1.0 par Pixel VFX Studio (https://github.com/arcanite24/pixel-vfx-studio, commit 57e8eff), dédiées au
domaine public sous CC0 1.0 Universal ; texte complet dans `effets/_pvfx/LICENSE.txt`. Crédit suggéré par l'auteur :
« VFX from PVFX Foundry by Pixel VFX Studio ». La CC0 ne couvre ni le logiciel Pixel VFX Studio, ni le code de ses
effets, ni ses noms et marques : rien de cela n'est repris. `tools/pvfx-foundry.mjs` importe les images et
`effets/_pvfx/planche.js` (code d'Artefacts) les repeint dans le tampon. Les effets du pack dont le nom existait déjà
dans la bibliothèque (54 sur 101) et les 44 effets de l'ancienne version 0.10 ne sont pas repris.

**Police Patch Pixel.** La police du dossier `gallery/fonts` de pixelfx appartient à Patch et n'est pas sous licence
MIT. Elle n'est pas incluse dans ce dépôt et ne doit pas y être ajoutée.

## Interfaces (Inkra)

La page Interfaces reprend la documentation et les composants d'Inkra (https://github.com/inkrajs/inkra et https://github.com/inkrajs/docs), licence MIT, Copyright (c) 2026 Inkra contributors. Polices sous SIL Open Font License 1.1. Détails : site/interfaces/inkra-docs/.

## Loading (loading-dev)

La page Loading utilise le paquet npm loading-dev (https://github.com/jakubkrehel/loading), licence MIT, Copyright (c) 2026 Jakub Krehel.

## Loading (Uiverse)

La page Loading reprend aussi des éléments d'Uiverse (https://uiverse.io), licence MIT, chacun crédité à son auteur dans site/loading/uiverse.js :
- « AI Matrix Loader » (https://uiverse.io/PriyanshuGupta28/bright-bobcat-12), par PriyanshuGupta28.
