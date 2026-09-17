<?php
/**
 * Executa um .sql de api/database/ no MySQL da Hostinger.
 * Protegido por chave. Uso interno do deploy (npm run db:migrate).
 *
 * https://www.guiachapadaveadeiros.com/api/run-sql.php?key=GCV-MKT-2026&file=migration_guide_sexo.sql
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

$file = basename((string)($_GET['file'] ?? ''));
if (!preg_match('/^[A-Za-z0-9._-]+\.sql$/', $file)) {
    http_response_code(400);
    echo "Arquivo SQL inválido\n";
    exit;
}

$path = __DIR__ . '/database/' . $file;
if (!is_file($path)) {
    http_response_code(404);
    echo "SQL não encontrado: {$file}\n";
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
    out('SQL: ' . $file);
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

$raw = (string)file_get_contents($path);
$parts = preg_split('/;\s*\n/', $raw) ?: [];
$ok = 0;
$skip = 0;
foreach ($parts as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '' || str_starts_with($stmt, '--')) {
        continue;
    }
    if (!str_ends_with($stmt, ';')) {
        $stmt .= ';';
    }
    try {
        $pdo->exec($stmt);
        $ok++;
        $preview = preg_replace('/\s+/', ' ', substr($stmt, 0, 90));
        out('OK: ' . $preview);
    } catch (Throwable $e) {
        $msg = $e->getMessage();
        $dup = stripos($msg, 'Duplicate') !== false
            || stripos($msg, 'already exists') !== false
            || str_contains($msg, '1060')
            || str_contains($msg, '1061')
            || str_contains($msg, '1050');
        if ($dup) {
            $skip++;
            out('SKIP: ' . $msg);
            continue;
        }
        http_response_code(500);
        out('ERRO: ' . $msg);
        exit;
    }
}

out("Resumo: {$ok} OK, {$skip} skip");
out('DONE');
