<?php
/**
 * ONE-SHOT: ENUM cancelled + inatividade 90 dias.
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
require_once __DIR__ . '/helpers/cms_schema.php';
require_once __DIR__ . '/helpers/guide_status.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    gcv_cms_ensure_schema();
    $pdo = db();
    out('OK: conectado');

    $col = $pdo->query("SHOW COLUMNS FROM gcv_users LIKE 'status'")->fetch();
    out('enum: ' . (string)($col['Type'] ?? ''));

    gcv_guides_apply_inactivity($pdo);
    out('inatividade: aplicada');

    $rows = $pdo->query(
        "SELECT u.id, u.status, g.nickname, g.approved_at
         FROM gcv_users u
         INNER JOIN gcv_guides g ON g.user_id = u.id
         ORDER BY u.id ASC"
    )->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        out(sprintf(
            'user#%s %s status=%s approved=%s',
            (string)$r['id'],
            (string)$r['nickname'],
            (string)$r['status'],
            (string)($r['approved_at'] ?? '')
        ));
    }
    out('');
    out('FEITO. Apague api/_migrate_guide_status_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
