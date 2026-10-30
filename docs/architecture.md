# Architecture

## Principes

- **Site statique d'abord.** Tout ce qui se calcule à l'avance (pages, index de recherche, couleurs dominantes) est
  produit par `build.mjs` et servi tel quel. L'hébergement OVH fait 100 Mo, sans MySQL, avec PHP 8.4.
- **Un effet = un fichier, un rendu = un fichier.** Le format des effets est celui de pixelfx. Tous les effets
  dessinent dans le même tampon `{ w, h, ox, oy, color, light }`, et un rendu reçoit ce tampon converti en RGBA
  (contrat dans `rendus/_commun.js`). Ajouter un rendu le rend disponible sur tous les effets.
- **Identifiants stables.** Un effet est identifié par `<catégorie>/<nom>` (ex. `fire/campfire`) ; les URL, les
  cœurs, les commentaires et les liens partagés s'appuient dessus. Ne jamais renommer un effet publié sans redirection.
- **Multilingue.** Une page par langue (`/fr/`, `/en/`), textes dans `site/i18n/<langue>.json`. Les métadonnées des
  effets pourront porter des traductions (`meta.i18n.fr.name`), avec repli sur l'anglais.

## Prévu pour la communauté (pas dans la v1)

La v1 est une vitrine statique. Les points d'accroche sont posés pour ne pas tout reprendre ensuite :

- **API PHP dans `api/`**, servie sur le même domaine, réponses JSON. Stockage dans un fichier SQLite
  `api/donnees/artefacts.sqlite` (dossier interdit au téléchargement, jamais écrasé par le déploiement). Si
  `pdo_sqlite` manque chez OVH, repli sur des fichiers JSON. `GET /api/` donne l'état (version PHP, SQLite, écriture).
- **Tables prévues** : `comptes` (pseudo, e-mail, mot de passe haché, rôle : membre / modérateur), `sessions`,
  `coeurs` (compte, effet), `commentaires` (compte, effet, texte, date, état), `propositions` (compte, code, état :
  en attente / acceptée / refusée, note de relecture), `collections` (filtres sauvegardés et partagés).
- **Partage** : l'URL garde la recherche, les tags, le rendu et l'effet ouvert (`/fr/#fx=fire/campfire&rendu=braille`),
  donc un lien se partage sans compte. Les collections ajoutent des liens courts.
- **Propositions d'effets** : éditeur avec aperçu, tests automatiques côté navigateur (le code se lit, `meta.size` /
  `origin`, `draw` ou `create`, pas de `Math.random` ni `Date`, < 60 Ko, < 8 ms par image), puis relecture par un
  modérateur. Une proposition acceptée devient un fichier `effets/…` dans le repo (commit via l'API GitHub, jeton
  rangé hors du dossier web), et le prochain déploiement la publie.
- **Sécurité** : le code des visiteurs ne tourne que dans un bac à sable (iframe `sandbox` sur un autre sous-domaine,
  ou Web Worker) tant qu'il n'est pas relu. Requêtes préparées PDO, jetons CSRF, limites de débit par IP.

## Vidéos

Pas de vidéos stockées sur OVH (trop lourd pour 100 Mo) : elles se font dans le navigateur (MediaRecorder) à la
demande. Si besoin plus tard, MP4 et GIF générés par GitHub Actions et publiés sur GitHub Releases.
