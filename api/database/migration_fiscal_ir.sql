ALTER TABLE gcv_sale_payouts ADD COLUMN payee_cpf VARCHAR(11) NULL;
ALTER TABLE gcv_sale_payouts ADD COLUMN payee_cnpj VARCHAR(14) NULL;
ALTER TABLE gcv_sale_payouts ADD COLUMN payee_name VARCHAR(160) NULL;
ALTER TABLE gcv_sale_payouts ADD COLUMN payee_person_type ENUM('PF','PJ') NULL;

ALTER TABLE gcv_guide_payouts ADD COLUMN payee_cpf VARCHAR(11) NULL;
ALTER TABLE gcv_guide_payouts ADD COLUMN payee_cnpj VARCHAR(14) NULL;
ALTER TABLE gcv_guide_payouts ADD COLUMN payee_name VARCHAR(160) NULL;
ALTER TABLE gcv_guide_payouts ADD COLUMN payee_person_type ENUM('PF','PJ') NULL;

ALTER TABLE gcv_sales ADD COLUMN payout_payee_cpf VARCHAR(11) NULL;
ALTER TABLE gcv_sales ADD COLUMN payout_payee_cnpj VARCHAR(14) NULL;
ALTER TABLE gcv_sales ADD COLUMN payout_payee_name VARCHAR(160) NULL;
ALTER TABLE gcv_sales ADD COLUMN payout_payee_person_type ENUM('PF','PJ') NULL;
ALTER TABLE gcv_sales ADD COLUMN payout_payee_locked_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS gcv_fiscal_year_notices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guide_user_id INT UNSIGNED NOT NULL,
  calendar_year SMALLINT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fiscal_notice (guide_user_id, calendar_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
