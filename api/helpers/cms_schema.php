<?php
declare(strict_types=1);

/**
 * Auto-migração leve do schema CMS (idempotente).
 * Chamado pelas APIs admin do CMS.
 */
function gcv_cms_ensure_schema(): void
{
    static $done = false;
    if ($done) return;
    $done = true;

    $pdo = db();
    $sqlFile = dirname(__DIR__) . '/database/migration_cms.sql';
    if (is_file($sqlFile)) {
        // Cria tabelas IF NOT EXISTS (ignora ALTERs comentados do arquivo)
        $raw = file_get_contents($sqlFile);
        if ($raw !== false) {
            // Remove comentários de linha simples para não quebrar splits
            $parts = preg_split('/;\s*\n/', $raw) ?: [];
            foreach ($parts as $stmt) {
                $stmt = trim($stmt);
                if ($stmt === '' || str_starts_with($stmt, '--')) continue;
                if (!preg_match('/^\s*CREATE\s+TABLE/i', $stmt) && !preg_match('/^\s*INSERT\s+INTO/i', $stmt)) {
                    continue;
                }
                try {
                    $pdo->exec($stmt);
                } catch (Throwable $e) {
                    // tabela já existe / insert duplicado — ok
                }
            }
        }
    }

    gcv_cms_ensure_guide_columns($pdo);
    gcv_cms_ensure_excursion_columns($pdo);
    gcv_cms_ensure_client_profiles();
}

function gcv_cms_ensure_excursion_columns(PDO $pdo): void
{
    $cols = [
        'cart_slug' => 'VARCHAR(180) NULL',
    ];
    $existing = [];
    try {
        $rows = $pdo->query('SHOW COLUMNS FROM gcv_excursions')->fetchAll();
        foreach ($rows as $r) {
            $existing[strtolower((string)$r['Field'])] = true;
        }
    } catch (Throwable $e) {
        return;
    }
    foreach ($cols as $name => $def) {
        if (isset($existing[strtolower($name)])) continue;
        try {
            $pdo->exec("ALTER TABLE gcv_excursions ADD COLUMN `{$name}` {$def}");
        } catch (Throwable $e) {
            // ignore
        }
    }
}

function gcv_cms_ensure_guide_columns(PDO $pdo): void
{
    $cols = [
        'nickname' => "VARCHAR(80) NULL",
        'full_name' => "VARCHAR(160) NULL",
        'phone_ddi' => "VARCHAR(8) NULL DEFAULT '+55'",
        'phone_iso' => "CHAR(2) NULL DEFAULT 'br'",
        'birth_date' => "DATE NULL",
        'base_city_id' => "INT UNSIGNED NULL",
        'cpf' => "VARCHAR(14) NULL",
        'id_document_url' => "VARCHAR(500) NULL",
        'diploma_url' => "VARCHAR(500) NULL",
        'association_doc_url' => "VARCHAR(500) NULL",
        'photo_3x4_url' => "VARCHAR(500) NULL",
        'profile_complete' => "TINYINT(1) NOT NULL DEFAULT 0",
    ];
    $existing = [];
    try {
        $rows = $pdo->query('SHOW COLUMNS FROM gcv_guides')->fetchAll();
        foreach ($rows as $r) {
            $existing[strtolower((string)$r['Field'])] = true;
        }
    } catch (Throwable $e) {
        return;
    }
    foreach ($cols as $name => $def) {
        if (isset($existing[strtolower($name)])) continue;
        try {
            $pdo->exec("ALTER TABLE gcv_guides ADD COLUMN `{$name}` {$def}");
        } catch (Throwable $e) {
            // ignore
        }
    }
}

function gcv_cms_ensure_client_profiles(): void
{
    $pdo = db();
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_client_profiles (
              user_id     INT UNSIGNED NOT NULL PRIMARY KEY,
              phone       VARCHAR(20) NULL,
              phone_ddi   VARCHAR(8) NULL DEFAULT '+55',
              cpf         VARCHAR(14) NULL,
              birth_date  DATE NULL,
              photo_url   VARCHAR(500) NULL,
              notes       VARCHAR(500) NULL,
              updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES gcv_users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        // ignore
    }

    // Quórum em tours marketplace (para cancelamento em formação)
    try {
        $rows = $pdo->query('SHOW COLUMNS FROM gcv_tours')->fetchAll();
        $existing = [];
        foreach ($rows as $r) {
            $existing[strtolower((string)$r['Field'])] = true;
        }
        if (!isset($existing['quorum'])) {
            $pdo->exec('ALTER TABLE gcv_tours ADD COLUMN quorum TINYINT UNSIGNED NOT NULL DEFAULT 4 AFTER max_spots');
        }
    } catch (Throwable $e) {
        // ignore
    }
}

function gcv_cms_slugify(string $text): string
{
    $t = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    if ($t === false) $t = $text;
    $t = strtolower($t);
    $t = preg_replace('/[^a-z0-9]+/', '-', $t) ?? '';
    return trim($t, '-') ?: 'item';
}

function gcv_cms_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function gcv_cms_uploads_root(): string
{
    return dirname(__DIR__, 2) . '/assets/img/uploads';
}

function gcv_cms_public_url(string $relativePath): string
{
    $rel = '/' . ltrim(str_replace('\\', '/', $relativePath), '/');
    return $rel;
}
