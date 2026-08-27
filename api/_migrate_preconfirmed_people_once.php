<?php
/**
 * ONE-SHOT: pessoas confirmadas pelo guia (preconfirmed_people).
 * https://www.guiachapadaveadeiros.com/api/_migrate_preconfirmed_people_once.php?key=GCV-MKT-2026
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
require_once __DIR__ . '/helpers/marketplace_schema.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    $pdo = db();
    out('OK: conectado');
    gcv_cms_ensure_schema();
    out('OK: gcv_cms_ensure_schema()');
    gcv_marketplace_ensure_schema();
    out('OK: gcv_marketplace_ensure_schema()');

    $cols = $pdo->query("SHOW COLUMNS FROM gcv_excursions LIKE 'preconfirmed_people'")->fetchAll();
    if (!$cols) {
        $pdo->exec(
            'ALTER TABLE gcv_excursions
             ADD COLUMN preconfirmed_people TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER booked_people'
        );
        out('OK: coluna preconfirmed_people criada');
    } else {
        out('OK: coluna preconfirmed_people já existia');
    }

    $row = $pdo->query("SHOW COLUMNS FROM gcv_excursions LIKE 'preconfirmed_people'")->fetch();
    out('FEITO: preconfirmed_people ' . ($row['Type'] ?? '') . ' default=' . ($row['Default'] ?? ''));
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
