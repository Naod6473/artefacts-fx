<?php
// Serveur MCP d'Artefacts (Model Context Protocol, transport « Streamable HTTP ») : les outils d'IA
// (Claude, Cursor, VS Code…) y cherchent des effets et lisent leur code. Lecture seule, sans compte.
//   POST https://naod.fr/api/mcp   (JSON-RPC 2.0, une requête par appel, réponse en JSON)
// Données : api/catalogue/catalogue.json et api/catalogue/sources/<numéro>.js, produits par build.mjs.
declare(strict_types=1);

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SITE = 'https://naod.fr';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
header('Access-Control-Expose-Headers: Mcp-Session-Id');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // pas de flux SSE : ce serveur ne pousse rien de lui-même
    http_response_code(405);
    header('Allow: POST, OPTIONS');
    header('Content-Type: application/json');
    echo json_encode(['erreur' => 'Serveur MCP : envoyer des requêtes JSON-RPC en POST. Doc : ' . SITE . '/fr/ia/']);
    exit;
}

// au plus 120 requêtes par minute et par IP : de quoi pour un assistant, pas pour vider l'hébergement
try {
    $lim = new PDO('sqlite:' . __DIR__ . '/donnees/mcp.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $lim->exec('CREATE TABLE IF NOT EXISTS appels (cle TEXT NOT NULL, t INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS appels_cle ON appels (cle, t)');
    $cle = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    if (random_int(1, 50) === 1) $lim->prepare('DELETE FROM appels WHERE t < ?')->execute([time() - 60]);
    $n = $lim->prepare('SELECT COUNT(*) FROM appels WHERE cle = ? AND t > ?');
    $n->execute([$cle, time() - 60]);
    if ($n->fetchColumn() >= 120) {
        http_response_code(429);
        header('Retry-After: 60');
        header('Content-Type: application/json');
        echo json_encode(['erreur' => 'Trop de requêtes, réessayer dans une minute.']);
        exit;
    }
    $lim->prepare('INSERT INTO appels (cle, t) VALUES (?, ?)')->execute([$cle, time()]);
} catch (Throwable) {
    // sans SQLite, on sert quand même
}

$requete = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($requete) || ($requete['jsonrpc'] ?? null) !== '2.0' || !isset($requete['method'])) {
    repondre(null, null, ['code' => -32700, 'message' => 'Requête JSON-RPC invalide']);
}
$id = $requete['id'] ?? null;
// une notification (sans id) n'attend pas de réponse
if (!array_key_exists('id', $requete)) { http_response_code(202); exit; }

$params = $requete['params'] ?? [];
switch ($requete['method']) {
    case 'initialize':
        $demandee = $params['protocolVersion'] ?? VERSIONS[0];
        repondre($id, [
            'protocolVersion' => in_array($demandee, VERSIONS, true) ? $demandee : VERSIONS[0],
            'capabilities' => ['tools' => ['listChanged' => false]],
            'serverInfo' => ['name' => 'artefacts', 'title' => 'Artefacts', 'version' => '1.0.0'],
            'instructions' => "Artefacts is a free MIT library of game visual effects written in JavaScript (no images). "
                . "Use search_effects to find effects (English or French words, or a number like 42), then get_effect for the full source code. "
                . "Every effect draws into a pixel buffer; the same effect can be shown in several styles (list_styles).",
        ]);
    case 'ping':
        repondre($id, new stdClass());
    case 'tools/list':
        repondre($id, ['tools' => outils()]);
    case 'tools/call':
        $nom = $params['name'] ?? '';
        $args = $params['arguments'] ?? [];
        try {
            $texte = match ($nom) {
                'search_effects' => chercher((string) ($args['query'] ?? ''), (int) ($args['limit'] ?? 10)),
                'get_effect' => lire((string) ($args['number'] ?? '')),
                'list_styles' => rendus(),
                'list_tags' => tags(),
                default => throw new InvalidArgumentException("Outil inconnu : $nom"),
            };
            repondre($id, ['content' => [['type' => 'text', 'text' => $texte]], 'isError' => false]);
        } catch (InvalidArgumentException $e) {
            repondre($id, ['content' => [['type' => 'text', 'text' => $e->getMessage()]], 'isError' => true]);
        }
    default:
        repondre($id, null, ['code' => -32601, 'message' => 'Méthode inconnue : ' . $requete['method']]);
}

function repondre($id, $resultat, ?array $erreur = null): never
{
    header('Content-Type: application/json; charset=utf-8');
    $r = ['jsonrpc' => '2.0', 'id' => $id];
    if ($erreur) $r['error'] = $erreur; else $r['result'] = $resultat;
    echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function outils(): array
{
    return [
        [
            'name' => 'search_effects',
            'title' => 'Search effects',
            'description' => 'Search the Artefacts library of game visual effects (fire, explosions, lightning, magic, UI, transitions, critters…). '
                . 'Accepts English or French words, an effect number (42 or #0042), and filters: tag:loop, -smoke (exclude), dur:<1 (seconds), color:cyan. '
                . 'Returns one line per effect: number, name, duration, tags and link.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string', 'description' => 'Words and filters, e.g. "fire loop -smoke" or "heal" or "42"'],
                    'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 50, 'default' => 10],
                ],
                'required' => ['query'],
            ],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'get_effect',
            'title' => 'Get an effect',
            'description' => 'Get one effect by its number: description, size, duration, options, and its full JavaScript source code (MIT), plus a usage snippet.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => ['number' => ['type' => 'string', 'description' => 'Effect number, e.g. "42" or "#0042"']],
                'required' => ['number'],
            ],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'list_styles',
            'title' => 'List render styles',
            'description' => 'List the render styles an effect can be shown in (pixel, code glyphs, ASCII, braille…).',
            'inputSchema' => ['type' => 'object', 'properties' => new stdClass()],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'list_tags',
            'title' => 'List tags',
            'description' => 'List the tags used in the library with how many effects carry each, to build better searches.',
            'inputSchema' => ['type' => 'object', 'properties' => new stdClass()],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
    ];
}

function donnees(): array
{
    static $d = null;
    if ($d === null) {
        $d = json_decode((string) file_get_contents(__DIR__ . '/catalogue/catalogue.json'), true);
        if (!is_array($d)) throw new InvalidArgumentException('Catalogue indisponible');
    }
    return $d;
}

function norm(string $s): string
{
    $s = function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    return strtr($s, ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i',
        'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'œ' => 'oe']);
}

function lien(array $e): string { return SITE . '/fx/' . (int) $e['n']; }

function ligne(array $e): string
{
    $boucle = $e['loop'] ? 'loop' : 'one-shot';
    return sprintf('#%s %s (%s) — %ss %s, %d×%d — tags: %s — %s',
        $e['n'], $e['name'], $e['id'], $e['duration'], $boucle, $e['size'][0], $e['size'][1], implode(', ', $e['tags']), lien($e));
}

function chercher(string $q, int $limite): string
{
    $d = donnees();
    $limite = max(1, min(50, $limite));
    $mots = []; $non = []; $tags = []; $dur = null; $couleur = null; $numero = null;
    foreach (preg_split('/\s+/', norm(trim($q)), -1, PREG_SPLIT_NO_EMPTY) as $w) {
        $neg = strlen($w) > 1 && $w[0] === '-';
        if ($neg) $w = substr($w, 1);
        if (preg_match('/^#?(\d{1,4})$/', $w, $m)) $numero = str_pad($m[1], 4, '0', STR_PAD_LEFT);
        elseif (preg_match('/^dur:([<>])(\d+(?:[.,]\d+)?)$/', $w, $m)) $dur = [$m[1], (float) str_replace(',', '.', $m[2])];
        elseif (str_starts_with($w, 'tag:')) { if ($neg) $non[] = substr($w, 4); else $tags[] = substr($w, 4); }
        elseif (preg_match('/^(couleur|color):(\w+)$/', $w, $m)) $couleur = $m[2];
        elseif ($neg) $non[] = $w;
        else $mots[] = $w;
    }
    $COULEURS = ['red' => 'rouge', 'yellow' => 'jaune', 'green' => 'vert', 'blue' => 'bleu', 'purple' => 'violet', 'pink' => 'rose', 'white' => 'blanc', 'grey' => 'gris', 'gray' => 'gris'];
    $res = [];
    foreach ($d['effets'] as $e) {
        if ($numero !== null) { if ($e['n'] === $numero) $res[] = [1000, $e]; continue; }
        $tagsE = array_map('norm', array_merge($e['tags'], $e['tags_fr'], [$e['categorie']]));
        $texte = norm(implode(' ', [$e['name'], $e['id'], $e['desc'], implode(' ', $tagsE), $e['couleur']]));
        if ($dur && !($dur[0] === '<' ? $e['duration'] < $dur[1] : $e['duration'] > $dur[1])) continue;
        if ($couleur && $e['couleur'] !== ($COULEURS[$couleur] ?? $couleur)) continue;
        foreach ($tags as $t) if (!in_array($t, $tagsE, true)) continue 2;
        foreach ($non as $t) if (in_array($t, $tagsE, true) || str_contains($texte, $t)) continue 2;
        $score = 1;
        foreach ($mots as $m) {
            $syn = $d['synonymes'][$m] ?? null;
            if (str_starts_with(norm($e['name']), $m)) $score += 50;
            elseif (in_array($m, $tagsE, true) || ($syn && in_array($syn, $tagsE, true))) $score += 30;
            elseif (str_contains($texte, $m) || ($syn && str_contains($texte, $syn))) $score += 10;
            else continue 2;
        }
        $res[] = [$score, $e];
    }
    usort($res, fn($a, $b) => $b[0] <=> $a[0] ?: strcmp($a[1]['n'], $b[1]['n']));
    if (!$res) return "No effect matches \"$q\". Try fewer words, English or French, or list_tags.";
    $lignes = array_map(fn($r) => ligne($r[1]), array_slice($res, 0, $limite));
    $total = count($res);
    return "$total effect(s) match \"$q\"" . ($total > $limite ? ", showing $limite" : '') . ". Use get_effect with a number for the code.\n\n" . implode("\n", $lignes);
}

function lire(string $numero): string
{
    if (!preg_match('/^#?(\d{1,4})$/', trim($numero), $m)) throw new InvalidArgumentException('Give an effect number, e.g. "42" or "#0042".');
    $n = str_pad($m[1], 4, '0', STR_PAD_LEFT);
    foreach (donnees()['effets'] as $e) {
        if ($e['n'] !== $n) continue;
        $source = (string) file_get_contents(__DIR__ . '/catalogue/sources/' . $n . '.js');
        $usage = "import { createFx, createFrame, composite } from \"artefacts-fx\";\n"
            . "import * as fx from \"artefacts-fx/effets/{$e['id']}.js\";\n\n"
            . "const frame = createFrame({$e['size'][0]}, {$e['size'][1]});\n"
            . "const inst = createFx(fx, { x: {$e['origin'][0]}, y: {$e['origin'][1]}, seed: 1 });\n"
            . "// each frame: inst.update(dt); inst.draw(frame); composite(frame, imageData.data);";
        return ligne($e) . "\n\n" . $e['desc']
            . "\n\nFile: effets/{$e['id']}.js in https://github.com/Naod6473/artefacts-fx (engine in core/, MIT License)."
            . "\n\nUsage:\n```js\n$usage\n```\n\nSource:\n```js\n$source\n```";
    }
    throw new InvalidArgumentException("No effect #$n. Use search_effects to find numbers.");
}

function rendus(): string
{
    $l = array_map(fn($r) => "- {$r['id']}: {$r['nom']['en']} ({$r['nom']['fr']})", donnees()['rendus']);
    return "Render styles (a style is a filter on the effect's pixel buffer, so every style works on every effect):\n" . implode("\n", $l)
        . "\nSee them live: " . SITE . "/en/bibliotheque/#rendu=braille";
}

function tags(): string
{
    $c = [];
    foreach (donnees()['effets'] as $e) foreach ($e['tags'] as $t) $c[$t] = ($c[$t] ?? 0) + 1;
    arsort($c);
    return "Tags (effects):\n" . implode(', ', array_map(fn($t, $n) => "$t ($n)", array_keys($c), $c));
}
