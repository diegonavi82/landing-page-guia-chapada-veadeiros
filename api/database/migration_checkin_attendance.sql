ALTER TABLE gcv_sales
  ADD COLUMN attendance_status VARCHAR(20) NULL DEFAULT 'pending' AFTER payout_status;
ALTER TABLE gcv_sales
  ADD COLUMN checked_in_at DATETIME NULL AFTER attendance_status;
ALTER TABLE gcv_sales
  ADD COLUMN checked_in_by INT UNSIGNED NULL AFTER checked_in_at;
ALTER TABLE gcv_sales
  ADD COLUMN notify_d12h_sent_at DATETIME NULL AFTER checked_in_by;
ALTER TABLE gcv_sales
  ADD COLUMN notify_dayof_sent_at DATETIME NULL AFTER notify_d12h_sent_at;
ALTER TABLE gcv_sales
  ADD COLUMN guide_amount_original_cents INT NULL AFTER guide_amount_cents;
ALTER TABLE gcv_sales
  ADD COLUMN platform_revenue_original_cents INT NULL AFTER platform_revenue_cents;

ALTER TABLE gcv_excursions
  ADD COLUMN notify_confirmed_at DATETIME NULL;
ALTER TABLE gcv_excursions
  ADD COLUMN notify_d12h_guide_at DATETIME NULL;
