<?php

function gcv_load_config(): array
{
    $local = __DIR__ . '/config.local.php';
    if (is_readable($local)) {
        $cfg = require $local;
        return is_array($cfg) ? $cfg : [];
    }

    $example = __DIR__ . '/config.example.php';
    if (is_readable($example)) {
        $cfg = require $example;
        return is_array($cfg) ? $cfg : [];
    }

    return [];
}

function gcv_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = gcv_load_config();
    $host = $cfg['db_host'] ?? 'localhost';
    $name = $cfg['db_name'] ?? '';
    $user = $cfg['db_user'] ?? '';
    $pass = $cfg['db_pass'] ?? '';
    $charset = $cfg['db_charset'] ?? 'utf8mb4';

    if ($name === '' || $user === '') {
        throw new RuntimeException('Database not configured');
    }

    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function gcv_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS gcv_contact_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            locale VARCHAR(8) NOT NULL DEFAULT "pt",
            nome VARCHAR(120) NOT NULL,
            tipo VARCHAR(40) NOT NULL,
            email VARCHAR(190) NULL,
            telefone VARCHAR(40) NULL,
            mensagem TEXT NOT NULL,
            ip VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_created_at (created_at),
            KEY idx_tipo (tipo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}
