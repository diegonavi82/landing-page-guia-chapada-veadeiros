<?php
/**
 * ONE-SHOT: arquiva atrativos que saíram do catálogo de publicação.
 * Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';

function out(string $m): void
{
    echo $m . "\n";
}

$slugs = [
    'voo-paramotor-guia-chapada-veadeiros',
    'voo-balao-guia-chapada-veadeiros',
    'travessia-leste-45km-guia-chapada-veadeiros',
    'tirolesa-gaviao-sentado-guia-chapada-veadeiros',
    'rafting-canoa-havaiana-guia-chapada-veadeiros',
];
$titles = [
    'Voo de Paramotor',
    'Voo de Balão',
    'Travessia Leste 45 km',
    'Tirolesa do Gavião (Sentado)',
    'Rafting e Canoa Havaiana',
];

try {
    $pdo = db();
    out('OK: conectado');
    $bySlug = $pdo->prepare("UPDATE gcv_attractions SET status = 'archived' WHERE slug = ?");
    $byTitle = $pdo->prepare("UPDATE gcv_attractions SET status = 'archived' WHERE LOWER(TRIM(title_pt)) = LOWER(TRIM(?))");
    foreach ($slugs as $slug) {
        $bySlug->execute([$slug]);
        out('slug ' . $slug . ': ' . (int)$bySlug->rowCount());
    }
    foreach ($titles as $title) {
        $byTitle->execute([$title]);
        out('title ' . $title . ': ' . (int)$byTitle->rowCount());
    }
    $count = (int)$pdo->query("SELECT COUNT(*) FROM gcv_attractions WHERE status = 'published'")->fetchColumn();
    out('');
    out('published_in_db: ' . $count);
    $rows = $pdo->query("SELECT title_pt FROM gcv_attractions WHERE status = 'published' ORDER BY title_pt ASC")->fetchAll(PDO::FETCH_COLUMN);
    out('');
    out('--- catálogo ---');
    foreach ($rows as $t) {
        out('- ' . $t);
    }
    out('');
    out('FEITO. Apague api/_migrate_hide_attractions_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
