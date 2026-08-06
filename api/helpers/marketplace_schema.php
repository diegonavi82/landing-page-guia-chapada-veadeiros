<?php
declare(strict_types=1);

/**
 * Auto-migração idempotente do módulo Marketplace + Financeiro.
 */
require_once __DIR__ . '/db.php';

function gcv_marketplace_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    $pdo = db();
    $sqlFile = dirname(__DIR__) . '/database/migration_marketplace_financeiro.sql';
    if (is_file($sqlFile)) {
        $raw = file_get_contents($sqlFile);
        if ($raw !== false) {
            $parts = preg_split('/;\s*\n/', $raw) ?: [];
            foreach ($parts as $stmt) {
                $stmt = trim($stmt);
                if ($stmt === '' || str_starts_with($stmt, '--')) {
                    continue;
                }
                if (!preg_match('/^\s*(CREATE\s+TABLE|INSERT\s+INTO|UPDATE\s+)/i', $stmt)) {
                    continue;
                }
                try {
                    $pdo->exec($stmt);
                } catch (Throwable $e) {
                    error_log('marketplace_schema sql: ' . $e->getMessage());
                }
            }
        }
    }

    gcv_marketplace_ensure_tables($pdo);
    gcv_marketplace_ensure_excursion_finance_columns($pdo);
    gcv_marketplace_ensure_guide_finance_columns($pdo);
    gcv_marketplace_ensure_settings($pdo);
}

function gcv_marketplace_ensure_tables(PDO $pdo): void
{
    $creates = [
        "CREATE TABLE IF NOT EXISTS gcv_commission_rules (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          scope_type ENUM('global','guide','category','city','excursion') NOT NULL,
          scope_id INT UNSIGNED NULL,
          commission_pct DECIMAL(6,3) NOT NULL,
          label VARCHAR(200) NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_by INT UNSIGNED NULL,
          updated_by INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL,
          INDEX idx_comm_scope (scope_type, scope_id, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_audit_log (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          entity_type VARCHAR(80) NOT NULL,
          entity_id VARCHAR(64) NOT NULL,
          action VARCHAR(80) NOT NULL,
          field_name VARCHAR(120) NULL,
          old_value MEDIUMTEXT NULL,
          new_value MEDIUMTEXT NULL,
          user_id INT UNSIGNED NULL,
          ip VARCHAR(45) NULL,
          origin VARCHAR(40) NULL,
          meta_json JSON NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_audit_entity (entity_type, entity_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_sales (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          reservation_id VARCHAR(32) NOT NULL,
          excursion_id INT UNSIGNED NULL,
          booking_id INT UNSIGNED NULL,
          tourist_user_id INT UNSIGNED NULL,
          tourist_name VARCHAR(160) NULL,
          tourist_email VARCHAR(180) NULL,
          tourist_cpf VARCHAR(14) NULL,
          guide_user_id INT UNSIGNED NULL,
          guide_name VARCHAR(160) NULL,
          guide_cpf VARCHAR(14) NULL,
          guide_cnpj VARCHAR(18) NULL,
          city_id INT UNSIGNED NULL,
          city_name VARCHAR(160) NULL,
          attraction_id INT UNSIGNED NULL,
          category_key VARCHAR(80) NULL,
          excursion_title VARCHAR(255) NULL,
          spots TINYINT UNSIGNED NOT NULL DEFAULT 1,
          sold_price_cents INT UNSIGNED NOT NULL,
          unit_price_cents INT UNSIGNED NOT NULL,
          guide_amount_cents INT UNSIGNED NOT NULL,
          platform_revenue_cents INT UNSIGNED NOT NULL,
          commission_pct_applied DECIMAL(6,3) NOT NULL,
          commission_rule_id INT UNSIGNED NULL,
          business_mode ENUM('ADMINISTRATIVE','GUIDE_MARKETPLACE') NOT NULL,
          created_by_origin ENUM('ADMIN','GUIDE','CURSOR','IMPORT','API','AI') NOT NULL DEFAULT 'ADMIN',
          sale_status ENUM('PENDING','PAID','CANCELLED','REFUNDED','DISPUTED') NOT NULL DEFAULT 'PENDING',
          payout_status ENUM('PAYOUT_PENDING','PAYOUT_PAID','PAYOUT_REVIEW','PAYOUT_BLOCKED') NOT NULL DEFAULT 'PAYOUT_PENDING',
          excursion_starts_at DATETIME NULL,
          scheduled_payout_at DATETIME NULL,
          paid_at DATETIME NULL,
          sold_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_sale_reservation (reservation_id),
          INDEX idx_sale_guide (guide_user_id, sold_at),
          INDEX idx_sale_status (sale_status, payout_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_pix_payments (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          sale_id BIGINT UNSIGNED NULL,
          reservation_id VARCHAR(32) NOT NULL,
          txid VARCHAR(64) NULL,
          end_to_end_id VARCHAR(64) NULL,
          amount_cents INT UNSIGNED NOT NULL,
          pix_key_used VARCHAR(180) NULL,
          status ENUM('PENDING','PAID','EXPIRED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
          paid_at DATETIME NULL,
          paid_date DATE NULL,
          paid_time TIME NULL,
          provider VARCHAR(40) NOT NULL DEFAULT 'sicoob',
          raw_payload JSON NULL,
          idempotency_key VARCHAR(80) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL,
          UNIQUE KEY uq_pix_reservation (reservation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_sale_payouts (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          sale_id BIGINT UNSIGNED NOT NULL,
          guide_user_id INT UNSIGNED NOT NULL,
          amount_cents INT UNSIGNED NOT NULL,
          paid_at DATETIME NULL,
          paid_date DATE NULL,
          paid_time TIME NULL,
          pix_key VARCHAR(180) NOT NULL,
          pix_key_type ENUM('cpf','cnpj','email','phone','random') NOT NULL,
          txid VARCHAR(64) NULL,
          end_to_end_id VARCHAR(64) NULL,
          receipt_url VARCHAR(500) NULL,
          notes TEXT NULL,
          status ENUM('PAYOUT_PENDING','PAYOUT_PAID','PAYOUT_REVIEW','PAYOUT_BLOCKED') NOT NULL DEFAULT 'PAYOUT_PENDING',
          idempotency_key VARCHAR(80) NOT NULL,
          responsible_user_id INT UNSIGNED NOT NULL,
          auto_eligible TINYINT(1) NOT NULL DEFAULT 0,
          scheduled_payout_at DATETIME NULL,
          executed_via ENUM('manual','sicoob_api') NOT NULL DEFAULT 'manual',
          sicoob_response TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL,
          UNIQUE KEY uq_payout_idem (idempotency_key),
          INDEX idx_payout_sale (sale_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS gcv_guide_financial (
          guide_user_id INT UNSIGNED NOT NULL PRIMARY KEY,
          legal_name VARCHAR(160) NOT NULL,
          person_type ENUM('PF','PJ') NOT NULL DEFAULT 'PF',
          cpf VARCHAR(14) NULL,
          cnpj VARCHAR(18) NULL,
          pix_key VARCHAR(180) NOT NULL,
          pix_key_type ENUM('cpf','cnpj','email','phone','random') NOT NULL,
          pix_holder_name VARCHAR(160) NOT NULL,
          bank_name VARCHAR(120) NULL,
          bank_agency VARCHAR(20) NULL,
          bank_account VARCHAR(40) NULL,
          status ENUM('incomplete','pending_review','active','blocked') NOT NULL DEFAULT 'incomplete',
          verified_at DATETIME NULL,
          verified_by INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($creates as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            error_log('marketplace_tables: ' . $e->getMessage());
        }
    }

    try {
        $exists = $pdo->query(
            "SELECT id FROM gcv_commission_rules WHERE scope_type='global' AND deleted_at IS NULL LIMIT 1"
        )->fetch();
        if (!$exists) {
            $pdo->exec(
                "INSERT INTO gcv_commission_rules (scope_type, scope_id, commission_pct, label, is_active)
                 VALUES ('global', NULL, 16.000, 'Comissão global padrão', 1)"
            );
        }
    } catch (Throwable $e) {
        // ignore
    }
}

function gcv_marketplace_ensure_excursion_finance_columns(PDO $pdo): void
{
    $cols = [
        'business_mode' => "ENUM('ADMINISTRATIVE','GUIDE_MARKETPLACE') NOT NULL DEFAULT 'ADMINISTRATIVE'",
        'created_by_origin' => "ENUM('ADMIN','GUIDE','CURSOR','IMPORT','API','AI') NOT NULL DEFAULT 'ADMIN'",
        'guide_net_cents' => 'INT UNSIGNED NULL',
        'commission_rule_id' => 'INT UNSIGNED NULL',
        'commission_pct_applied' => 'DECIMAL(6,3) NULL',
        'commission_cents' => 'INT UNSIGNED NULL',
        'price_before_round_cents' => 'INT UNSIGNED NULL',
        'rounding_diff_cents' => 'INT UNSIGNED NULL',
        'platform_margin_cents' => 'INT UNSIGNED NULL',
        'guide_payout_planned_cents' => 'INT UNSIGNED NULL',
        'approval_note' => 'TEXT NULL',
        'rejection_reason' => 'TEXT NULL',
        'approved_at' => 'DATETIME NULL',
        'approved_by' => 'INT UNSIGNED NULL',
        'deleted_at' => 'DATETIME NULL',
    ];

    $existing = gcv_marketplace_column_map($pdo, 'gcv_excursions');
    if ($existing === null) {
        return;
    }

    foreach ($cols as $name => $def) {
        if (isset($existing[strtolower($name)])) {
            continue;
        }
        try {
            $pdo->exec("ALTER TABLE gcv_excursions ADD COLUMN `{$name}` {$def}");
        } catch (Throwable $e) {
            error_log('excursion finance col ' . $name . ': ' . $e->getMessage());
        }
    }

    // Amplia ENUM de status com pending_approval / rejected
    try {
        $pdo->exec(
            "ALTER TABLE gcv_excursions MODIFY COLUMN status
             ENUM('draft','pending_approval','published','cancelled','soldout','rejected')
             NOT NULL DEFAULT 'draft'"
        );
    } catch (Throwable $e) {
        // ignore se não suportado
    }
}

function gcv_marketplace_ensure_guide_finance_columns(PDO $pdo): void
{
    $cols = [
        'cnpj' => 'VARCHAR(18) NULL',
        'person_type' => "ENUM('PF','PJ') NULL DEFAULT 'PF'",
        'bank_name' => 'VARCHAR(120) NULL',
        'bank_agency' => 'VARCHAR(20) NULL',
        'bank_account' => 'VARCHAR(40) NULL',
    ];
    $existing = gcv_marketplace_column_map($pdo, 'gcv_guides');
    if ($existing === null) {
        return;
    }
    foreach ($cols as $name => $def) {
        if (isset($existing[strtolower($name)])) {
            continue;
        }
        try {
            $pdo->exec("ALTER TABLE gcv_guides ADD COLUMN `{$name}` {$def}");
        } catch (Throwable $e) {
            // ignore
        }
    }
}

function gcv_marketplace_ensure_settings(PDO $pdo): void
{
    $seeds = [
        ['payout_delay_hours', '6', 'Horas após início da excursão para liberar repasse automático (futuro)', 'integer'],
        ['platform_commission_pct', '16', 'Comissão da plataforma (%) — legado; preferir gcv_commission_rules', 'percent'],
    ];
    $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
    $ins = $pdo->prepare(
        'INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)'
    );
    foreach ($seeds as [$key, $val, $label, $type]) {
        try {
            $check->execute([$key]);
            if (!$check->fetch()) {
                $ins->execute([$key, $val, $label, $type]);
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
}

/** @return array<string,bool>|null */
function gcv_marketplace_column_map(PDO $pdo, string $table): ?array
{
    try {
        $rows = $pdo->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`')->fetchAll();
    } catch (Throwable $e) {
        return null;
    }
    $existing = [];
    foreach ($rows as $r) {
        $existing[strtolower((string)$r['Field'])] = true;
    }
    return $existing;
}
