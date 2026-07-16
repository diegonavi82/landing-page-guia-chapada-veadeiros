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
    return $pdo;
}
