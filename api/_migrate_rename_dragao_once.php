<?php
/**
 * ONE-SHOT: renomeia Dragão (4x4) → Dragão.
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
    $stmt = $pdo->prepare(
        "UPDATE gcv_attractions
         SET title_pt = 'Dragão', title_en = 'Dragão', title_es = 'Dragão'
         WHERE slug = 'dragao-4x4-guia-chapada-veadeiros'
            OR LOWER(TRIM(title_pt)) = LOWER('Dragão (4x4)')"
    );
    $stmt->execute();
    out('updated: ' . (int)$stmt->rowCount());
    $row = $pdo->query(
        "SELECT slug, title_pt FROM gcv_attractions
         WHERE slug = 'dragao-4x4-guia-chapada-veadeiros' LIMIT 1"
    )->fetch(PDO::FETCH_ASSOC);
    out('now: ' . json_encode($row, JSON_UNESCAPED_UNICODE));
    out('FEITO. Apague api/_migrate_rename_dragao_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
