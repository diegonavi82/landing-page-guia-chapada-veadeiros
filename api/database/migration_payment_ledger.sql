-- Registro de transações de pagamento (Pix Sicoob, Mercado Pago, Stripe) e
-- repasses das plataformas para a conta Sicoob.
-- Idempotente. Também roda sozinho via gcv_ledger_ensure_schema() no primeiro uso.

CREATE TABLE IF NOT EXISTS gcv_payment_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id VARCHAR(32) NOT NULL,
  sale_id BIGINT UNSIGNED NULL,
  gateway ENUM('sicoob','openpix','mercadopago','stripe','manual') NOT NULL,
  method ENUM('pix','card_br','card_intl') NOT NULL,
  external_id VARCHAR(80) NULL,
  checkout_ref VARCHAR(120) NULL,
  status ENUM('PENDING','CARD_SAVED','AUTHORIZED','PAID','RELEASED','REFUNDED','PARTIALLY_REFUNDED','CHARGEBACK','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  installments TINYINT UNSIGNED NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  charge_minor INT UNSIGNED NOT NULL DEFAULT 0,
  fx_rate DECIMAL(12,6) NULL,
  base_cents INT UNSIGNED NOT NULL DEFAULT 0,
  surcharge_cents INT UNSIGNED NOT NULL DEFAULT 0,
  gross_cents INT UNSIGNED NOT NULL DEFAULT 0,
  fee_cents INT NULL,
  net_cents INT NULL,
  fee_source ENUM('gateway','estimate') NOT NULL DEFAULT 'estimate',
  fee_detail JSON NULL,
  refunded_cents INT UNSIGNED NOT NULL DEFAULT 0,
  price_review TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATETIME NULL,
  available_at DATETIME NULL,
  settlement_status ENUM('IN_GATEWAY','AVAILABLE','IN_TRANSIT','IN_SICOOB') NOT NULL DEFAULT 'IN_GATEWAY',
  settlement_id BIGINT UNSIGNED NULL,
  settled_at DATETIME NULL,
  raw_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ptx_res_gateway (reservation_id, gateway),
  INDEX idx_ptx_external (gateway, external_id),
  INDEX idx_ptx_status (status, settlement_status),
  INDEX idx_ptx_paid (paid_at),
  INDEX idx_ptx_sale (sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_gateway_settlements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gateway ENUM('mercadopago','stripe') NOT NULL,
  external_id VARCHAR(80) NOT NULL,
  amount_cents INT NOT NULL,
  status ENUM('PENDING','IN_TRANSIT','PAID','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  expected_at DATE NULL,
  arrived_at DATETIME NULL,
  sicoob_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  sicoob_ref VARCHAR(80) NULL,
  notes VARCHAR(500) NULL,
  raw_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_settle_gateway_ext (gateway, external_id),
  INDEX idx_settle_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Um passeio (dia) de cada reserva: confirmação do guia e decisão de cobrança do cartão.
CREATE TABLE IF NOT EXISTS gcv_booking_trips (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id VARCHAR(32) NOT NULL,
  trip_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
  cart_id VARCHAR(160) NULL,
  title VARCHAR(255) NULL,
  excursion_id INT UNSIGNED NULL,
  guide_user_id INT UNSIGNED NULL,
  starts_at DATETIME NULL,
  people TINYINT UNSIGNED NOT NULL DEFAULT 1,
  base_cents INT UNSIGNED NOT NULL DEFAULT 0,
  payment_kind ENUM('pix','card') NOT NULL DEFAULT 'pix',
  decision ENUM('UNDECIDED','CONFIRMED','CANCELLED','CAPTURED','RELEASED') NOT NULL DEFAULT 'UNDECIDED',
  guide_confirmed_at DATETIME NULL,
  guide_confirmed_by INT UNSIGNED NULL,
  guide_alerted_at DATETIME NULL,
  decided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_btrip (reservation_id, trip_index),
  INDEX idx_btrip_guide (guide_user_id, starts_at),
  INDEX idx_btrip_exc (excursion_id),
  INDEX idx_btrip_decision (decision, starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
