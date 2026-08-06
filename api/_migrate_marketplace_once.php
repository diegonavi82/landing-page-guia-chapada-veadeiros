<?php
/**
 * ONE-SHOT: aplica migration_marketplace_financeiro.sql + ensure_schema.
 * https://www.guiachapadaveadeiros.com/api/_migrate_marketplace_once.php?key=GCV-MKT-2026
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
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

$sqlFile = __DIR__ . '/database/migration_marketplace_financeiro.sql';
if (!is_file($sqlFile)) {
    out('ERRO: migration_marketplace_financeiro.sql não encontrado — faça upload de api/database/');
    exit;
}

$raw = (string)file_get_contents($sqlFile);
$lines = preg_split("/\r\n|\n|\r/", $raw) ?: [];
$buf = '';
foreach ($lines as $line) {
    if (str_starts_with(ltrim($line), '--')) {
        continue;
    }
    $buf .= $line . "\n";
}
$parts = preg_split('/;\s*\n/', $buf) ?: [];
$ok = 0;
$fail = 0;
foreach ($parts as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') {
        continue;
    }
    if (!preg_match('/^\s*(CREATE|INSERT|UPDATE|ALTER)\b/i', $stmt)) {
        continue;
    }
    try {
        $pdo->exec($stmt);
        out('OK: ' . preg_replace('/\s+/', ' ', substr($stmt, 0, 70)) . '…');
        $ok++;
    } catch (Throwable $e) {
        $fail++;
        out('SKIP/ERR: ' . substr($e->getMessage(), 0, 140));
    }
}

try {
    require_once __DIR__ . '/helpers/marketplace_schema.php';
    gcv_marketplace_ensure_schema();
    out('OK: gcv_marketplace_ensure_schema()');
} catch (Throwable $e) {
    out('AVISO ensure: ' . $e->getMessage());
}

$need = [
    'gcv_commission_rules',
    'gcv_audit_log',
    'gcv_sales',
    'gcv_pix_payments',
    'gcv_sale_payouts',
    'gcv_guide_financial',
];
out('');
out('--- Tabelas ---');
foreach ($need as $t) {
    try {
        $n = (int)$pdo->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
        out("OK {$t}: {$n} linhas");
    } catch (Throwable $e) {
        out("FALTA {$t}");
    }
}

out('');
out("Resumo: {$ok} statements OK, {$fail} skip/erro");
out('FEITO. Apague api/_migrate_marketplace_once.php');
