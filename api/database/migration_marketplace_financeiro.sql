-- Guia Chapada Veadeiros — Marketplace + Financeiro
-- Executar após migrations.sql / migration_cms.sql (ou via auto-schema).
-- Soft-delete apenas; nunca apagar registros financeiros.

-- ---------------------------------------------------------------------------
-- 1) Regras de comissão (prioridade: excursão > guia > categoria > cidade > global)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gcv_commission_rules (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scope_type      ENUM('global','guide','category','city','excursion') NOT NULL,
  scope_id        INT UNSIGNED NULL COMMENT 'NULL apenas para global',
  commission_pct  DECIMAL(6,3) NOT NULL,
  label           VARCHAR(200) NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  INDEX idx_comm_scope (scope_type, scope_id, is_active),
  INDEX idx_comm_active (is_active, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO gcv_commission_rules (scope_type, scope_id, commission_pct, label, is_active)
SELECT 'global', NULL, 14.000, 'Comissão global padrão', 1
WHERE NOT EXISTS (
  SELECT 1 FROM gcv_commission_rules
  WHERE scope_type = 'global' AND scope_id IS NULL AND deleted_at IS NULL
);

-- ---------------------------------------------------------------------------
-- 2) Auditoria genérica (nunca excluir)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gcv_audit_log (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type     VARCHAR(80) NOT NULL,
  entity_id       VARCHAR(64) NOT NULL,
  action          VARCHAR(80) NOT NULL,
  field_name      VARCHAR(120) NULL,
  old_value       MEDIUMTEXT NULL,
  new_value       MEDIUMTEXT NULL,
  user_id         INT UNSIGNED NULL,
  ip              VARCHAR(45) NULL,
  origin          VARCHAR(40) NULL COMMENT 'ADMIN|GUIDE|CURSOR|IMPORT|API|AI|SYSTEM|WEBHOOK',
  meta_json       JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id, created_at),
  INDEX idx_audit_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3) Snapshot financeiro imutável de cada venda
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gcv_sales (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id          VARCHAR(32) NOT NULL,
  excursion_id            INT UNSIGNED NULL,
  booking_id              INT UNSIGNED NULL,
  tourist_user_id         INT UNSIGNED NULL,
  tourist_name            VARCHAR(160) NULL,
  tourist_email           VARCHAR(180) NULL,
  tourist_cpf             VARCHAR(14) NULL,
  guide_user_id           INT UNSIGNED NULL,
  guide_name              VARCHAR(160) NULL,
  guide_cpf               VARCHAR(14) NULL,
  guide_cnpj              VARCHAR(18) NULL,
  city_id                 INT UNSIGNED NULL,
  city_name               VARCHAR(160) NULL,
  attraction_id           INT UNSIGNED NULL,
  category_key            VARCHAR(80) NULL,
  excursion_title         VARCHAR(255) NULL,
  spots                   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  sold_price_cents        INT UNSIGNED NOT NULL COMMENT 'preço total cobrado',
  unit_price_cents        INT UNSIGNED NOT NULL COMMENT 'preço unitário publicado no momento',
  guide_amount_cents      INT UNSIGNED NOT NULL,
  platform_revenue_cents  INT UNSIGNED NOT NULL,
  commission_pct_applied  DECIMAL(6,3) NOT NULL,
  commission_rule_id      INT UNSIGNED NULL,
  business_mode           ENUM('ADMINISTRATIVE','GUIDE_MARKETPLACE') NOT NULL,
  created_by_origin       ENUM('ADMIN','GUIDE','CURSOR','IMPORT','API','AI') NOT NULL DEFAULT 'ADMIN',
  sale_status             ENUM('PENDING','PAID','CANCELLED','REFUNDED','DISPUTED') NOT NULL DEFAULT 'PENDING',
  payout_status           ENUM('PAYOUT_PENDING','PAYOUT_PAID','PAYOUT_REVIEW','PAYOUT_BLOCKED') NOT NULL DEFAULT 'PAYOUT_PENDING',
  excursion_starts_at     DATETIME NULL,
  scheduled_payout_at     DATETIME NULL,
  paid_at                 DATETIME NULL,
  sold_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at              DATETIME NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sale_reservation (reservation_id),
  INDEX idx_sale_guide (guide_user_id, sold_at),
  INDEX idx_sale_status (sale_status, payout_status),
  INDEX idx_sale_mode (business_mode, created_by_origin),
  INDEX idx_sale_city (city_id),
  INDEX idx_sale_excursion (excursion_id),
  INDEX idx_sale_scheduled (scheduled_payout_at, payout_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4) Pagamentos PIX (conta PJ plataforma) — preparação Sicoob
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gcv_pix_payments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id           BIGINT UNSIGNED NULL,
  reservation_id    VARCHAR(32) NOT NULL,
  txid              VARCHAR(64) NULL,
  end_to_end_id     VARCHAR(64) NULL,
  amount_cents      INT UNSIGNED NOT NULL,
  pix_key_used      VARCHAR(180) NULL,
  status            ENUM('PENDING','PAID','EXPIRED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  paid_at           DATETIME NULL,
  paid_date         DATE NULL,
  paid_time         TIME NULL,
  provider          VARCHAR(40) NOT NULL DEFAULT 'sicoob',
  raw_payload       JSON NULL,
  idempotency_key   VARCHAR(80) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL,
  UNIQUE KEY uq_pix_reservation (reservation_id),
  UNIQUE KEY uq_pix_txid (txid),
  UNIQUE KEY uq_pix_e2e (end_to_end_id),
  UNIQUE KEY uq_pix_idem (idempotency_key),
  INDEX idx_pix_sale (sale_id),
  INDEX idx_pix_status (status, paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5) Repasses ao guia (manual agora; automático futuro via Sicoob)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gcv_sale_payouts (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id             BIGINT UNSIGNED NOT NULL,
  guide_user_id       INT UNSIGNED NOT NULL,
  amount_cents        INT UNSIGNED NOT NULL,
  paid_at             DATETIME NULL,
  paid_date           DATE NULL,
  paid_time           TIME NULL,
  pix_key             VARCHAR(180) NOT NULL,
  pix_key_type        ENUM('cpf','cnpj','email','phone','random') NOT NULL,
  txid                VARCHAR(64) NULL,
  end_to_end_id       VARCHAR(64) NULL,
  receipt_url         VARCHAR(500) NULL,
  notes               TEXT NULL,
  status              ENUM('PAYOUT_PENDING','PAYOUT_PAID','PAYOUT_REVIEW','PAYOUT_BLOCKED') NOT NULL DEFAULT 'PAYOUT_PENDING',
  idempotency_key     VARCHAR(80) NOT NULL,
  responsible_user_id INT UNSIGNED NOT NULL,
  auto_eligible       TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'prep. futuro automatico',
  scheduled_payout_at DATETIME NULL,
  executed_via        ENUM('manual','sicoob_api') NOT NULL DEFAULT 'manual',
  sicoob_response     TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  UNIQUE KEY uq_payout_idem (idempotency_key),
  UNIQUE KEY uq_payout_e2e (end_to_end_id),
  INDEX idx_payout_sale (sale_id),
  INDEX idx_payout_guide (guide_user_id, status),
  INDEX idx_payout_status (status, scheduled_payout_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6) Perfil financeiro do guia (obrigatório para repasse)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gcv_guide_financial (
  guide_user_id     INT UNSIGNED NOT NULL PRIMARY KEY,
  legal_name        VARCHAR(160) NOT NULL,
  person_type       ENUM('PF','PJ') NOT NULL DEFAULT 'PF',
  cpf               VARCHAR(14) NULL,
  cnpj              VARCHAR(18) NULL,
  pix_key           VARCHAR(180) NOT NULL,
  pix_key_type      ENUM('cpf','cnpj','email','phone','random') NOT NULL,
  pix_holder_name   VARCHAR(160) NOT NULL,
  bank_name         VARCHAR(120) NULL,
  bank_agency       VARCHAR(20) NULL,
  bank_account      VARCHAR(40) NULL,
  status            ENUM('incomplete','pending_review','active','blocked') NOT NULL DEFAULT 'incomplete',
  verified_at       DATETIME NULL,
  verified_by       INT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7) Configurações financeiras (payoutDelayHours etc.)
-- ---------------------------------------------------------------------------
INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'payout_delay_hours', '6', 'Horas após início da excursão para liberar repasse automático (futuro)', 'integer'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'payout_delay_hours');

INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'platform_commission_pct', '14', 'Comissão da plataforma (%) — legado; preferir gcv_commission_rules', 'percent'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'platform_commission_pct');

UPDATE gcv_settings
SET value = '14', label = 'Comissão da plataforma (%) — legado; preferir gcv_commission_rules'
WHERE key_name = 'platform_commission_pct'
  AND value = '16';

-- ---------------------------------------------------------------------------
-- 8) Colunas em gcv_excursions (ALTER — ignore se já existir via auto-schema)
-- ---------------------------------------------------------------------------
-- ALTER TABLE gcv_excursions ADD COLUMN business_mode ENUM('ADMINISTRATIVE','GUIDE_MARKETPLACE') NOT NULL DEFAULT 'ADMINISTRATIVE';
-- ALTER TABLE gcv_excursions ADD COLUMN created_by_origin ENUM('ADMIN','GUIDE','CURSOR','IMPORT','API','AI') NOT NULL DEFAULT 'ADMIN';
-- ALTER TABLE gcv_excursions MODIFY COLUMN status ENUM('draft','pending_approval','published','cancelled','soldout','rejected') NOT NULL DEFAULT 'draft';
-- ALTER TABLE gcv_excursions ADD COLUMN guide_net_cents INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN commission_rule_id INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN commission_pct_applied DECIMAL(6,3) NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN commission_cents INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN price_before_round_cents INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN rounding_diff_cents INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN platform_margin_cents INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN guide_payout_planned_cents INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN approval_note TEXT NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN rejection_reason TEXT NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN approved_at DATETIME NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN approved_by INT UNSIGNED NULL;
-- ALTER TABLE gcv_excursions ADD COLUMN deleted_at DATETIME NULL;
-- ALTER TABLE gcv_guides ADD COLUMN cnpj VARCHAR(18) NULL;
-- ALTER TABLE gcv_guides ADD COLUMN person_type ENUM('PF','PJ') NULL DEFAULT 'PF';
-- ALTER TABLE gcv_guides ADD COLUMN bank_name VARCHAR(120) NULL;
-- ALTER TABLE gcv_guides ADD COLUMN bank_agency VARCHAR(20) NULL;
-- ALTER TABLE gcv_guides ADD COLUMN bank_account VARCHAR(40) NULL;
