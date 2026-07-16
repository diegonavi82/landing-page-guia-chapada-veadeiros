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
                if (!preg_match('/^\s*(CREATE\s+TABLE|INSERT\s+INTO)/i', $stmt)) {
                    continue;
                }
                try {
                    $pdo->exec($stmt);
                } catch (Throwable $e) {
                    // tabela já existe / insert duplicado / FK — tenta fallback sem FK abaixo
                    error_log('cms_schema sql: ' . $e->getMessage());
                }
            }
        }
    }

    // Fallback sem FOREIGN KEY (Hostinger às vezes falha FK e a tabela não nasce)
    gcv_cms_ensure_core_tables($pdo);

    gcv_cms_ensure_guide_columns($pdo);
    gcv_cms_ensure_excursion_columns($pdo);
    gcv_cms_ensure_client_profiles();
}

function gcv_cms_ensure_core_tables(PDO $pdo): void
{
    $creates = [
        "CREATE TABLE IF NOT EXISTS gcv_media (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          path VARCHAR(500) NOT NULL,
          url VARCHAR(500) NOT NULL,
          mime VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
          bytes INT UNSIGNED NOT NULL DEFAULT 0,
          width SMALLINT UNSIGNED NULL,
          height SMALLINT UNSIGNED NULL,
          alt_text VARCHAR(255) NULL,
          folder VARCHAR(80) NOT NULL DEFAULT 'general',
          uploaded_by INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_media_folder (folder)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_cities (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(160) NOT NULL,
          state VARCHAR(80) NOT NULL DEFAULT 'Goiás',
          state_code CHAR(2) NOT NULL DEFAULT 'GO',
          country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
          country_code CHAR(2) NOT NULL DEFAULT 'BR',
          place_id VARCHAR(255) NULL,
          formatted_address VARCHAR(400) NULL,
          lat DECIMAL(10,7) NULL,
          lng DECIMAL(10,7) NULL,
          is_base TINYINT(1) NOT NULL DEFAULT 1,
          status ENUM('active','archived') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_city_place (place_id),
          INDEX idx_city_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_articles (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(180) NOT NULL,
          status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
          title_pt VARCHAR(255) NOT NULL,
          title_en VARCHAR(255) NULL,
          title_es VARCHAR(255) NULL,
          excerpt_pt TEXT NULL,
          excerpt_en TEXT NULL,
          excerpt_es TEXT NULL,
          content_pt LONGTEXT NULL,
          content_en LONGTEXT NULL,
          content_es LONGTEXT NULL,
          seo_title_pt VARCHAR(255) NULL,
          seo_title_en VARCHAR(255) NULL,
          seo_title_es VARCHAR(255) NULL,
          seo_desc_pt VARCHAR(320) NULL,
          seo_desc_en VARCHAR(320) NULL,
          seo_desc_es VARCHAR(320) NULL,
          cover_media_id INT UNSIGNED NULL,
          cover_url VARCHAR(500) NULL,
          published_at DATETIME NULL,
          created_by INT UNSIGNED NULL,
          updated_by INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_article_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_attractions (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(180) NOT NULL,
          status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
          title_pt VARCHAR(255) NOT NULL,
          title_en VARCHAR(255) NULL,
          title_es VARCHAR(255) NULL,
          excerpt_pt TEXT NULL,
          excerpt_en TEXT NULL,
          excerpt_es TEXT NULL,
          content_pt LONGTEXT NULL,
          content_en LONGTEXT NULL,
          content_es LONGTEXT NULL,
          seo_title_pt VARCHAR(255) NULL,
          seo_title_en VARCHAR(255) NULL,
          seo_title_es VARCHAR(255) NULL,
          seo_desc_pt VARCHAR(320) NULL,
          seo_desc_en VARCHAR(320) NULL,
          seo_desc_es VARCHAR(320) NULL,
          distance_km DECIMAL(8,2) NULL,
          trail_distance_km DECIMAL(8,2) NULL,
          difficulty ENUM('easy','medium','hard','') NULL DEFAULT '',
          entry_price_cents INT UNSIGNED NULL,
          entry_price_label VARCHAR(120) NULL,
          parking_info VARCHAR(255) NULL,
          recommended_period VARCHAR(255) NULL,
          city_id INT UNSIGNED NULL,
          cover_media_id INT UNSIGNED NULL,
          cover_url VARCHAR(500) NULL,
          sidebar_html_pt MEDIUMTEXT NULL,
          sidebar_html_en MEDIUMTEXT NULL,
          sidebar_html_es MEDIUMTEXT NULL,
          published_at DATETIME NULL,
          created_by INT UNSIGNED NULL,
          updated_by INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_attraction_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_attraction_media (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          attraction_id INT UNSIGNED NOT NULL,
          media_id INT UNSIGNED NULL,
          url VARCHAR(500) NOT NULL,
          alt_text VARCHAR(255) NULL,
          sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_attr_media (attraction_id, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_excursions (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          status ENUM('draft','published','cancelled','soldout') NOT NULL DEFAULT 'draft',
          date_iso DATE NOT NULL,
          departure_time TIME NOT NULL,
          departure_city_id INT UNSIGNED NOT NULL,
          attraction_id INT UNSIGNED NOT NULL,
          guide_user_id INT UNSIGNED NULL,
          price_cents INT UNSIGNED NOT NULL,
          quorum TINYINT UNSIGNED NOT NULL DEFAULT 4,
          max_people TINYINT UNSIGNED NOT NULL DEFAULT 10,
          booked_people TINYINT UNSIGNED NOT NULL DEFAULT 0,
          include_transport TINYINT(1) NOT NULL DEFAULT 0,
          include_entry TINYINT(1) NOT NULL DEFAULT 0,
          include_lunch TINYINT(1) NOT NULL DEFAULT 0,
          notes_pt TEXT NULL,
          notes_en TEXT NULL,
          notes_es TEXT NULL,
          cart_slug VARCHAR(180) NULL,
          created_by INT UNSIGNED NULL,
          updated_by INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_exc_date (date_iso),
          INDEX idx_exc_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        // Até 4 atrativos por saída (attraction_id em gcv_excursions = o 1º / principal)
        "CREATE TABLE IF NOT EXISTS gcv_excursion_attractions (
          excursion_id INT UNSIGNED NOT NULL,
          attraction_id INT UNSIGNED NOT NULL,
          sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
          PRIMARY KEY (excursion_id, attraction_id),
          INDEX idx_exa_attr (attraction_id),
          INDEX idx_exa_order (excursion_id, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($creates as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            error_log('cms_core: ' . $e->getMessage());
        }
    }

    // Backfill: 1 atrativo antigo → linha na junction
    try {
        $pdo->exec(
            'INSERT IGNORE INTO gcv_excursion_attractions (excursion_id, attraction_id, sort_order)
             SELECT e.id, e.attraction_id, 0
             FROM gcv_excursions e
             WHERE e.attraction_id IS NOT NULL AND e.attraction_id > 0
               AND NOT EXISTS (
                 SELECT 1 FROM gcv_excursion_attractions x WHERE x.excursion_id = e.id
               )'
        );
    } catch (Throwable $e) {
        // ignore
    }

    // Cidades base (idempotente por nome)
    $cities = [
        ['Alto Paraíso de Goiás', 'Alto Paraíso de Goiás, GO, Brasil'],
        ['São Jorge', 'São Jorge, Alto Paraíso de Goiás - GO, Brasil'],
        ['Cavalcante', 'Cavalcante, GO, Brasil'],
        ['Teresina de Goiás', 'Teresina de Goiás, GO, Brasil'],
        ["São João d'Aliança", "São João d'Aliança, GO, Brasil"],
    ];
    $check = $pdo->prepare('SELECT id FROM gcv_cities WHERE name = ? LIMIT 1');
    $ins = $pdo->prepare(
        "INSERT INTO gcv_cities (name, state, state_code, country, country_code, formatted_address, is_base, status)
         VALUES (?, 'Goiás', 'GO', 'Brasil', 'BR', ?, 1, 'active')"
    );
    foreach ($cities as [$name, $addr]) {
        try {
            $check->execute([$name]);
            if (!$check->fetch()) {
                $ins->execute([$name, $addr]);
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
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
        'languages_json' => "VARCHAR(80) NULL",
        'bio_en' => "TEXT NULL",
        'bio_es' => "TEXT NULL",
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
