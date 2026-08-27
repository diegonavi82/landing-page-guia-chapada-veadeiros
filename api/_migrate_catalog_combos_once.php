<?php
/**
 * ONE-SHOT: remove 6 atrativos avulsos e inclui novos duplos.
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
require_once __DIR__ . '/helpers/attractions_seed.php';

function out(string $m): void
{
    echo $m . "\n";
}

$removeTitles = [
    'Candaru',
    'Águas Termais',
    'Capivara',
    'Quadriciclo',
    'Complexo Rio da Prata',
    'Raizama',
];
$removeSlugs = [
    'candaru-guia-chapada-veadeiros',
    'aguas-termais-guia-chapada-veadeiros',
    'capivara-guia-chapada-veadeiros',
    'quadriciclo-guia-chapada-veadeiros',
    'cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante',
    'raizama-guia-chapada-veadeiros',
];

try {
    $pdo = db();
    out('OK: conectado');

    $byTitle = $pdo->prepare(
        "UPDATE gcv_attractions SET status = 'archived'
         WHERE LOWER(TRIM(title_pt)) = LOWER(TRIM(?))"
    );
    foreach ($removeTitles as $title) {
        $byTitle->execute([$title]);
        out('archive title ' . $title . ': ' . (int)$byTitle->rowCount());
    }
    $bySlug = $pdo->prepare(
        "UPDATE gcv_attractions SET status = 'archived' WHERE slug = ?"
    );
    foreach ($removeSlugs as $slug) {
        $bySlug->execute([$slug]);
        out('archive slug ' . $slug . ': ' . (int)$bySlug->rowCount());
    }

    $seed = gcv_seed_attractions_from_json();
    out('imported: ' . (int)$seed['imported']);
    out('skipped: ' . (int)$seed['skipped']);
    if (!empty($seed['titles'])) {
        out('--- novos ---');
        foreach ($seed['titles'] as $t) {
            out('- ' . $t);
        }
    }

    $keep = $pdo->prepare(
        "UPDATE gcv_attractions SET status = 'published' WHERE LOWER(TRIM(title_pt)) = LOWER(TRIM(?))"
    );
    foreach ([
        'Morada do Sol + Raizama',
        'Loquinhas + Vale da Lua',
        'Almécegas + Loquinhas',
        'Cordovil + Loquinhas',
        'Morada do Sol + Lajeado',
        'Lajeado + Raizama',
        'Vale da Lua + Raizama',
    ] as $title) {
        $keep->execute([$title]);
        out('publish ' . $title . ': ' . (int)$keep->rowCount());
    }

    out('');
    out('--- published ---');
    $rows = $pdo->query(
        "SELECT title_pt FROM gcv_attractions WHERE status = 'published' ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_COLUMN);
    foreach ($rows as $t) {
        out('- ' . $t);
    }
    out('');
    out('FEITO. Apague api/_migrate_catalog_combos_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
