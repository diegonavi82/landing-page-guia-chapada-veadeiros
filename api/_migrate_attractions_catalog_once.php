<?php
/**
 * ONE-SHOT: inclui atrativos do tarifário 2026/2027 no catálogo (sem sobrescrever).
 * https://www.guiachapadaveadeiros.com/api/_migrate_attractions_catalog_once.php?key=GCV-MKT-2026
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

try {
    $pdo = db();
    out('OK: conectado');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

try {
    $rename = $pdo->prepare(
        'UPDATE gcv_attractions
         SET title_pt = ?, title_en = ?, title_es = ?,
             excerpt_pt = ?, excerpt_en = ?, excerpt_es = ?
         WHERE slug = ?'
    );
    $rename->execute([
        'Santa Bárbara + Capivara + Candaru',
        'Santa Bárbara + Capivara + Candaru',
        'Santa Bárbara + Capivara + Candaru',
        'Roteiro combinado em Cavalcante: Santa Bárbara, Capivara e Candaru.',
        'Combo tour in Cavalcante: Santa Bárbara, Capivara and Candaru.',
        'Ruta combinada en Cavalcante: Santa Bárbara, Capivara y Candaru.',
        'santa-barbara-capivara-candaru-guia-chapada-veadeiros',
    ]);
    out('renamed_triple: ' . (int)$rename->rowCount());

    $result = gcv_seed_attractions_from_json();
    out('imported: ' . (int)$result['imported']);
    out('skipped: ' . (int)$result['skipped']);
    out('total_seed: ' . (int)$result['total']);
    if (!empty($result['titles'])) {
        out('');
        out('--- novos ---');
        foreach ($result['titles'] as $t) {
            out('- ' . $t);
        }
    }
    $count = (int)$pdo->query('SELECT COUNT(*) FROM gcv_attractions WHERE status = "published"')->fetchColumn();
    out('');
    out('published_in_db: ' . $count);
    $rows = $pdo->query('SELECT title_pt FROM gcv_attractions WHERE status = "published" ORDER BY title_pt ASC')->fetchAll(PDO::FETCH_COLUMN);
    out('');
    out('--- catálogo ---');
    foreach ($rows as $t) {
        out('- ' . $t);
    }
    out('');
    out('FEITO. Apague api/_migrate_attractions_catalog_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
