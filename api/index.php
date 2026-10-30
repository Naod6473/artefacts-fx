<?php
// Point d'entrée de l'API (partie communauté, à venir). Pour l'instant : un test de santé de l'hébergement.
//   GET /api/  ->  { ok, php, sqlite, ecriture }
// sqlite : la base des comptes est un fichier SQLite dans api/donnees/ (pas de MySQL chez OVH).
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$donnees = __DIR__ . '/donnees';
$sqlite = false;
$erreur = null;
if (extension_loaded('pdo_sqlite')) {
    try {
        $db = new PDO('sqlite:' . $donnees . '/test.sqlite');
        $db->exec('CREATE TABLE IF NOT EXISTS sante (t INTEGER)');
        $db->exec('INSERT INTO sante VALUES (' . time() . ')');
        $sqlite = true;
    } catch (Throwable $e) {
        $erreur = 'sqlite : ' . $e->getMessage();
    }
}

echo json_encode([
    'ok' => true,
    'php' => PHP_VERSION,
    'sqlite' => $sqlite,
    'ecriture' => is_writable($donnees),
    'erreur' => $erreur,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
