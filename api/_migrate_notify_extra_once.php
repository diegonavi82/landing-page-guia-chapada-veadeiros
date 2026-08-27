<?php
/**
 * ONE-SHOT: colunas de notificação extra (Pix cliente, 2h, avaliação).
 * https://www.guiachapadaveadeiros.com/api/_migrate_notify_extra_once.php?key=GCV-MKT-2026
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
require_once __DIR__ . '/helpers/marketplace_schema.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    $pdo = db();
    out('OK: conectado');
    gcv_marketplace_ensure_schema();
    out('OK: gcv_marketplace_ensure_schema()');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
    exit;
}

$sqlFile = __DIR__ . '/database/migration_notify_extra.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--') || !preg_match('/^\s*ALTER\b/i', $stmt)) {
            continue;
        }
        try {
            $pdo->exec($stmt);
            out('OK: ' . preg_replace('/\s+/', ' ', substr($stmt, 0, 90)));
        } catch (Throwable $e) {
            out('SKIP: ' . substr($e->getMessage(), 0, 160));
        }
    }
}

$salesCols = $pdo->query('SHOW COLUMNS FROM gcv_sales')->fetchAll(PDO::FETCH_COLUMN) ?: [];
$excCols = $pdo->query('SHOW COLUMNS FROM gcv_excursions')->fetchAll(PDO::FETCH_COLUMN) ?: [];
foreach (['notify_pix_paid_sent_at', 'notify_h2_sent_at', 'notify_review_sent_at'] as $c) {
    out('gcv_sales.' . $c . ': ' . (in_array($c, $salesCols, true) ? 'OK' : 'FALTA'));
}
out('gcv_excursions.notify_h2_guide_at: ' . (in_array('notify_h2_guide_at', $excCols, true) ? 'OK' : 'FALTA'));
out('FIM');
