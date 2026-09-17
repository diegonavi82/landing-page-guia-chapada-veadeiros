<?php
/**
 * ONE-SHOT: coluna sexo em gcv_guides.
 * https://www.guiachapadaveadeiros.com/api/_migrate_guide_sexo_once.php?key=GCV-MKT-2026
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

function out(string $m): void
{
    echo $m . "\n";
}

try {
    $pdo = db();
    out('OK: conectado');
    gcv_cms_ensure_schema();
    out('OK: cms_schema');
    $col = $pdo->query("SHOW COLUMNS FROM gcv_guides LIKE 'sexo'")->fetch(PDO::FETCH_ASSOC);
    if ($col) {
        out('OK: coluna sexo existe type=' . (string)($col['Type'] ?? ''));
    } else {
        $pdo->exec("ALTER TABLE gcv_guides ADD COLUMN sexo ENUM('M','F') NULL AFTER birth_date");
        out('OK: ALTER sexo criado');
    }
    $n = (int)$pdo->query("SELECT COUNT(*) FROM gcv_guides WHERE sexo IN ('M','F')")->fetchColumn();
    out('guias com sexo preenchido: ' . $n);
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
    exit;
}

out('DONE');
