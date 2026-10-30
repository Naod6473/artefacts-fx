# Artefacts

Des effets visuels de jeu écrits en code, à voir dans le rendu de son choix. Site : https://naod.fr

*Game visual effects written in code, shown in the style you pick.*

Chaque effet est un petit fichier JavaScript, sans image, sous licence MIT. Le même effet s'affiche en pixel art, en
glyphes de code, en ASCII, en braille, en blocs ou sur un écran à phosphore. <!-- count -->232<!-- /count --> effets au
départ, repris de [pixelfx](https://github.com/patch-gg/pixelfx).

## Arborescence

| Dossier | Contenu |
| --- | --- |
| `effets/<catégorie>/<nom>.js` | un effet = un fichier : `meta` + `draw(p, t, o)` ou `create(o)` (format pixelfx) |
| `rendus/<id>.js` | un rendu = un filtre sur le tampon de pixels ; un nouveau rendu marche sur tous les effets |
| `core/` | le moteur : tampon, pinceau, particules, couleurs (pixelfx) |
| `site/` | le site : pages (`pages/`), textes par langue (`i18n/`), scripts (`src/`), fichiers statiques (`static/`) |
| `api/` | la partie communauté en PHP + SQLite (à venir), avec un test de santé sur `/api/` |
| `config/ovh.json` | réglages de la mise en ligne (dossier sur le FTP, adresse du site) |
| `tools/` | `check.mjs` vérifie les effets, `index.mjs` régénère `effets/index.js` |
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
statiques (`api/propositions.php`). Page `/fr/moderation/` réservée aux comptes GitHub listés dans `admins`
(par défaut Naod6473) : accepter ouvre une pull request qui ajoute `effets/communaute/<nom>.js` et le numéro suivant
dans `effets/registre.json` ; à la fusion, le site se met à jour. Il faut un jeton GitHub à grain fin (Contents et
Pull requests en écriture sur ce dépôt) en secret `GH_REPO_TOKEN`. La vérification `node tools/check.mjs communaute`
tourne sur chaque pull request (`.github/workflows/verification.yml`).

## Ajouter une langue

Copier `site/i18n/fr.json` vers `site/i18n/<code>.json` et traduire les valeurs ; le build crée `/<code>/`.

## Licence

MIT, voir [LICENSE](LICENSE) et [NOTICE.md](NOTICE.md).
