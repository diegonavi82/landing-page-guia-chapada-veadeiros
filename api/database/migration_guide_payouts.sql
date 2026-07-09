-- Pagamentos PIX a guias cadastrados
-- Executar em phpMyAdmin no banco u431245201_GuiaChapadaV

-- Se alguma coluna já existir, ignore o erro e continue.
ALTER TABLE gcv_guides ADD COLUMN pix_key VARCHAR(120) NULL AFTER phone;
ALTER TABLE gcv_guides ADD COLUMN pix_key_type ENUM('cpf','cnpj','email','phone','random') NULL AFTER pix_key;
ALTER TABLE gcv_guides ADD COLUMN pix_holder_name VARCHAR(120) NULL AFTER pix_key_type;
ALTER TABLE gcv_guides ADD COLUMN pix_verified_at DATETIME NULL AFTER pix_holder_name;
ALTER TABLE gcv_guides ADD COLUMN pix_verified_by INT UNSIGNED NULL AFTER pix_verified_at;

CREATE TABLE IF NOT EXISTS gcv_guide_payouts (
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
  FOREIGN KEY (guide_user_id) REFERENCES gcv_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES gcv_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (confirmed_by) REFERENCES gcv_users(id) ON DELETE SET NULL,
  INDEX idx_payout_status (status),
  INDEX idx_payout_guide (guide_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_guide_payout_audit (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payout_id   INT UNSIGNED NULL,
  admin_id    INT UNSIGNED NOT NULL,
  action      VARCHAR(60) NOT NULL,
  detail      TEXT NULL,
  ip          VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payout_id) REFERENCES gcv_guide_payouts(id) ON DELETE SET NULL,
  FOREIGN KEY (admin_id) REFERENCES gcv_users(id) ON DELETE CASCADE,
  INDEX idx_audit_payout (payout_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
