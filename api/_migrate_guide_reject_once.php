<?php
/**
 * ONE-SHOT: blocklist de e-mails + colunas de recusa (45 dias).
 * https://www.guiachapadaveadeiros.com/api/_migrate_guide_reject_once.php?key=GCV-MKT-2026
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

$stmts = [
    "CREATE TABLE IF NOT EXISTS gcv_blocked_guide_emails (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(190) NOT NULL,
      reason VARCHAR(500) NULL,
      blocked_by INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_blocked_guide_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

foreach ($stmts as $sql) {
    try {
        $pdo->exec($sql);
        out('OK: ' . substr(preg_replace('/\s+/', ' ', $sql), 0, 80));
    } catch (Throwable $e) {
        out('ERR: ' . $e->getMessage());
    }
}

$cols = [
    'rejected_at' => 'DATETIME NULL',
    'rejected_reason' => 'VARCHAR(500) NULL',
    'rejected_by' => 'INT UNSIGNED NULL',
];
$existing = [];
try {
    foreach ($pdo->query('SHOW COLUMNS FROM gcv_guides')->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $existing[strtolower((string)$r['Field'])] = true;
    }
} catch (Throwable $e) {
    out('ERR SHOW COLUMNS: ' . $e->getMessage());
}

foreach ($cols as $name => $def) {
    if (isset($existing[strtolower($name)])) {
        out('SKIP coluna já existe: ' . $name);
        continue;
    }
    try {
        $pdo->exec("ALTER TABLE gcv_guides ADD COLUMN `{$name}` {$def}");
        out('OK ADD ' . $name);
    } catch (Throwable $e) {
        out('ERR ADD ' . $name . ': ' . $e->getMessage());
    }
}

out('');
out('--- gcv_blocked_guide_emails ---');
try {
    $n = (int)$pdo->query('SELECT COUNT(*) FROM gcv_blocked_guide_emails')->fetchColumn();
    out('linhas=' . $n);
} catch (Throwable $e) {
    out('ERR count: ' . $e->getMessage());
}

out('--- gcv_guides colunas recusa ---');
try {
    foreach ($pdo->query('SHOW COLUMNS FROM gcv_guides')->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $f = (string)$r['Field'];
        if (str_starts_with($f, 'rejected') || $f === 'approved_at') {
            out($f . ' ' . $r['Type']);
        }
    }
} catch (Throwable $e) {
    out('ERR: ' . $e->getMessage());
}

out('FEITO');
