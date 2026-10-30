<?php
// Comptes membres : inscription par e-mail ou GitHub, favoris et projets synchronisés. Tout est privé :
// aucun profil n'est visible par les autres. Base : api/donnees/comptes.sqlite (jamais écrasée au déploiement).
//
//   GET  /api/compte/moi                        { connecte, email, github, favoris:[n], projets:[…] }
//   POST /api/compte/inscription  {email, mdp, langue}   e-mail de confirmation (lien valable 2 jours)
//   GET  /api/compte/confirmer?j=…              confirme l'adresse, connecte, renvoie vers la bibliothèque
//   POST /api/compte/connexion    {email, mdp}
//   POST /api/compte/deconnexion
//   POST /api/compte/oubli        {email, langue}        e-mail avec un lien (valable 1 heure)
//   POST /api/compte/reinitialiser {j, mdp}
//   GET  /api/compte/github                     part chez GitHub, qui revient sur la même adresse avec ?code=…
//   POST /api/compte/favoris      {favoris:[n]}          remplace la liste
//   POST /api/compte/projet       {id?, nom, effets:[{n, rendu, note}]}   crée ou remplace un projet
//   POST /api/compte/projet-supprimer {id}
//   POST /api/compte/supprimer-compte {mdp?}            efface le membre et toutes ses données
//
// Réglages secrets (GitHub) : api/donnees/config.php, écrit au déploiement à partir des secrets du repo.
declare(strict_types=1);

const SITE = 'https://naod.fr';
const EXPEDITEUR = 'noreply@naod.fr';
const DUREE_SESSION = 60 * 86400;
const COOKIE = 'art_s';
const MAX_PROJETS = 100, MAX_EFFETS = 400, MAX_FAVORIS = 2000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// la réponse est toujours du JSON : un avertissement PHP affiché casserait la page ; les erreurs vont dans
// api/donnees/erreurs.log (jamais servi) et le navigateur reçoit { erreur: "serveur" } avec la cause courte
ini_set('display_errors', '0');
set_error_handler(function (int $niveau, string $message, string $fichier, int $ligne): bool {
    journal("$message ($ligne)");
    return true;
});
set_exception_handler(function (Throwable $e): void {
    journal(get_class($e) . ': ' . $e->getMessage() . ' (' . $e->getLine() . ')');
    http_response_code(500);
    echo json_encode(['ok' => false, 'erreur' => 'serveur', 'detail' => get_class($e) . ' ligne ' . $e->getLine()]);
});
function journal(string $texte): void
{
    @file_put_contents(__DIR__ . '/donnees/erreurs.log', date('c') . ' ' . ($GLOBALS['action'] ?? '') . ' ' . $texte . "\n", FILE_APPEND);
}

$config = is_file(__DIR__ . '/donnees/config.php') ? (array) require __DIR__ . '/donnees/config.php' : [];
$methode = $_SERVER['REQUEST_METHOD'];
// /api/compte/moi : réécrit en compte.php?a=moi par api/.htaccess, ou servi par Apache (MultiViews, chez OVH) avec PATH_INFO=/moi
$action = (string) ($_GET['a'] ?? trim((string) ($_SERVER['PATH_INFO'] ?? ''), '/'));

// une écriture doit venir du site lui-même : JSON (pas de formulaire d'un autre site) et même origine si le navigateur l'indique
if ($methode === 'POST') {
    if (!str_starts_with((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) erreur(415, 'json_attendu');
    $origine = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origine !== '' && preg_replace('#^https?://#', '', $origine) !== ($_SERVER['HTTP_HOST'] ?? '')) erreur(403, 'origine');
    $corps = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($corps)) erreur(400, 'json_invalide');
} elseif ($methode !== 'GET') {
    erreur(405, 'methode');
} else {
    $corps = [];
}

$db = base();
$langue = in_array($corps['langue'] ?? '', ['fr', 'en'], true) ? $corps['langue'] : langueNavigateur();

match ("$methode $action") {
    'GET moi' => moi(),
    'POST inscription' => inscription(),
    'GET confirmer' => confirmer(),
    'POST connexion' => connexion(),
    'POST deconnexion' => deconnexion(),
    'POST oubli' => oubli(),
    'POST reinitialiser' => reinitialiser(),
    'GET github' => github(),
    'POST favoris' => favoris(),
    'POST projet' => projet(),
    'POST projet-supprimer' => projetSupprimer(),
    'POST supprimer-compte' => supprimerCompte(),
    default => erreur(404, 'action_inconnue'),
};

// ---------- actions ----------

function moi(): never
{
    $m = membre();
    if (!$m) repondre(['connecte' => false]);
    global $db;
    $fav = $db->prepare('SELECT n FROM favoris WHERE membre = ? ORDER BY t');
    $fav->execute([$m['id']]);
    $pr = $db->prepare('SELECT id, nom, effets, modifie FROM projets WHERE membre = ? ORDER BY modifie DESC');
    $pr->execute([$m['id']]);
    $projets = array_map(fn ($p) => ['id' => (int) $p['id'], 'nom' => $p['nom'], 'effets' => json_decode($p['effets'], true), 'modifie' => (int) $p['modifie']], $pr->fetchAll());
    repondre([
        'connecte' => true,
        'email' => $m['email'],
        'github' => $m['github_login'],
        'mdp' => $m['mdp'] !== null,
        'favoris' => $fav->fetchAll(PDO::FETCH_COLUMN),
        'projets' => $projets,
    ]);
}

function inscription(): never
{
    global $db, $corps, $langue;
    $email = emailValide($corps['email'] ?? '');
    $mdp = mdpValide($corps['mdp'] ?? '');
    limiter('inscription:' . ip(), 10, 3600);
    limiter('inscription:' . $email, 3, 3600);
    $m = $db->prepare('SELECT * FROM membres WHERE email = ?');
    $m->execute([$email]);
    $m = $m->fetch();
    // même réponse que l'adresse soit libre ou non : personne ne peut savoir qui est inscrit
    if (!$m) {
        $db->prepare('INSERT INTO membres (email, mdp, langue, cree) VALUES (?, ?, ?, ?)')
            ->execute([$email, password_hash($mdp, PASSWORD_DEFAULT), $langue, time()]);
        $id = (int) $db->lastInsertId();
    } elseif (!$m['confirme']) {
        $db->prepare('UPDATE membres SET mdp = ?, langue = ? WHERE id = ?')->execute([password_hash($mdp, PASSWORD_DEFAULT), $langue, $m['id']]);
        $id = (int) $m['id'];
    } else {
        repondre(['ok' => true]);
    }
    $j = jeton($id, 'confirmer', 2 * 86400);
    envoyer($email, 'confirmer', SITE . '/api/compte/confirmer?j=' . $j);
    repondre(['ok' => true]);
}

function confirmer(): never
{
    global $db;
    $id = utiliserJeton((string) ($_GET['j'] ?? ''), 'confirmer');
    if ($id === null) rediriger('compte=lien_expire');
    $db->prepare('UPDATE membres SET confirme = 1 WHERE id = ?')->execute([$id]);
    ouvrirSession($id);
    rediriger('compte=bienvenue');
}

function connexion(): never
{
    global $db, $corps;
    $email = emailValide($corps['email'] ?? '');
    limiter('connexion:' . ip(), 20, 900);
    limiter('connexion:' . $email, 8, 900);
    $m = $db->prepare('SELECT * FROM membres WHERE email = ?');
    $m->execute([$email]);
    $m = $m->fetch();
    if (!$m || $m['mdp'] === null || !password_verify((string) ($corps['mdp'] ?? ''), $m['mdp'])) erreur(401, 'identifiants');
    if (!$m['confirme']) erreur(403, 'non_confirme');
    if (password_needs_rehash($m['mdp'], PASSWORD_DEFAULT)) {
        $db->prepare('UPDATE membres SET mdp = ? WHERE id = ?')->execute([password_hash($corps['mdp'], PASSWORD_DEFAULT), $m['id']]);
    }
    ouvrirSession((int) $m['id']);
    repondre(['ok' => true]);
}

function deconnexion(): never
{
    global $db;
    if (isset($_COOKIE[COOKIE])) $db->prepare('DELETE FROM sessions WHERE jeton = ?')->execute([hash('sha256', (string) $_COOKIE[COOKIE])]);
    poserCookie('', 1);
    repondre(['ok' => true]);
}

function oubli(): never
{
    global $db, $corps, $langue;
    $email = emailValide($corps['email'] ?? '');
    limiter('oubli:' . ip(), 10, 3600);
    limiter('oubli:' . $email, 3, 3600);
    $m = $db->prepare('SELECT id FROM membres WHERE email = ?');
    $m->execute([$email]);
    if ($id = $m->fetchColumn()) {
        $j = jeton((int) $id, 'mdp', 3600);
        envoyer($email, 'oubli', SITE . '/' . $langue . '/bibliotheque/#compte=nouveau_mdp&j=' . $j);
    }
    repondre(['ok' => true]);
}

function reinitialiser(): never
{
    global $db, $corps;
    $mdp = mdpValide($corps['mdp'] ?? '');
    $id = utiliserJeton((string) ($corps['j'] ?? ''), 'mdp');
    if ($id === null) erreur(400, 'lien_expire');
    // le lien est arrivé dans la boîte mail : l'adresse est donc confirmée
    $db->prepare('UPDATE membres SET mdp = ?, confirme = 1 WHERE id = ?')->execute([password_hash($mdp, PASSWORD_DEFAULT), $id]);
    $db->prepare('DELETE FROM sessions WHERE membre = ?')->execute([$id]);
    ouvrirSession($id);
    repondre(['ok' => true]);
}

function github(): never
{
    global $db, $config;
    $client = $config['github_id'] ?? '';
    $secret = $config['github_secret'] ?? '';
    if ($client === '' || $secret === '') rediriger('compte=github_indisponible');
    $retour = SITE . '/api/compte/github';

    if (!isset($_GET['code'])) {
        $etat = bin2hex(random_bytes(16));
        setcookie('art_gh', $etat, ['expires' => time() + 600, 'path' => '/api/compte/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
        header('Location: https://github.com/login/oauth/authorize?' . http_build_query([
            'client_id' => $client, 'redirect_uri' => $retour, 'scope' => 'user:email', 'state' => $etat, 'allow_signup' => 'true',
        ]));
        exit;
    }
    $etat = (string) ($_COOKIE['art_gh'] ?? '');
    setcookie('art_gh', '', ['expires' => 1, 'path' => '/api/compte/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    if ($etat === '' || !hash_equals($etat, (string) ($_GET['state'] ?? ''))) rediriger('compte=github_refuse');

    $t = http('https://github.com/login/oauth/access_token', [
        'client_id' => $client, 'client_secret' => $secret, 'code' => (string) $_GET['code'], 'redirect_uri' => $retour,
    ]);
    $acces = $t['access_token'] ?? null;
    if (!$acces) rediriger('compte=github_refuse');
    $u = http('https://api.github.com/user', null, $acces);
    if (!isset($u['id'])) rediriger('compte=github_refuse');
    $email = null;
    foreach ((array) http('https://api.github.com/user/emails', null, $acces) as $e) {
        if (!empty($e['verified']) && !empty($e['primary'])) $email = strtolower((string) $e['email']);
    }

    $m = $db->prepare('SELECT id FROM membres WHERE github_id = ?');
    $m->execute([(int) $u['id']]);
    $id = $m->fetchColumn();
    if (!$id && $email) {
        // même adresse vérifiée chez GitHub qu'un compte e-mail : c'est la même personne, on relie les deux
        $m = $db->prepare('SELECT id FROM membres WHERE email = ?');
        $m->execute([$email]);
        $id = $m->fetchColumn();
        if ($id) $db->prepare('UPDATE membres SET github_id = ?, confirme = 1 WHERE id = ?')->execute([(int) $u['id'], $id]);
    }
    if (!$id) {
        $db->prepare('INSERT INTO membres (email, github_id, confirme, langue, cree) VALUES (?, ?, 1, ?, ?)')
            ->execute([$email, (int) $u['id'], langueNavigateur(), time()]);
        $id = $db->lastInsertId();
    }
    $db->prepare('UPDATE membres SET github_login = ? WHERE id = ?')->execute([(string) ($u['login'] ?? ''), $id]);
    ouvrirSession((int) $id);
    rediriger('compte=bienvenue');
}

function favoris(): never
{
    global $db, $corps;
    $m = membreOuErreur();
    $liste = nombres($corps['favoris'] ?? null, MAX_FAVORIS);
    $db->beginTransaction();
    $db->prepare('DELETE FROM favoris WHERE membre = ?')->execute([$m['id']]);
    $ins = $db->prepare('INSERT OR IGNORE INTO favoris (membre, n, t) VALUES (?, ?, ?)');
    foreach ($liste as $i => $n) $ins->execute([$m['id'], $n, $i]);
    $db->commit();
    repondre(['ok' => true]);
}

function projet(): never
{
    global $db, $corps;
    $m = membreOuErreur();
    $nom = trim(couper((string) ($corps['nom'] ?? ''), 0, 80));
    if ($nom === '') erreur(400, 'nom_vide');
    $effets = $corps['effets'] ?? null;
    if (!is_array($effets) || count($effets) > MAX_EFFETS) erreur(400, 'effets');
    $propres = [];
    foreach ($effets as $e) {
        $n = (string) ($e['n'] ?? '');
        if (!preg_match('/^\d{4}$/', $n)) erreur(400, 'effets');
        $propres[] = ['n' => $n, 'rendu' => preg_replace('/[^a-z0-9-]/', '', (string) ($e['rendu'] ?? '')), 'note' => couper((string) ($e['note'] ?? ''), 0, 500)];
    }
    $id = isset($corps['id']) ? (int) $corps['id'] : null;
    if ($id) {
        $u = $db->prepare('UPDATE projets SET nom = ?, effets = ?, modifie = ? WHERE id = ? AND membre = ?');
        $u->execute([$nom, json_encode($propres), time(), $id, $m['id']]);
        if (!$u->rowCount()) erreur(404, 'projet_inconnu');
    } else {
        $nb = $db->prepare('SELECT COUNT(*) FROM projets WHERE membre = ?');
        $nb->execute([$m['id']]);
        if ($nb->fetchColumn() >= MAX_PROJETS) erreur(400, 'trop_de_projets');
        $db->prepare('INSERT INTO projets (membre, nom, effets, cree, modifie) VALUES (?, ?, ?, ?, ?)')
            ->execute([$m['id'], $nom, json_encode($propres), time(), time()]);
        $id = (int) $db->lastInsertId();
    }
    repondre(['ok' => true, 'id' => $id]);
}

function projetSupprimer(): never
{
    global $db, $corps;
    $m = membreOuErreur();
    $db->prepare('DELETE FROM projets WHERE id = ? AND membre = ?')->execute([(int) ($corps['id'] ?? 0), $m['id']]);
    repondre(['ok' => true]);
}

function supprimerCompte(): never
{
    global $db, $corps;
    $m = membreOuErreur();
    // compte avec mot de passe : on le redemande ; compte GitHub seul : la session suffit
    if ($m['mdp'] !== null && !password_verify((string) ($corps['mdp'] ?? ''), $m['mdp'])) erreur(401, 'identifiants');
    foreach (['favoris', 'projets', 'sessions', 'jetons'] as $table) $db->prepare("DELETE FROM $table WHERE membre = ?")->execute([$m['id']]);
    $db->prepare('DELETE FROM membres WHERE id = ?')->execute([$m['id']]);
    poserCookie('', 1);
    repondre(['ok' => true]);
}

// ---------- outils ----------

function base(): PDO
{
    $db = new PDO('sqlite:' . __DIR__ . '/donnees/comptes.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS membres (
          id INTEGER PRIMARY KEY, email TEXT UNIQUE, mdp TEXT, confirme INTEGER NOT NULL DEFAULT 0,
          github_id INTEGER UNIQUE, github_login TEXT, langue TEXT NOT NULL DEFAULT 'fr', cree INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (jeton TEXT PRIMARY KEY, membre INTEGER NOT NULL, expire INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS jetons (jeton TEXT PRIMARY KEY, membre INTEGER NOT NULL, type TEXT NOT NULL, expire INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS favoris (membre INTEGER NOT NULL, n TEXT NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (membre, n));
        CREATE TABLE IF NOT EXISTS projets (id INTEGER PRIMARY KEY, membre INTEGER NOT NULL, nom TEXT NOT NULL, effets TEXT NOT NULL,
          cree INTEGER NOT NULL, modifie INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS projets_membre ON projets (membre);
        CREATE TABLE IF NOT EXISTS essais (cle TEXT NOT NULL, t INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS essais_cle ON essais (cle, t);
        SQL);
    return $db;
}

function membre(): ?array
{
    global $db;
    $c = (string) ($_COOKIE[COOKIE] ?? '');
    if ($c === '') return null;
    $s = $db->prepare('SELECT m.*, s.expire FROM sessions s JOIN membres m ON m.id = s.membre WHERE s.jeton = ? AND s.expire > ?');
    $s->execute([hash('sha256', $c), time()]);
    $m = $s->fetch();
    if (!$m) return null;
    // session prolongée à l'usage, au plus une fois par jour
    if ($m['expire'] - time() < DUREE_SESSION - 86400) {
        $db->prepare('UPDATE sessions SET expire = ? WHERE jeton = ?')->execute([time() + DUREE_SESSION, hash('sha256', $c)]);
        poserCookie($c, time() + DUREE_SESSION);
    }
    return $m;
}

function membreOuErreur(): array
{
    return membre() ?? erreur(401, 'non_connecte');
}

function ouvrirSession(int $id): void
{
    global $db;
    $c = bin2hex(random_bytes(32));
    $db->prepare('INSERT INTO sessions (jeton, membre, expire) VALUES (?, ?, ?)')->execute([hash('sha256', $c), $id, time() + DUREE_SESSION]);
    $db->prepare('DELETE FROM sessions WHERE expire < ?')->execute([time()]);
    poserCookie($c, time() + DUREE_SESSION);
}

function poserCookie(string $valeur, int $expire): void
{
    setcookie(COOKIE, $valeur, ['expires' => $expire, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
}

/** Jeton à usage unique envoyé par e-mail ; seule son empreinte est gardée. */
function jeton(int $membre, string $type, int $duree): string
{
    global $db;
    $j = bin2hex(random_bytes(24));
    $db->prepare('DELETE FROM jetons WHERE membre = ? AND type = ?')->execute([$membre, $type]);
    $db->prepare('INSERT INTO jetons (jeton, membre, type, expire) VALUES (?, ?, ?, ?)')->execute([hash('sha256', $j), $membre, $type, time() + $duree]);
    return $j;
}

function utiliserJeton(string $j, string $type): ?int
{
    global $db;
    if (!preg_match('/^[0-9a-f]{48}$/', $j)) return null;
    $s = $db->prepare('SELECT membre FROM jetons WHERE jeton = ? AND type = ? AND expire > ?');
    $s->execute([hash('sha256', $j), $type, time()]);
    $id = $s->fetchColumn();
    $db->prepare('DELETE FROM jetons WHERE jeton = ?')->execute([hash('sha256', $j)]);
    return $id === false ? null : (int) $id;
}

/** Au plus $max essais par $duree secondes pour une clé (adresse IP, e-mail…). */
function limiter(string $cle, int $max, int $duree): void
{
    global $db;
    $cle = hash('sha256', $cle);
    $db->prepare('DELETE FROM essais WHERE t < ?')->execute([time() - 86400]);
    $n = $db->prepare('SELECT COUNT(*) FROM essais WHERE cle = ? AND t > ?');
    $n->execute([$cle, time() - $duree]);
    if ($n->fetchColumn() >= $max) erreur(429, 'trop_d_essais');
    $db->prepare('INSERT INTO essais (cle, t) VALUES (?, ?)')->execute([$cle, time()]);
}

function emailValide(mixed $e): string
{
    $e = strtolower(trim((string) $e));
    if (strlen($e) > 254 || !filter_var($e, FILTER_VALIDATE_EMAIL)) erreur(400, 'email_invalide');
    return $e;
}

function mdpValide(mixed $m): string
{
    $m = (string) $m;
    if (strlen($m) < 8 || strlen($m) > 200) erreur(400, 'mdp_court');
    return $m;
}

function nombres(mixed $liste, int $max): array
{
    if (!is_array($liste) || count($liste) > $max) erreur(400, 'liste');
    foreach ($liste as $n) if (!is_string($n) || !preg_match('/^\d{4}$/', $n)) erreur(400, 'liste');
    return array_values(array_unique($liste));
}

function ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

function langueNavigateur(): string
{
    return preg_match('/^fr/i', (string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')) ? 'fr' : 'en';
}

function envoyer(string $a, string $modele, string $lien): void
{
    global $langue;
    $textes = [
        'fr' => [
            'confirmer' => ['Confirmez votre compte Artefacts', "Bonjour,\n\nPour activer votre compte Artefacts, ouvrez ce lien (valable 2 jours) :\n\n%s\n\nSi vous n'avez rien demandé, ignorez ce message."],
            'oubli' => ['Nouveau mot de passe Artefacts', "Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n\n%s\n\nSi vous n'avez rien demandé, ignorez ce message : votre mot de passe ne change pas."],
        ],
        'en' => [
            'confirmer' => ['Confirm your Artefacts account', "Hello,\n\nTo activate your Artefacts account, open this link (valid for 2 days):\n\n%s\n\nIf you did not ask for this, ignore this message."],
            'oubli' => ['New Artefacts password', "Hello,\n\nTo choose a new password, open this link (valid for 1 hour):\n\n%s\n\nIf you did not ask for this, ignore this message: your password stays the same."],
        ],
    ];
    [$sujet, $corps] = $textes[$langue][$modele];
    $corps = sprintf($corps, $lien) . "\n\n-- \nArtefacts · " . SITE;
    // essais en local : les e-mails sont écrits dans un fichier au lieu d'être envoyés
    if ($f = getenv('ARTEFACTS_MAILS')) {
        file_put_contents($f, json_encode(['a' => $a, 'sujet' => $sujet, 'corps' => $corps]) . "\n", FILE_APPEND);
        return;
    }
    global $config;
    // par Brevo (API web, clé en secret) en priorité : rien ne dépend des ports SMTP de l'hébergement
    if (!empty($config['brevo_cle'])) {
        brevo($a, $sujet, $corps, $config['brevo_cle']);
        return;
    }
    $sujet = '=?UTF-8?B?' . base64_encode($sujet) . '?=';
    $entetes = "From: Artefacts <" . EXPEDITEUR . ">\r\nDate: " . date('r') . "\r\nMessage-ID: <" . bin2hex(random_bytes(12)) . "@naod.fr>\r\n"
        . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable";
    $corps = quoted_printable_encode(str_replace("\n", "\r\n", $corps));
    // par la boîte noreply@naod.fr (SMTP OVH, mot de passe en secret) ; sinon mail() de l'hébergement
    if (!empty($config['smtp_mdp'])) {
        smtp($a, "To: <$a>\r\nSubject: $sujet\r\n$entetes\r\n\r\n$corps", $config['smtp_mdp'], $config['smtp_hote'] ?? 'ssl://ssl0.ovh.net:465');
    } elseif (!mail($a, $sujet, $corps, $entetes, '-f' . EXPEDITEUR) && !mail($a, $sujet, $corps, $entetes)) {
        journal('mail() a échoué');
    }
}

/** Envoi par l'API transactionnelle de Brevo. L'adresse noreply@naod.fr doit y être un expéditeur validé. */
function brevo(string $a, string $sujet, string $corps, string $cle): bool
{
    $r = @file_get_contents('https://api.brevo.com/v3/smtp/email', false, stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "api-key: $cle\r\nContent-Type: application/json\r\nAccept: application/json\r\n",
        'content' => json_encode([
            'sender' => ['name' => 'Artefacts', 'email' => EXPEDITEUR],
            'to' => [['email' => $a]],
            'subject' => $sujet,
            'textContent' => $corps,
        ]),
        'timeout' => 10,
        'ignore_errors' => true,
    ]]));
    $statut = (int) substr($http_response_header[0] ?? '', 9, 3);
    if ($statut >= 200 && $statut < 300) return true;
    journal("brevo $statut : " . substr((string) $r, 0, 300));
    return false;
}

/** Envoi SMTP minimal (connexion chiffrée, AUTH LOGIN). Les échecs vont au journal, sans le mot de passe. */
function smtp(string $a, string $message, string $mdp, string $hote): bool
{
    $s = @stream_socket_client($hote, $no, $err, 10);
    if (!$s) {
        journal("smtp connexion $hote : $err");
        return false;
    }
    stream_set_timeout($s, 15);
    $etape = function (string $nom, ?string $commande, string $attendu) use ($s): void {
        if ($commande !== null) fwrite($s, $commande . "\r\n");
        $r = '';
        while (($l = fgets($s, 1024)) !== false) {
            $r .= $l;
            if (($l[3] ?? ' ') === ' ') break; // dernière ligne d'une réponse sur plusieurs lignes : « 250 » et non « 250- »
        }
        if (!str_starts_with($r, $attendu)) throw new RuntimeException("smtp $nom : " . trim($r));
    };
    // une ligne qui commence par un point en a deux dans DATA
    $message = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $message));
    try {
        $etape('accueil', null, '220');
        $etape('ehlo', 'EHLO naod.fr', '250');
        $etape('auth', 'AUTH LOGIN', '334');
        $etape('utilisateur', base64_encode(EXPEDITEUR), '334');
        $etape('mot de passe', base64_encode($mdp), '235');
        $etape('expediteur', 'MAIL FROM:<' . EXPEDITEUR . '>', '250');
        $etape('destinataire', "RCPT TO:<$a>", '25');
        $etape('data', 'DATA', '354');
        $etape('envoi', $message . "\r\n.", '250');
        $etape('quit', 'QUIT', '221');
        return true;
    } catch (RuntimeException $e) {
        journal($e->getMessage());
        return false;
    } finally {
        fclose($s);
    }
}

function http(string $url, ?array $post, ?string $acces = null): mixed
{
    $entetes = "Accept: application/json\r\nUser-Agent: Artefacts\r\n";
    if ($acces) $entetes .= "Authorization: Bearer $acces\r\n";
    $options = ['method' => $post ? 'POST' : 'GET', 'header' => $entetes, 'timeout' => 10, 'ignore_errors' => true];
    if ($post) {
        $options['header'] .= "Content-Type: application/x-www-form-urlencoded\r\n";
        $options['content'] = http_build_query($post);
    }
    $r = @file_get_contents($url, false, stream_context_create(['http' => $options]));
    return $r === false ? null : json_decode($r, true);
}

function rediriger(string $hash): never
{
    header('Location: ' . SITE . '/' . langueNavigateur() . '/bibliotheque/#' . $hash);
    exit;
}

function repondre(array $donnees): never
{
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function erreur(int $code, string $raison): never
{
    http_response_code($code);
    repondre(['ok' => false, 'erreur' => $raison]);
}

function couper(string $s, int $debut, int $long): string
{
    return function_exists('mb_substr') ? mb_substr($s, $debut, $long) : substr($s, $debut, $long);
}
