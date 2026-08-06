<?php
declare(strict_types=1);

/**
 * Runner CLI: php tools/_run_sql_migration.php <sqlFile> <host> <name> <user> <pass>
 * Chamado por tools/run-sql-migration.mjs
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$sqlFile = $argv[1] ?? '';
$host = $argv[2] ?? 'localhost';
$name = $argv[3] ?? '';
$user = $argv[4] ?? '';
$pass = $argv[5] ?? '';

if ($sqlFile === '' || !is_readable($sqlFile) || $name === '' || $user === '') {
    fwrite(STDERR, "Uso: php tools/_run_sql_migration.php <sql> <host> <name> <user> <pass>\n");
    exit(1);
}

echo "Conectando {$user}@{$host}/{$name} …\n";

$hostsToTry = array_values(array_unique(array_filter([
    $host,
    // Hostinger: às vezes o remoto usa o hostname do servidor
    $host === 'localhost' ? '127.0.0.1' : null,
])));

$pdo = null;
$lastErr = null;
foreach ($hostsToTry as $h) {
    try {
        $pdo = new PDO(
            "mysql:host={$h};dbname={$name};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 10,
            ]
        );
        echo "OK: conectado via host={$h}\n";
        break;
    } catch (Throwable $e) {
        $lastErr = $e;
        echo "Falha host={$h}: " . $e->getMessage() . "\n";
    }
}

if (!$pdo) {
    fwrite(STDERR, "ERRO: não foi possível conectar ao MySQL.\n");
    fwrite(STDERR, "Último erro: " . ($lastErr ? $lastErr->getMessage() : 'desconhecido') . "\n");
    fwrite(STDERR, "Se o banco estiver na Hostinger, use host remoto ou rode o one-shot no servidor.\n");
    exit(2);
}

$raw = file_get_contents($sqlFile);
if ($raw === false) {
    fwrite(STDERR, "ERRO: não leu {$sqlFile}\n");
    exit(1);
}

// Remove comentários de linha, preserva statements
$lines = preg_split("/\r\n|\n|\r/", $raw) ?: [];
$buf = '';
foreach ($lines as $line) {
    $trim = ltrim($line);
    if (str_starts_with($trim, '--')) {
        continue;
    }
    $buf .= $line . "\n";
}

$parts = preg_split('/;\s*\n/', $buf) ?: [];
$ok = 0;
$skip = 0;
$fail = 0;

foreach ($parts as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') {
        continue;
    }
    // Executa DDL/DML relevantes (inclui ALTER se não estiver comentado)
    if (!preg_match('/^\s*(CREATE|INSERT|UPDATE|ALTER|DROP|REPLACE|SET|DELETE)\b/i', $stmt)) {
        continue;
    }
    try {
        $pdo->exec($stmt);
        $preview = preg_replace('/\s+/', ' ', substr($stmt, 0, 90));
        echo "OK: {$preview}…\n";
        $ok++;
    } catch (Throwable $e) {
        $msg = $e->getMessage();
        // Idempotência: já existe / duplicado
        if (preg_match('/already exists|Duplicate|duplicate|1050|1060|1061|1062|1091/i', $msg)) {
            echo "SKIP: " . substr($msg, 0, 140) . "\n";
            $skip++;
        } else {
            echo "ERR: " . substr($msg, 0, 200) . "\n";
            $fail++;
        }
    }
}

// Colunas via ensure_schema (ALTERs comentados no SQL)
$apiHelpers = dirname(__DIR__) . '/api/helpers';
putenv("DB_HOST={$host}");
putenv("DB_NAME={$name}");
putenv("DB_USER={$user}");
putenv("DB_PASS={$pass}");
$_ENV['DB_HOST'] = $host;
$_ENV['DB_NAME'] = $name;
$_ENV['DB_USER'] = $user;
$_ENV['DB_PASS'] = $pass;

try {
    require_once $apiHelpers . '/marketplace_schema.php';
    gcv_marketplace_ensure_schema();
    echo "OK: gcv_marketplace_ensure_schema()\n";
} catch (Throwable $e) {
    echo "AVISO ensure_schema: " . $e->getMessage() . "\n";
}

$tables = [
    'gcv_commission_rules',
    'gcv_audit_log',
    'gcv_sales',
    'gcv_pix_payments',
    'gcv_sale_payouts',
    'gcv_guide_financial',
];
echo "\n--- Verificação ---\n";
foreach ($tables as $t) {
    try {
        $n = (int)$pdo->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
        echo "OK {$t}: {$n} linhas\n";
    } catch (Throwable $e) {
        echo "FALTA {$t}\n";
        $fail++;
    }
}

// Colunas chave em gcv_excursions
try {
    $cols = $pdo->query('SHOW COLUMNS FROM gcv_excursions')->fetchAll(PDO::FETCH_COLUMN);
    $need = ['business_mode', 'created_by_origin', 'guide_net_cents', 'deleted_at'];
    foreach ($need as $c) {
        echo in_array($c, $cols, true) ? "OK coluna gcv_excursions.{$c}\n" : "FALTA coluna gcv_excursions.{$c}\n";
    }
} catch (Throwable $e) {
    echo "AVISO colunas excursions: " . $e->getMessage() . "\n";
}

echo "\nResumo: {$ok} OK, {$skip} skip, {$fail} erro\n";
exit($fail > 0 ? 1 : 0);
