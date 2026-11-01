<?php
// La page d'un effet (/fr/fx/42/), faite à la demande : .htaccess envoie ici, et build.mjs écrit dans api/fiches/
// le modèle de la page par langue et les valeurs de chaque effet (par paquets de 100). Avant, les 2 000 pages étaient
// des fichiers ; elles ne tenaient plus dans l'hébergement de 100 Mo.
declare(strict_types=1);

$l = (string) ($_GET['l'] ?? '');
$n = (int) ($_GET['n'] ?? 0);
$dossier = __DIR__ . '/fiches/';
if (!preg_match('/^[a-z]{2}$/', $l) || !is_file($dossier . "modele-$l.html")) $l = 'fr';

$valeurs = null;
$paquet = $dossier . $l . '-' . intdiv($n, 100) . '.json';
if ($n > 0 && is_file($paquet)) $valeurs = json_decode((string) file_get_contents($paquet), true)[(string) $n] ?? null;

header('Content-Type: text/html; charset=utf-8');
if (!is_array($valeurs)) {
    http_response_code(404);
    $page404 = __DIR__ . "/../$l/404.html";
    if (is_file($page404)) readfile($page404);
    exit;
}
header('Cache-Control: public, max-age=300');
echo preg_replace_callback('/%%(\w+)%%/', fn($m) => (string) ($valeurs[$m[1]] ?? ''), (string) file_get_contents($dossier . "modele-$l.html"));
