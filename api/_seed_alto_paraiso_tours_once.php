<?php
/**
 * ONE-SHOT: cadastra saídas Alto Paraíso até 10/01/2027.
 * https://www.guiachapadaveadeiros.com/api/_seed_alto_paraiso_tours_once.php?key=GCV-MKT-2026
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(300);

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/seed_alto_paraiso_tours.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    $r = gcv_lote_ap_run();
    out('imported=' . $r['imported']);
    out('skipped_attr=' . $r['skipped']);
    out('covers=' . $r['covers']);
    out('created=' . $r['created']);
    out('skipped_days=' . $r['skipped_days']);
    foreach ($r['errors'] as $err) {
        out('ERR ' . $err);
    }
    out('OK');
} catch (Throwable $e) {
    out('FALHOU: ' . $e->getMessage());
}
