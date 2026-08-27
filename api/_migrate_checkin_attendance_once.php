<?php
/**
 * ONE-SHOT: check-in QR / no-show 50% / notificações D-12h.
 * https://www.guiachapadaveadeiros.com/api/_migrate_checkin_attendance_once.php?key=GCV-MKT-2026
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
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

try {
    gcv_marketplace_ensure_schema();
    out('OK: gcv_marketplace_ensure_schema() (colunas check-in)');
} catch (Throwable $e) {
    out('AVISO ensure: ' . $e->getMessage());
}

$sqlFile = __DIR__ . '/database/migration_checkin_attendance.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        if (!preg_match('/^\s*ALTER\b/i', $stmt)) {
            continue;
        }
        try {
            $n = $pdo->exec($stmt);
            out('OK: ' . preg_replace('/\s+/', ' ', substr($stmt, 0, 90)) . '… (rows=' . (int)$n . ')');
        } catch (Throwable $e) {
            out('SKIP/ERR: ' . substr($e->getMessage(), 0, 180));
        }
    }
} else {
    out('AVISO: migration_checkin_attendance.sql não encontrado no servidor');
}

try {
    $salesCols = $pdo->query('SHOW COLUMNS FROM gcv_sales')->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $excCols = $pdo->query('SHOW COLUMNS FROM gcv_excursions')->fetchAll(PDO::FETCH_COLUMN) ?: [];
    out('');
    out('--- gcv_sales ---');
    foreach (['attendance_status', 'checked_in_at', 'checked_in_by', 'notify_d12h_sent_at', 'notify_dayof_sent_at', 'guide_amount_original_cents', 'platform_revenue_original_cents'] as $c) {
        out($c . ': ' . (in_array($c, $salesCols, true) ? 'OK' : 'FALTA'));
    }
    out('--- gcv_excursions ---');
    foreach (['notify_confirmed_at', 'notify_d12h_guide_at'] as $c) {
        out($c . ': ' . (in_array($c, $excCols, true) ? 'OK' : 'FALTA'));
    }
} catch (Throwable $e) {
    out('ERRO SHOW COLUMNS: ' . $e->getMessage());
}

out('');
out('FIM');
