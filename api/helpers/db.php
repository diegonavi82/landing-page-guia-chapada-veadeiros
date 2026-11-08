<?php
declare(strict_types=1);

/**
 * Carrega credenciais DB:
 * 1) api/config.local.php (prioridade — mesma fonte do health.php)
 * 2) api/.env (fallback)
 */
(static function () {
    $apiDir = dirname(__DIR__);

    $local = $apiDir . '/config.local.php';
    if (is_readable($local)) {
        $cfg = require $local;
        if (is_array($cfg)) {
            $map = [
                'db_host' => 'DB_HOST',
                'db_name' => 'DB_NAME',
                'db_user' => 'DB_USER',
                'db_pass' => 'DB_PASS',
            ];
            foreach ($map as $k => $envKey) {
                if (!isset($cfg[$k]) || $cfg[$k] === '' || $cfg[$k] === 'COLOQUE_A_SENHA_AQUI') {
                    continue;
                }
                $_ENV[$envKey] = (string)$cfg[$k];
                putenv($envKey . '=' . (string)$cfg[$k]);
            }
        }
    }

    $envFile = $apiDir . '/.env';
    if (!is_file($envFile)) {
        return;
    }
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);
        if (
            (str_starts_with($v, '"') && str_ends_with($v, '"'))
            || (str_starts_with($v, "'") && str_ends_with($v, "'"))
        ) {
            $v = substr($v, 1, -1);
        }
        // Não sobrescreve se config.local já definiu
        if ($k !== '' && !isset($_ENV[$k])) {
            $_ENV[$k] = $v;
            putenv("{$k}={$v}");
        }
    }
})();

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = $_ENV['DB_HOST'] ?? 'localhost';
    $name = $_ENV['DB_NAME'] ?? '';
    $user = $_ENV['DB_USER'] ?? '';
    $pass = $_ENV['DB_PASS'] ?? '';

    if ($name === '' || $user === '') {
        throw new RuntimeException('Database not configured');
    }

    $pdo = new PDO(
        "mysql:host={$host};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_TIMEOUT            => 5,
        ]
    );
    // Hostinger: charset utf8mb4 no DSN usa collation general_ci; as tabelas são unicode_ci.
    // Sem isto, NULLIF/comparações quebram o cadastro do guia (SQLSTATE 1267).
    $pdo->exec('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    try {
        // DDL em andamento segurava o painel por minutos (padrão do MySQL: 1 ano).
        $pdo->exec('SET SESSION lock_wait_timeout = 12');
    } catch (Throwable $e) {
        // hospedagem sem permissão para mudar a sessão
    }
    return $pdo;
}

function gcv_job_stamp_path(string $key): string
{
    $safe = preg_replace('/[^a-z0-9_-]/i', '', $key) ?: 'job';
    $dir = dirname(__DIR__) . '/storage/jobs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    if (is_dir($dir) && is_writable($dir)) {
        return $dir . DIRECTORY_SEPARATOR . $safe . '.stamp';
    }
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'gcv-job-' . $safe . '.stamp';
}

/** Leitura do painel: abrir o menu não pode migrar o banco. */
function gcv_admin_is_read(): bool
{
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'GET' && $method !== 'HEAD') {
        return false;
    }
    $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
    return str_contains($uri, '/api/admin/') || str_contains($uri, '/api/anfitriao/');
}

/**
 * Migração idempotente. A leitura do painel nunca roda.
 * Nos outros acessos, no máximo uma vez por intervalo.
 */
function gcv_schema_should_run(string $key, int $seconds = 21600): bool
{
    if (gcv_admin_is_read()) {
        return false;
    }
    return gcv_job_due($key, $seconds);
}

/**
 * Colunas da tabela, com memória desta requisição e arquivo por um dia.
 *
 * @return array<string,bool>
 */
function gcv_table_columns(PDO $pdo, string $table): array
{
    static $mem = [];
    $table = strtolower((string)preg_replace('/[^a-z0-9_]/i', '', $table));
    if ($table === '') {
        return [];
    }
    if (isset($mem[$table])) {
        return $mem[$table];
    }
    $path = dirname(gcv_job_stamp_path('cols')) . DIRECTORY_SEPARATOR . 'cols-' . $table . '.json';
    if (is_file($path)) {
        $age = time() - (int)@filemtime($path);
        if ($age >= 0 && $age < 86400) {
            $cached = json_decode((string)@file_get_contents($path), true);
            if (is_array($cached)) {
                $mem[$table] = $cached;
                return $cached;
            }
        }
    }
    try {
        $rows = $pdo->query('SHOW COLUMNS FROM `' . $table . '`')->fetchAll();
    } catch (Throwable $e) {
        return [];
    }
    $existing = [];
    foreach ($rows as $r) {
        $existing[strtolower((string)($r['Field'] ?? ''))] = true;
    }
    $mem[$table] = $existing;
    @file_put_contents($path, json_encode($existing));
    return $existing;
}

/** Trabalho pesado e idempotente: no máximo uma vez por intervalo, por servidor. */
function gcv_job_due(string $key, int $seconds): bool
{
    $path = gcv_job_stamp_path($key);
    $now = time();
    if (is_file($path)) {
        $age = $now - (int)@filemtime($path);
        if ($age >= 0 && $age < $seconds) {
            return false;
        }
    }
    @touch($path);
    return true;
}
