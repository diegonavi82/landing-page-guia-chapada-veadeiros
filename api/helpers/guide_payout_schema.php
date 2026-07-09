<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Garante colunas/tabelas de PIX e payouts (idempotente).
 */
function gcv_ensure_guide_payout_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $pdo = db();

    $cols = $pdo->query('SHOW COLUMNS FROM gcv_guides')->fetchAll(PDO::FETCH_COLUMN);
    $add = [
        'pix_key' => "ALTER TABLE gcv_guides ADD COLUMN pix_key VARCHAR(120) NULL AFTER phone",
        'pix_key_type' => "ALTER TABLE gcv_guides ADD COLUMN pix_key_type ENUM('cpf','cnpj','email','phone','random') NULL AFTER pix_key",
        'pix_holder_name' => "ALTER TABLE gcv_guides ADD COLUMN pix_holder_name VARCHAR(120) NULL AFTER pix_key_type",
        'pix_verified_at' => "ALTER TABLE gcv_guides ADD COLUMN pix_verified_at DATETIME NULL AFTER pix_holder_name",
        'pix_verified_by' => "ALTER TABLE gcv_guides ADD COLUMN pix_verified_by INT UNSIGNED NULL AFTER pix_verified_at",
    ];
    foreach ($add as $col => $sql) {
        if (!in_array($col, $cols, true)) {
            $pdo->exec($sql);
        }
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_guide_payouts (
          id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          guide_user_id     INT UNSIGNED NOT NULL,
          amount_cents      INT UNSIGNED NOT NULL,
          pix_key_snapshot  VARCHAR(120) NOT NULL,
          pix_key_type      ENUM('cpf','cnpj','email','phone','random') NOT NULL,
          description       VARCHAR(200) NOT NULL DEFAULT '',
          status            ENUM('draft','queued','processing','paid','failed','cancelled') NOT NULL DEFAULT 'draft',
          idempotency_key   VARCHAR(64) NOT NULL UNIQUE,
          sicoob_end_to_end VARCHAR(64) NULL,
          sicoob_response   TEXT NULL,
          error_message     VARCHAR(500) NULL,
          created_by        INT UNSIGNED NOT NULL,
          confirmed_by      INT UNSIGNED NULL,
          confirmed_at      DATETIME NULL,
          paid_at           DATETIME NULL,
          created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_payout_status (status),
          INDEX idx_payout_guide (guide_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_guide_payout_audit (
          id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          payout_id   INT UNSIGNED NULL,
          admin_id    INT UNSIGNED NOT NULL,
          action      VARCHAR(60) NOT NULL,
          detail      TEXT NULL,
          ip          VARCHAR(45) NULL,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_audit_payout (payout_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $done = true;
}

function gcv_payout_audit(?int $payoutId, int $adminId, string $action, ?string $detail = null): void
{
    db()->prepare(
        'INSERT INTO gcv_guide_payout_audit (payout_id, admin_id, action, detail, ip) VALUES (?,?,?,?,?)'
    )->execute([
        $payoutId,
        $adminId,
        mb_substr($action, 0, 60),
        $detail !== null ? mb_substr($detail, 0, 4000) : null,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
    ]);
}
