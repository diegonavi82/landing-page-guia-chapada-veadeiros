<?php
/**
 * ONE-SHOT: divide Parque Nacional em Saltos e Cariocas.
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

try {
    $pdo = db();
    out('OK: conectado');

    $arch = $pdo->prepare(
        "UPDATE gcv_attractions SET status = 'archived'
         WHERE slug = 'parque-nacional-guia-chapada-veadeiros'
            OR (LOWER(TRIM(title_pt)) = LOWER('Parque Nacional') AND slug NOT LIKE '%noturno%')"
    );
    $arch->execute();
    out('archived_generic: ' . (int)$arch->rowCount());

    $saltos = $pdo->prepare(
        "UPDATE gcv_attractions
         SET title_pt = ?, title_en = ?, title_es = ?
         WHERE slug = 'parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge'
            OR LOWER(TRIM(title_pt)) = LOWER('Saltos do Rio Preto')"
    );
    $saltos->execute([
        'Parque Nacional - Saltos do rio Preto',
        'National Park - Saltos do Rio Preto',
        'Parque Nacional - Saltos del Río Preto',
    ]);
    out('renamed_saltos: ' . (int)$saltos->rowCount());

    $cariocas = $pdo->prepare(
        "UPDATE gcv_attractions
         SET title_pt = ?, title_en = ?, title_es = ?
         WHERE slug = 'parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge'
            OR LOWER(TRIM(title_pt)) = LOWER('Cânions e Cariocas')"
    );
    $cariocas->execute([
        'Parque Nacional - Cariocas',
        'National Park - Cariocas',
        'Parque Nacional - Cariocas',
    ]);
    out('renamed_cariocas: ' . (int)$cariocas->rowCount());

    $rows = $pdo->query(
        "SELECT slug, title_pt, status FROM gcv_attractions
         WHERE title_pt LIKE 'Parque Nacional%'
            OR slug LIKE 'parque-nacional%'
         ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_ASSOC);
    out('');
    out('--- parque ---');
    foreach ($rows as $r) {
        out(($r['status'] ?? '') . ' | ' . ($r['title_pt'] ?? '') . ' | ' . ($r['slug'] ?? ''));
    }
    out('');
    out('FEITO. Apague api/_migrate_split_parque_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
