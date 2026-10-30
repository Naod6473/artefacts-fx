# Artefacts

**Des effets visuels de jeu écrits en code, à voir dans le rendu de son choix.** Site : **https://naod.fr**

*Game visual effects written in code, shown in the style you pick. English: see the [npm package README](tools/paquet/README.md).*

[![Feu de camp, effet #0002](https://naod.fr/apercus/0002.png)](https://naod.fr/fr/fx/2/)

Chaque effet est un petit fichier JavaScript, sans image, sous licence MIT. Le même effet s'affiche en pixel art, en
glyphes de code, en ASCII, en braille, en blocs, sur un écran à phosphore, en Game Boy, en matrice LED, en VHS, en Minitel ou
au crayon de couleur. <!-- count -->254<!-- /count --> effets : 232 repris de [pixelfx](https://github.com/patch-gg/pixelfx), 22 créatures
vues de dessus tirées des jeux de Simon (les boss rampants d'Antivirus TD, les koïs de Koïs, puis un python, une chauve-souris, des corbeaux et un essaim), plus ceux que proposent
les membres.

- **Bibliothèque** : recherche (`#42`, `feu`, `tag:boucle -fumée dur:<1`), réglages en direct, liens partageables, une page par effet.
- **Exports** : planche de sprites PNG, GIF animé, vidéo WebM, fichiers Godot 4 (SpriteFrames + scène), projet zip.
- **Dans le code** : `npm install artefacts-fx` (moteur, effets, rendus et lecteur ; voir le [README du paquet](tools/paquet/README.md)).
- **Assistants IA** : serveur MCP public, `https://naod.fr/api/mcp`.
- **Communauté** : comptes privés (favoris, projets), propositions d'effets testées dans un bac à sable et relues.

## Contribuer

- Proposer un effet : directement sur https://naod.fr/fr/proposer/ (éditeur, aperçu, vérifications), ou par pull request
  dans `effets/communaute/`.
- Un nouveau rendu : un fichier `rendus/<id>.js` (un filtre sur le tampon de pixels), ajouté à `rendus/index.js`. Il
  marche aussitôt sur tous les effets.
- Bugs et idées : les issues GitHub, ou contact@naod.fr.

## Arborescence

| Dossier | Contenu |
| --- | --- |
| `effets/<catégorie>/<nom>.js` | un effet = un fichier : `meta` + `draw(p, t, o)` ou `create(o)` (format pixelfx) |
| `rendus/<id>.js` | un rendu = un filtre sur le tampon de pixels ; un nouveau rendu marche sur tous les effets |
| `core/` | le moteur : tampon, pinceau, particules, couleurs (pixelfx) |
| `site/` | le site : pages (`pages/`), textes par langue (`i18n/`), scripts (`src/`), fichiers statiques (`static/`) |
| `api/` | la partie communauté en PHP + SQLite : comptes, propositions, serveur MCP |
| `config/ovh.json` | réglages de la mise en ligne (dossier sur le FTP, adresse du site) |
| `tools/` | `check.mjs` vérifie les effets, `index.mjs` régénère `effets/index.js`, `paquet.mjs` prépare le paquet npm |
| `docs/` | l'architecture et les choix |

## Travailler en local

```sh
npm install
npm run dev      # construit dist/ et le sert sur http://localhost:8080
npm run check    # vérifie tous les effets (ou : npm run check -- fire/campfire)
npm run index    # après l'ajout d'un effet
```

## Mise en ligne

Chaque push sur `main` construit le site et l'envoie sur OVH en SFTP (`.github/workflows/deploiement.yml`). Le dossier distant
est dans `config/ovh.json` ; les identifiants FTP sont dans les secrets du repo (`FTP_SERVER`, `FTP_USERNAME`,
`FTP_PASSWORD`), jamais dans le code.

## Serveur MCP (assistants IA)

`https://naod.fr/api/mcp` (transport Streamable HTTP, sans compte) : outils `search_effects`, `get_effect`, `list_styles`, `list_tags`. Code : `api/mcp.php`, qui lit `dist/api/catalogue/` écrit par le build. Doc pour les utilisateurs : https://naod.fr/fr/ia/.

## Comptes membres

`api/compte.php` (routes `/api/compte/<action>`, liste en tête du fichier) : inscription par e-mail (lien de confirmation)
ou GitHub, favoris et projets privés. Base SQLite `api/donnees/comptes.sqlite`, jamais envoyée ni écrasée par le
déploiement. Connexion GitHub : app OAuth (callback `https://naod.fr/api/compte/github`) et secrets du repo
`GH_CLIENT_ID` / `GH_CLIENT_SECRET`, écrits au déploiement dans `api/donnees/config.php`. Les e-mails partent par
la boîte `noreply@naod.fr` (SMTP ssl0.ovh.net, secret `SMTP_PASSWORD`), ou `mail()` d'OVH sans ce secret. Essai en local : `ARTEFACTS_MAILS=mails.log php -S localhost:8090 -t dist routeur.php`
(les e-mails sont écrits dans le fichier).

## Effets proposés par les membres

Page `/fr/proposer/` : un éditeur, l'aperçu et des vérifications automatiques. Le code proposé tourne dans une iframe
`sandbox="allow-scripts"` (origine opaque : ni cookies, ni accès à la page) dont la politique de sécurité coupe tout
réseau, et dans un Worker qu'on arrête s'il ne répond plus (`site/src/bac*.js`). Le serveur refait les vérifications
statiques (`api/propositions.php`). Comme un effet fusionné tourne ensuite sur le site hors du bac à sable,
`site/src/surete.js` analyse les portées du code (seules quelques globales inoffensives comme `Math` sont permises)
dans le bac à sable et dans la CI, et la politique de sécurité des pages interdit `eval` et `Function`. Page `/fr/moderation/` réservée aux comptes GitHub listés dans `admins`
(par défaut Naod6473) : accepter ouvre une pull request qui ajoute `effets/communaute/<nom>.js` et le numéro suivant
dans `effets/registre.json` ; à la fusion, le site se met à jour. Il faut un jeton GitHub à grain fin (Contents et
Pull requests en écriture sur ce dépôt) en secret `GH_REPO_TOKEN`. La vérification `node tools/check.mjs communaute`
tourne sur chaque pull request (`.github/workflows/verification.yml`).

## Paquet npm

`node tools/paquet.mjs` prépare `paquet/` (moteur, effets, rendus, lecteur). Pour publier : monter la version dans
`package.json`, puis `git tag npm-v<version> && git push origin npm-v<version>` ; `.github/workflows/npm.yml` publie
avec le secret `NPM_TOKEN`.

## Ajouter une langue

Copier `site/i18n/fr.json` vers `site/i18n/<code>.json` et traduire les valeurs ; le build crée `/<code>/`.

## Licence

MIT, voir [LICENSE](LICENSE) et [NOTICE.md](NOTICE.md).
