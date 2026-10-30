<?php
// Effets proposés par les membres : envoi, suivi, modération. Accepter une proposition ouvre une pull request sur le
// dépôt GitHub (jeton : secret GH_REPO_TOKEN) ; l'effet arrive sur le site quand elle est fusionnée.
// Chargé par compte.php, qui fournit la base, la session et les réponses JSON.
//
//   POST /api/compte/proposer            {id?, code, credit, nom}   crée, ou met à jour une proposition pas encore acceptée
//   GET  /api/compte/mes-propositions
//   GET  /api/compte/proposition?id=…    la sienne, ou n'importe laquelle pour l'administrateur
//   POST /api/compte/proposition-retirer {id}
//   GET  /api/compte/moderation?filtre=attente|tout     (administrateur)
//   POST /api/compte/moderer             {id, decision: accepter|revoir|refuser, message}   (administrateur)
declare(strict_types=1);

const DEPOT = 'Naod6473/artefacts-fx';
const MAX_CODE = 30000;
const MAX_EN_ATTENTE = 10;
// mêmes règles que le bac à sable (site/src/bac-travailleur.js)
const INTERDITS = '/\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|eval|Function|document|window|globalThis|self|opener|localStorage|sessionStorage|indexedDB|caches|navigator|location|postMessage|setTimeout|setInterval|Worker|SharedArrayBuffer|Atomics|prototype|__proto__)\b|\.\s*constructor\b|["\'`]constructor["\'`]|\bimport\s*\(|\bimport\.meta\b/';

function tablePropositions(): void
{
    global $db;
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS propositions (
          id INTEGER PRIMARY KEY, membre INTEGER NOT NULL, nom TEXT NOT NULL, code TEXT NOT NULL, credit TEXT NOT NULL DEFAULT '',
          statut TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', pr_url TEXT, numero TEXT, chemin TEXT, cree INTEGER NOT NULL, modifie INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS propositions_membre ON propositions (membre);
        CREATE INDEX IF NOT EXISTS propositions_statut ON propositions (statut);
        SQL);
}

function estAdmin(?array $m): bool
{
    global $config;
    if (!$m || empty($m['github_login'])) return false;
    $admins = array_map('strtolower', (array) ($config['admins'] ?? ['naod6473']));
    return in_array(strtolower($m['github_login']), $admins, true);
}

/** Les vérifications que le serveur peut faire sans exécuter le code ; le reste est fait dans le bac à sable. */
function codeValide(string $code): void
{
    if ($code === '' || strlen($code) > MAX_CODE) erreur(400, 'code_taille');
    if (!mb_check_encoding($code, 'UTF-8')) erreur(400, 'code_encodage');
    $sans = preg_replace(['#/\*.*?\*/#s', '#(^|[^:\\\\])//.*$#m'], ['', '$1'], $code);
    if (preg_match(INTERDITS, $sans, $m)) erreur(400, 'code_interdit', $m[0]);
    if (str_contains($sans, 'Math.random')) erreur(400, 'code_interdit', 'Math.random');
    if (!preg_match('/\bexport\s+const\s+meta\s*=\s*\{/', $sans)) erreur(400, 'code_meta');
    if (!preg_match('/\bexport\s+(async\s+)?function\s+(draw|create)\b|\bexport\s+const\s+(draw|create)\b/', $sans)) erreur(400, 'code_draw');
    // un seul import permis : le moteur
    preg_match_all('/\bimport\b[^;\'"]*[\'"]([^\'"]*)[\'"]/', $sans, $imports);
    foreach ($imports[1] as $chemin) if ($chemin !== '../../core/index.js') erreur(400, 'code_import', $chemin);
}

function proposer(): never
{
    global $db, $corps;
    $m = membreOuErreur();
    tablePropositions();
    $code = str_replace("\r\n", "\n", (string) ($corps['code'] ?? ''));
    codeValide($code);
    $nom = trim(preg_replace('/[\x00-\x1f]/', '', couper((string) ($corps['nom'] ?? ''), 0, 40)));
    if ($nom === '') erreur(400, 'nom_vide');
    $credit = creditPropre((string) ($corps['credit'] ?? ''));
    $id = isset($corps['id']) ? (int) $corps['id'] : 0;
    $prevenir = true; // l'administrateur reçoit un mail pour une nouvelle proposition ou une proposition corrigée
    if ($id) {
        $avant = $db->prepare('SELECT statut FROM propositions WHERE id = ? AND membre = ?');
        $avant->execute([$id, $m['id']]);
        $prevenir = $avant->fetchColumn() === 'a_revoir';
        $u = $db->prepare("UPDATE propositions SET nom = ?, code = ?, credit = ?, statut = 'attente', modifie = ? WHERE id = ? AND membre = ? AND statut IN ('attente', 'a_revoir')");
        $u->execute([$nom, $code, $credit, time(), $id, $m['id']]);
        if (!$u->rowCount()) erreur(404, 'proposition_inconnue');
    } else {
        limiter('proposer:' . $m['id'], 20, 86400);
        $n = $db->prepare("SELECT COUNT(*) FROM propositions WHERE membre = ? AND statut IN ('attente', 'a_revoir')");
        $n->execute([$m['id']]);
        if ($n->fetchColumn() >= MAX_EN_ATTENTE) erreur(400, 'trop_de_propositions');
        $db->prepare("INSERT INTO propositions (membre, nom, code, credit, statut, cree, modifie) VALUES (?, ?, ?, ?, 'attente', ?, ?)")
            ->execute([$m['id'], $nom, $code, $credit, time(), time()]);
        $id = (int) $db->lastInsertId();
    }
    if ($prevenir) prevenirAdmins($nom);
    repondre(['ok' => true, 'id' => $id]);
}

function mesPropositions(): never
{
    global $db;
    $m = membreOuErreur();
    tablePropositions();
    $s = $db->prepare("SELECT id, nom, statut, message, pr_url, numero, modifie FROM propositions WHERE membre = ? AND statut != 'retiree' ORDER BY modifie DESC");
    $s->execute([$m['id']]);
    repondre(['propositions' => array_map('ligneProposition', $s->fetchAll())]);
}

function proposition(): never
{
    global $db;
    $m = membreOuErreur();
    tablePropositions();
    $s = $db->prepare('SELECT p.*, m.email, m.github_login FROM propositions p JOIN membres m ON m.id = p.membre WHERE p.id = ?');
    $s->execute([(int) ($_GET['id'] ?? 0)]);
    $p = $s->fetch();
    $admin = estAdmin($m);
    if (!$p || ((int) $p['membre'] !== (int) $m['id'] && !$admin)) erreur(404, 'proposition_inconnue');
    $r = ligneProposition($p) + ['code' => $p['code'], 'credit' => $p['credit']];
    // l'administrateur voit qui a envoyé (pour répondre) ; ce n'est jamais publié
    if ($admin) $r['auteur'] = $p['github_login'] ? 'GitHub @' . $p['github_login'] : (string) $p['email'];
    repondre($r);
}

function propositionRetirer(): never
{
    global $db, $corps;
    $m = membreOuErreur();
    tablePropositions();
    $db->prepare("UPDATE propositions SET statut = 'retiree', modifie = ? WHERE id = ? AND membre = ? AND statut IN ('attente', 'a_revoir')")
        ->execute([time(), (int) ($corps['id'] ?? 0), $m['id']]);
    repondre(['ok' => true]);
}

function moderation(): never
{
    global $db, $config;
    if (!estAdmin(membreOuErreur())) erreur(403, 'reserve');
    tablePropositions();
    $tout = ($_GET['filtre'] ?? '') === 'tout';
    $s = $db->query('SELECT id, nom, statut, message, pr_url, numero, modifie FROM propositions '
        . ($tout ? "WHERE statut != 'retiree' ORDER BY modifie DESC LIMIT 200" : "WHERE statut = 'attente' ORDER BY modifie"));
    repondre(['propositions' => array_map('ligneProposition', $s->fetchAll()), 'jeton' => !empty($config['github_depot'])]);
}

function moderer(): never
{
    global $db, $corps;
    if (!estAdmin(membreOuErreur())) erreur(403, 'reserve');
    tablePropositions();
    $s = $db->prepare('SELECT * FROM propositions WHERE id = ?');
    $s->execute([(int) ($corps['id'] ?? 0)]);
    $p = $s->fetch();
    if (!$p || in_array($p['statut'], ['acceptee', 'retiree'], true)) erreur(404, 'proposition_inconnue');
    $message = trim(couper((string) ($corps['message'] ?? ''), 0, 1000));
    $decision = (string) ($corps['decision'] ?? '');
    if ($decision === 'revoir' || $decision === 'refuser') {
        $statut = $decision === 'revoir' ? 'a_revoir' : 'refusee';
        $db->prepare('UPDATE propositions SET statut = ?, message = ?, modifie = ? WHERE id = ?')
            ->execute([$statut, $message, time(), $p['id']]);
        prevenirAuteur($p, $statut, $message);
        repondre(['ok' => true]);
    }
    if ($decision !== 'accepter') erreur(400, 'decision');
    codeValide($p['code']);
    [$url, $numero, $chemin] = ouvrirPullRequest($p);
    $db->prepare("UPDATE propositions SET statut = 'acceptee', message = ?, pr_url = ?, numero = ?, chemin = ?, modifie = ? WHERE id = ?")
        ->execute([$message, $url, $numero, $chemin, time(), $p['id']]);
    prevenirAuteur($p, 'acceptee', $message);
    repondre(['ok' => true, 'pr_url' => $url, 'numero' => $numero]);
}

// ---------- mails ----------
// un mail qui ne part pas ne bloque rien : l'échec va au journal et la page reste à jour

function prevenirAdmins(string $nom): void
{
    global $db, $config;
    $admins = array_map('strtolower', (array) ($config['admins'] ?? ['naod6473']));
    $s = $db->prepare('SELECT email, langue FROM membres WHERE email IS NOT NULL AND lower(github_login) IN (' . implode(',', array_fill(0, count($admins), '?')) . ')');
    $s->execute($admins);
    foreach ($s->fetchAll() as $a) {
        try {
            envoyer($a['email'], 'proposition', SITE . '/' . $a['langue'] . '/moderation/', $nom, '', $a['langue']);
        } catch (Throwable $e) {
            journal('mail admin : ' . $e->getMessage());
        }
    }
}

function prevenirAuteur(array $p, string $statut, string $message): void
{
    global $db;
    $s = $db->prepare('SELECT email, langue FROM membres WHERE id = ?');
    $s->execute([$p['membre']]);
    $a = $s->fetch();
    if (!$a || !$a['email']) return; // compte GitHub sans e-mail : la réponse reste visible sur la page
    try {
        envoyer($a['email'], $statut, SITE . '/' . $a['langue'] . '/proposer/', $p['nom'], $message, $a['langue']);
    } catch (Throwable $e) {
        journal('mail auteur : ' . $e->getMessage());
    }
}

function ligneProposition(array $p): array
{
    return ['id' => (int) $p['id'], 'nom' => $p['nom'], 'statut' => $p['statut'], 'message' => $p['message'], 'pr_url' => $p['pr_url'], 'numero' => $p['numero'], 'modifie' => (int) $p['modifie']];
}

// ---------- GitHub ----------

/**
 * Une branche proposition-<id> avec effets/communaute/<nom>.js et le numéro suivant dans effets/registre.json,
 * puis la pull request vers main. Rend [url, numéro, chemin de l'effet].
 */
function ouvrirPullRequest(array $p): array
{
    global $db, $config;
    $jeton = (string) ($config['github_depot'] ?? '');
    if ($jeton === '') erreur(503, 'jeton_github_absent');

    [$st, $ref] = gh($jeton, 'GET', '/git/ref/heads/main');
    if ($st !== 200) erreur(502, 'github', "ref main $st");
    $base = $ref['object']['sha'];

    [$st, $reg] = gh($jeton, 'GET', '/contents/effets/registre.json?ref=main');
    if ($st !== 200) erreur(502, 'github', "registre $st");
    $registre = json_decode(base64_decode($reg['content']), true);
    // le numéro suit le dernier du registre et ceux déjà donnés à d'autres pull requests pas encore fusionnées
    $dernier = max(array_map('intval', array_keys($registre)));
    $pris = (int) $db->query('SELECT MAX(CAST(numero AS INTEGER)) FROM propositions')->fetchColumn();
    $numero = str_pad((string) (max($dernier, $pris) + 1), 4, '0', STR_PAD_LEFT);

    // nom de fichier libre : pulse-orb, sinon pulse-orb-2…
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(function_exists('iconv') ? (string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $p['nom']) : $p['nom'])), '-') ?: 'effet';
    $slug = substr($slug, 0, 40);
    $chemin = "communaute/$slug";
    for ($i = 2; in_array($chemin, $registre, true) || gh($jeton, 'GET', "/contents/effets/$chemin.js?ref=main")[0] === 200; $i++) $chemin = "communaute/$slug-$i";
    $registre[$numero] = $chemin;
    ksort($registre, SORT_STRING);

    $branche = 'proposition-' . $p['id'];
    [$st] = gh($jeton, 'POST', '/git/refs', ['ref' => "refs/heads/$branche", 'sha' => $base]);
    if ($st === 422) { // la branche existe déjà (essai précédent interrompu) : on la remet sur main
        [$st] = gh($jeton, 'PATCH', "/git/refs/heads/$branche", ['sha' => $base, 'force' => true]);
    }
    if ($st !== 201 && $st !== 200) erreur(502, 'github', "branche $st");

    $credit = creditPropre($p['credit']); // de nouveau : les propositions enregistrées avant la liste blanche
    $code = codePublie($p['code'], $credit);
    [$st] = gh($jeton, 'PUT', "/contents/effets/$chemin.js", [
        'message' => "Effet proposé : {$p['nom']}", 'content' => base64_encode($code), 'branch' => $branche,
    ]);
    if ($st !== 201) erreur(502, 'github', "fichier $st");
    [$st] = gh($jeton, 'PUT', '/contents/effets/registre.json', [
        'message' => "Registre : #$numero $chemin", 'content' => base64_encode(registreJson($registre)),
        'sha' => $reg['sha'], 'branch' => $branche,
    ]);
    if ($st !== 200 && $st !== 201) erreur(502, 'github', "registre $st");

    $par = $credit !== '' ? "par **" . str_replace(['*', '_', '[', ']'], '', $credit) . "**" : "par un membre (non signé)";
    [$st, $pr] = gh($jeton, 'POST', '/pulls', [
        'title' => "Effet proposé : {$p['nom']} (#$numero)",
        'head' => $branche,
        'base' => 'main',
        'body' => "Effet proposé sur naod.fr $par, accepté en modération.\n\n"
            . "- fichier : `effets/$chemin.js`\n- numéro : #$numero\n- licence : MIT (case cochée par l'auteur à l'envoi)\n\n"
            . "Le site se met à jour tout seul quand cette pull request est fusionnée. La vérification `node tools/check.mjs communaute` tourne sur la pull request.",
    ]);
    if ($st !== 201) erreur(502, 'github', "pull request $st");
    return [(string) $pr['html_url'], $numero, $chemin];
}

/** Même mise en forme que tools/index.mjs (deux espaces), pour que la pull request ne change qu'une ligne. */
function registreJson(array $registre): string
{
    $lignes = [];
    foreach ($registre as $n => $id) $lignes[] = '  ' . json_encode((string) $n) . ': ' . json_encode($id, JSON_UNESCAPED_SLASHES);
    return "{\n" . implode(",\n", $lignes) . "\n}\n";
}

/**
 * Le crédit finit dans un commentaire du fichier publié : lettres, chiffres, espace et . _ @ ' - seulement. Une liste
 * blanche, parce qu'un caractère comme U+2028 termine un commentaire JS et ferait du crédit du code exécuté sur le site.
 */
function creditPropre(string $credit): string
{
    return trim(preg_replace('/\s+/u', ' ', preg_replace("/[^\\p{L}\\p{N} ._@'-]/u", '', couper($credit, 0, 60)) ?? ''));
}

/** Le code tel qu'il entre dans le dépôt : un en-tête de crédit et de licence, et author dans meta si l'auteur signe. */
function codePublie(string $code, string $credit): string
{
    $tete = "// Proposé sur naod.fr" . ($credit !== '' ? " par $credit" : '') . ". Licence MIT, voir LICENSE.\n";
    if ($credit !== '') $code = preg_replace('/\bexport\s+const\s+meta\s*=\s*\{/', '$0' . "\n  author: " . json_encode($credit, JSON_UNESCAPED_UNICODE) . ',', $code, 1);
    return $tete . rtrim($code) . "\n";
}

/** Appel à l'API GitHub du dépôt. Rend [statut HTTP, réponse décodée]. */
function gh(string $jeton, string $methode, string $chemin, ?array $donnees = null): array
{
    $options = [
        'method' => $methode,
        'header' => "Accept: application/vnd.github+json\r\nAuthorization: Bearer $jeton\r\nUser-Agent: Artefacts\r\nX-GitHub-Api-Version: 2022-11-28\r\n",
        'timeout' => 15,
        'ignore_errors' => true,
    ];
    if ($donnees !== null) {
        $options['header'] .= "Content-Type: application/json\r\n";
        $options['content'] = json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $url = 'https://api.github.com/repos/' . DEPOT . $chemin;
    if ($f = getenv('ARTEFACTS_GITHUB')) $url = $f . $chemin; // essais en local : un faux GitHub
    $r = @file_get_contents($url, false, stream_context_create(['http' => $options]));
    $statut = (int) substr($http_response_header[0] ?? '', 9, 3);
    if ($statut >= 300 && $statut !== 404) journal("github $methode $chemin $statut : " . substr((string) $r, 0, 300));
    return [$statut, $r === false ? null : json_decode($r, true)];
}
