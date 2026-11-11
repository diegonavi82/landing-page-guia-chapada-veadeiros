CREATE TABLE IF NOT EXISTS gcv_referrals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(12) NOT NULL,
  referrer_user_id INT UNSIGNED NOT NULL,
  referrer_role VARCHAR(16) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  date_from DATE NULL,
  date_to DATE NULL,
  cashback_cents INT UNSIGNED NOT NULL DEFAULT 0,
  claim_user_id INT UNSIGNED NULL,
  referred_user_id INT UNSIGNED NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'sent',
  excursion_id INT UNSIGNED NULL,
  rewarded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ref_code (code),
  UNIQUE KEY uq_ref_phone (phone),
  INDEX idx_ref_referrer (referrer_user_id, status),
  INDEX idx_ref_referred (referred_user_id, status),
  INDEX idx_ref_claim (claim_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_wallet_ledger (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  amount_cents INT NOT NULL,
  kind VARCHAR(24) NOT NULL,
  referral_id BIGINT UNSIGNED NULL,
  reservation_id VARCHAR(32) NULL,
  withdrawal_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wallet_kind_ref (kind, referral_id),
  UNIQUE KEY uq_wallet_kind_res (kind, reservation_id),
  UNIQUE KEY uq_wallet_kind_wd (kind, withdrawal_id),
  INDEX idx_wallet_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_wallet_withdrawals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  pix_key VARCHAR(140) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  ledger_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  INDEX idx_wd_status (status, id),
  INDEX idx_wd_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
