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
    gcv_marketplace_ensure_sales_client_columns($pdo);
    gcv_marketplace_ensure_payout_columns($pdo);
    gcv_marketplace_ensure_checkin_columns($pdo);
    gcv_marketplace_ensure_reviews($pdo);
    gcv_marketplace_ensure_settings($pdo);
    gcv_marketplace_retract_unapproved_guide_excursions($pdo);
    require_once __DIR__ . '/inbox.php';
    gcv_inbox_ensure_schema();
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
                 VALUES ('global', NULL, 10.000, 'Comissão global padrão', 1)"
            );
        } else {
            $pdo->exec(
                "UPDATE gcv_commission_rules
                 SET commission_pct = 10.000
                 WHERE scope_type = 'global' AND scope_id IS NULL AND deleted_at IS NULL AND is_active = 1
                   AND commission_pct IN (14.000, 16.000)"
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
        'preconfirmed_people' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0',
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

/**
 * Passeios enviados por guia que estão no ar sem aprovação voltam para a fila.
 * Não mexe em saídas já vendidas (booked/sales PAGAS).
 */
function gcv_marketplace_retract_unapproved_guide_excursions(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        $hasSales = false;
        try {
            $hasSales = (bool)$pdo->query("SHOW TABLES LIKE 'gcv_sales'")->fetchColumn();
        } catch (Throwable $e) {
            $hasSales = false;
        }
        $sql = "UPDATE gcv_excursions e
                LEFT JOIN gcv_users u ON u.id = e.created_by
                SET e.status = 'pending_approval', e.approved_at = NULL, e.approved_by = NULL
                WHERE e.status IN ('published','soldout')
                  AND e.approved_at IS NULL
                  AND e.deleted_at IS NULL
                  AND e.booked_people = 0
                  AND (
                    e.created_by_origin = 'GUIDE'
                    OR e.business_mode = 'GUIDE_MARKETPLACE'
                    OR (
                      e.guide_user_id IS NOT NULL
                      AND e.created_by IS NOT NULL
                      AND e.created_by = e.guide_user_id
                      AND (u.role IS NULL OR u.role <> 'admin')
                    )
                  )";
        if ($hasSales) {
            $sql .= " AND NOT EXISTS (
                SELECT 1 FROM gcv_sales s
                WHERE s.excursion_id = e.id
                  AND s.deleted_at IS NULL
                  AND s.sale_status = 'PAID'
            )";
        }
        $pdo->exec($sql);
    } catch (Throwable $e) {
        error_log('retract unapproved guide excursions: ' . $e->getMessage());
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

function gcv_marketplace_ensure_sales_client_columns(PDO $pdo): void
{
    $existing = gcv_marketplace_column_map($pdo, 'gcv_sales');
    if ($existing === null) {
        return;
    }
    if (!isset($existing['tourist_phone'])) {
        try {
            $pdo->exec('ALTER TABLE gcv_sales ADD COLUMN tourist_phone VARCHAR(30) NULL AFTER tourist_email');
        } catch (Throwable $e) {
            error_log('sales tourist_phone col: ' . $e->getMessage());
        }
    }
}

function gcv_marketplace_ensure_payout_columns(PDO $pdo): void
{
    $salesCols = gcv_marketplace_column_map($pdo, 'gcv_sales');
    if ($salesCols !== null && !isset($salesCols['payout_fail_notified_at'])) {
        try {
            $pdo->exec('ALTER TABLE gcv_sales ADD COLUMN payout_fail_notified_at DATETIME NULL');
        } catch (Throwable $e) {
            error_log('sales payout_fail_notified_at col: ' . $e->getMessage());
        }
    }

    gcv_marketplace_reschedule_payouts_to_17h($pdo);

    $existing = gcv_marketplace_column_map($pdo, 'gcv_sale_payouts');
    if ($existing === null) {
        return;
    }
    if (!isset($existing['sicoob_response'])) {
        try {
            $pdo->exec('ALTER TABLE gcv_sale_payouts ADD COLUMN sicoob_response TEXT NULL');
        } catch (Throwable $e) {
            error_log('sale_payouts sicoob_response col: ' . $e->getMessage());
        }
    }
}

function gcv_marketplace_reschedule_payouts_to_17h(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        $time = '16:20:00';
        try {
            if (function_exists('gcv_payout_after_sql_time')) {
                $time = gcv_payout_after_sql_time();
            }
        } catch (Throwable $e) {
            $time = '16:20:00';
        }
        $pdo->exec(
            "UPDATE gcv_sales
             SET scheduled_payout_at = CONCAT(DATE(COALESCE(excursion_starts_at, scheduled_payout_at, sold_at)), ' {$time}')
             WHERE deleted_at IS NULL
               AND sale_status = 'PAID'
               AND payout_status = 'PAYOUT_PENDING'
               AND COALESCE(excursion_starts_at, scheduled_payout_at, sold_at) IS NOT NULL"
        );
    } catch (Throwable $e) {
        error_log('reschedule payouts 16h20: ' . $e->getMessage());
    }
}

function gcv_marketplace_ensure_checkin_columns(PDO $pdo): void
{
    $sales = gcv_marketplace_column_map($pdo, 'gcv_sales');
    if ($sales !== null) {
        $add = [
            'attendance_status' => "ALTER TABLE gcv_sales ADD COLUMN attendance_status VARCHAR(20) NULL DEFAULT 'pending'",
            'checked_in_at' => 'ALTER TABLE gcv_sales ADD COLUMN checked_in_at DATETIME NULL',
            'checked_in_by' => 'ALTER TABLE gcv_sales ADD COLUMN checked_in_by INT UNSIGNED NULL',
            'notify_d12h_sent_at' => 'ALTER TABLE gcv_sales ADD COLUMN notify_d12h_sent_at DATETIME NULL',
            'notify_dayof_sent_at' => 'ALTER TABLE gcv_sales ADD COLUMN notify_dayof_sent_at DATETIME NULL',
            'notify_pix_paid_sent_at' => 'ALTER TABLE gcv_sales ADD COLUMN notify_pix_paid_sent_at DATETIME NULL',
            'notify_h2_sent_at' => 'ALTER TABLE gcv_sales ADD COLUMN notify_h2_sent_at DATETIME NULL',
            'notify_m15_sent_at' => 'ALTER TABLE gcv_sales ADD COLUMN notify_m15_sent_at DATETIME NULL',
            'notify_review_sent_at' => 'ALTER TABLE gcv_sales ADD COLUMN notify_review_sent_at DATETIME NULL',
            'review_token' => 'ALTER TABLE gcv_sales ADD COLUMN review_token CHAR(64) NULL',
            'guide_amount_original_cents' => 'ALTER TABLE gcv_sales ADD COLUMN guide_amount_original_cents INT NULL',
            'platform_revenue_original_cents' => 'ALTER TABLE gcv_sales ADD COLUMN platform_revenue_original_cents INT NULL',
        ];
        foreach ($add as $col => $sql) {
            if (!isset($sales[$col])) {
                try {
                    $pdo->exec($sql);
                    $sales[$col] = true;
                } catch (Throwable $e) {
                    error_log('sales ' . $col . ': ' . $e->getMessage());
                }
            }
        }
    }
    $exc = gcv_marketplace_column_map($pdo, 'gcv_excursions');
    if ($exc !== null) {
        foreach ([
            'notify_confirmed_at' => 'ALTER TABLE gcv_excursions ADD COLUMN notify_confirmed_at DATETIME NULL',
            'notify_approved_at' => 'ALTER TABLE gcv_excursions ADD COLUMN notify_approved_at DATETIME NULL',
            'notify_d12h_guide_at' => 'ALTER TABLE gcv_excursions ADD COLUMN notify_d12h_guide_at DATETIME NULL',
            'notify_h2_guide_at' => 'ALTER TABLE gcv_excursions ADD COLUMN notify_h2_guide_at DATETIME NULL',
            'notify_m15_guide_at' => 'ALTER TABLE gcv_excursions ADD COLUMN notify_m15_guide_at DATETIME NULL',
            'notify_dayof_guide_at' => 'ALTER TABLE gcv_excursions ADD COLUMN notify_dayof_guide_at DATETIME NULL',
        ] as $col => $sql) {
            if (!isset($exc[$col])) {
                try {
                    $pdo->exec($sql);
                    $exc[$col] = true;
                } catch (Throwable $e) {
                    error_log('excursions ' . $col . ': ' . $e->getMessage());
                }
            }
        }
    }
}

function gcv_marketplace_ensure_reviews(PDO $pdo): void
{
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_guide_reviews (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              sale_id BIGINT UNSIGNED NOT NULL,
              reservation_id VARCHAR(16) NOT NULL,
              excursion_id INT UNSIGNED NULL,
              guide_user_id INT UNSIGNED NOT NULL,
              guide_name VARCHAR(190) NULL,
              tourist_name VARCHAR(190) NULL,
              tourist_email VARCHAR(190) NULL,
              tour_date DATE NULL,
              excursion_title VARCHAR(255) NULL,
              score_punctuality TINYINT UNSIGNED NOT NULL,
              score_knowledge TINYINT UNSIGNED NOT NULL,
              score_service TINYINT UNSIGNED NOT NULL,
              score_avg DECIMAL(3,2) NOT NULL,
              comment TEXT NULL,
              photos_json TEXT NULL,
              hidden_by_admin TINYINT(1) NOT NULL DEFAULT 0,
              hidden_by_tourist TINYINT(1) NOT NULL DEFAULT 0,
              locale VARCHAR(8) NOT NULL DEFAULT 'pt',
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uq_review_sale (sale_id),
              UNIQUE KEY uq_review_reservation (reservation_id),
              INDEX idx_review_guide_public (guide_user_id, hidden_by_admin, hidden_by_tourist),
              INDEX idx_review_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('ensure reviews table: ' . $e->getMessage());
    }
    $sales = gcv_marketplace_column_map($pdo, 'gcv_sales');
    if ($sales !== null && !isset($sales['review_token'])) {
        try {
            $pdo->exec('ALTER TABLE gcv_sales ADD COLUMN review_token CHAR(64) NULL');
        } catch (Throwable $e) {
            error_log('sales review_token: ' . $e->getMessage());
        }
    }
    $hasIdx = false;
    try {
        $ix = $pdo->query('SHOW INDEX FROM gcv_sales');
        foreach (($ix ? $ix->fetchAll(PDO::FETCH_ASSOC) : []) as $row) {
            if (($row['Key_name'] ?? '') === 'uq_sales_review_token') {
                $hasIdx = true;
                break;
            }
        }
    } catch (Throwable $e) {
        $hasIdx = true;
    }
    if (!$hasIdx) {
        try {
            $pdo->exec('CREATE UNIQUE INDEX uq_sales_review_token ON gcv_sales (review_token)');
        } catch (Throwable $e) {
            error_log('sales review_token index: ' . $e->getMessage());
        }
    }
}

function gcv_marketplace_ensure_settings(PDO $pdo): void
{
    $seeds = [
        ['payout_delay_hours', '6', 'Legado — o repasse automático usa 16h20 do dia do passeio', 'integer'],
        ['payout_after_hour', '16', 'Hora (Brasília) do PIX automático ao guia no dia do passeio', 'integer'],
        ['payout_after_minute', '20', 'Minuto (Brasília) do PIX automático ao guia no dia do passeio', 'integer'],
        ['platform_commission_pct', '10', 'Comissão da plataforma (%) aplicada em todos os passeios', 'percent'],
        ['guide_net_min_reais', '50', 'Diária mínima do guia (R$ por pessoa)', 'integer'],
        ['guide_net_max_reais', '160', 'Diária máxima do guia (R$ por pessoa)', 'integer'],
        ['guide_net_max_dragao_reais', '190', 'Diária máxima do guia na Cachoeira do Dragão (R$ por pessoa)', 'integer'],
        ['notify_guide_hours_long', '24', 'Guia: aviso longo (horas antes do passeio) — lista dos grupos', 'integer'],
        ['notify_guide_hours_short', '3', 'Guia: aviso curto (horas antes do início)', 'integer'],
        ['notify_client_hours_long', '24', 'Cliente: aviso longo (horas antes do passeio)', 'integer'],
        ['notify_client_hours_short', '2', 'Cliente: aviso curto (horas antes do passeio)', 'integer'],
        ['notify_arrive_minutes', '15', 'Chegada: minutos de antecedência (0 = não enviar)', 'integer'],
        ['notify_late_tolerance_minutes', '15', 'Excursão: tolerância de atraso em minutos (0 = sem frase de tolerância)', 'integer'],
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
    try {
        $pdo->exec(
            "UPDATE gcv_settings
             SET label = 'Comissão da plataforma (%) aplicada em todos os passeios'
             WHERE key_name = 'platform_commission_pct'"
        );
        $pdo->exec(
            "UPDATE gcv_settings
             SET value = '10'
             WHERE key_name = 'platform_commission_pct' AND value IN ('14', '16')"
        );
        $pdo->exec(
            "UPDATE gcv_settings
             SET value = '16',
                 label = 'Hora (Brasília) do PIX automático ao guia no dia do passeio'
             WHERE key_name = 'payout_after_hour' AND value = '17'"
        );
        $pdo->exec(
            "UPDATE gcv_settings
             SET label = 'Legado — o repasse automático usa 16h20 do dia do passeio'
             WHERE key_name = 'payout_delay_hours'"
        );
        $pdo->exec(
            "UPDATE gcv_settings
             SET value = '160',
                 label = 'Diária máxima do guia (R$ por pessoa)'
             WHERE key_name = 'guide_net_max_reais' AND value = '150'"
        );
        $pdo->exec(
            "UPDATE gcv_settings
             SET label = 'Diária mínima do guia (R$ por pessoa)'
             WHERE key_name = 'guide_net_min_reais'"
        );
        $pdo->exec(
            "UPDATE gcv_settings
             SET label = 'Diária máxima do guia na Cachoeira do Dragão (R$ por pessoa)'
             WHERE key_name = 'guide_net_max_dragao_reais'"
        );
    } catch (Throwable $e) {
        // ignore
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
