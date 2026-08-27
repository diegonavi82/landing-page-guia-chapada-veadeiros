<?php
/**
 * ONE-SHOT: cria gcv_inbox + colunas de aviso 15 min.
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
require_once __DIR__ . '/helpers/inbox.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    gcv_marketplace_ensure_schema();
    gcv_inbox_ensure_schema();
    $pdo = db();

    $inbox = $pdo->query("SHOW TABLES LIKE 'gcv_inbox'")->fetch();
    out('gcv_inbox: ' . ($inbox ? 'OK' : 'FALTA'));

    $sales = [];
    foreach ($pdo->query('SHOW COLUMNS FROM gcv_sales')->fetchAll() as $c) {
        $sales[strtolower((string)$c['Field'])] = true;
    }
    $exc = [];
    foreach ($pdo->query('SHOW COLUMNS FROM gcv_excursions')->fetchAll() as $c) {
        $exc[strtolower((string)$c['Field'])] = true;
    }
    out('sales.notify_m15_sent_at: ' . (isset($sales['notify_m15_sent_at']) ? 'OK' : 'FALTA'));
    out('excursions.notify_m15_guide_at: ' . (isset($exc['notify_m15_guide_at']) ? 'OK' : 'FALTA'));
    out('');
    out('FEITO. Apague api/_migrate_inbox_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
