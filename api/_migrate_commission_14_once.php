<?php
/**
 * ONE-SHOT: taxa padrão 16% → 14%.
 * https://www.guiachapadaveadeiros.com/api/_migrate_commission_14_once.php?key=GCV-MKT-2026
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
    out('OK: gcv_marketplace_ensure_schema()');
} catch (Throwable $e) {
    out('AVISO ensure: ' . $e->getMessage());
}

$sqlFile = __DIR__ . '/database/migration_commission_14.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        if (!preg_match('/^\s*UPDATE\b/i', $stmt)) {
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
    out('AVISO: migration_commission_14.sql não encontrado no servidor');
}

try {
    out('');
    out('--- regra global ---');
    $st = $pdo->query(
        "SELECT id, commission_pct, is_active, deleted_at
         FROM gcv_commission_rules
         WHERE scope_type = 'global' AND deleted_at IS NULL
         ORDER BY id DESC"
    );
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        out('id=' . $row['id'] . ' pct=' . $row['commission_pct'] . ' active=' . $row['is_active']);
    }
    $pct = $pdo->query(
        "SELECT value FROM gcv_settings WHERE key_name = 'platform_commission_pct' LIMIT 1"
    )->fetchColumn();
    out('settings.platform_commission_pct=' . (string)$pct);
} catch (Throwable $e) {
    out('AVISO verify: ' . $e->getMessage());
}

out('');
out('FEITO. Apague api/_migrate_commission_14_once.php');
