<?php
/**
 * ONE-SHOT: PIX automático às 16h20 + settings.
 * https://www.guiachapadaveadeiros.com/api/_migrate_payout_1620_once.php?key=GCV-MKT-2026
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

$sqlFile = __DIR__ . '/database/migration_payout_after_1620.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        try {
            $pdo->exec($stmt);
            out('OK: ' . substr(preg_replace('/\s+/', ' ', $stmt), 0, 90));
        } catch (Throwable $e) {
            out('ERRO SQL: ' . $e->getMessage());
        }
    }
}

try {
    $hour = (string)$pdo->query("SELECT value FROM gcv_settings WHERE key_name = 'payout_after_hour' LIMIT 1")->fetchColumn();
    $min = (string)$pdo->query("SELECT value FROM gcv_settings WHERE key_name = 'payout_after_minute' LIMIT 1")->fetchColumn();
    out('FEITO: payout_after_hour=' . $hour . ' payout_after_minute=' . $min);
} catch (Throwable $e) {
    out('WARN settings: ' . $e->getMessage());
}

out('FIM');
