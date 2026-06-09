<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

function gcv_config_source(): string
{
    $local = __DIR__ . '/config.local.php';
    if (is_readable($local)) {
        return 'local';
    }
    $example = __DIR__ . '/config.example.php';
    if (is_readable($example)) {
        return 'example';
    }
    return 'none';
}

function gcv_safe_db_meta(): array
{
    $cfg = gcv_load_config();
    return [
        'config_source' => gcv_config_source(),
        'db_host' => $cfg['db_host'] ?? null,
        'db_name' => $cfg['db_name'] ?? null,
        'db_user' => $cfg['db_user'] ?? null,
        'password_set' => isset($cfg['db_pass']) && (string) $cfg['db_pass'] !== '' && (string) $cfg['db_pass'] !== 'COLOQUE_A_SENHA_AQUI',
    ];
}

try {
    $pdo = gcv_db();
    gcv_ensure_schema($pdo);
    $pdo->query('SELECT 1');
    echo json_encode(array_merge(['ok' => true, 'database' => 'connected'], gcv_safe_db_meta()));
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(array_merge(
        [
            'ok' => false,
            'message' => 'Database connection failed',
            'error' => $e->getMessage(),
        ],
        gcv_safe_db_meta()
    ));
}
