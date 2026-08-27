<?php
/**
 * ONE-SHOT: fila de aprovação de passeios de guia.
 * https://www.guiachapadaveadeiros.com/api/_migrate_guide_approval_once.php?key=GCV-MKT-2026
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
    out('OK: gcv_marketplace_ensure_schema() (ENUM + retract)');
} catch (Throwable $e) {
    out('AVISO ensure: ' . $e->getMessage());
}

$sqlFile = __DIR__ . '/database/migration_guide_excursion_approval.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        if (!preg_match('/^\s*(ALTER|UPDATE)\b/i', $stmt)) {
            continue;
        }
        try {
            $n = $pdo->exec($stmt);
            out('OK: ' . preg_replace('/\s+/', ' ', substr($stmt, 0, 80)) . '… (rows=' . (int)$n . ')');
        } catch (Throwable $e) {
            out('SKIP/ERR: ' . substr($e->getMessage(), 0, 180));
        }
    }
} else {
    out('AVISO: migration_guide_excursion_approval.sql não encontrado no servidor');
}

try {
    $st = $pdo->query(
        "SELECT status, COUNT(*) AS n
         FROM gcv_excursions
         WHERE deleted_at IS NULL
         GROUP BY status
         ORDER BY status"
    );
    out('');
    out('--- gcv_excursions por status ---');
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        out(($row['status'] ?? '?') . ': ' . (int)$row['n']);
    }
    $pending = (int)$pdo->query(
        "SELECT COUNT(*) FROM gcv_excursions
         WHERE status = 'pending_approval' AND deleted_at IS NULL"
    )->fetchColumn();
    $liveGuide = (int)$pdo->query(
        "SELECT COUNT(*) FROM gcv_excursions
         WHERE status IN ('published','soldout')
           AND deleted_at IS NULL
           AND approved_at IS NULL
           AND (created_by_origin = 'GUIDE' OR business_mode = 'GUIDE_MARKETPLACE')"
    )->fetchColumn();
    out('');
    out('pending_approval: ' . $pending);
    out('guia no ar SEM approved_at: ' . $liveGuide);
} catch (Throwable $e) {
    out('AVISO counts: ' . $e->getMessage());
}

out('');
out('FEITO. Apague api/_migrate_guide_approval_once.php');
