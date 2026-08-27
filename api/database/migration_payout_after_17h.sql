ALTER TABLE gcv_sales ADD COLUMN payout_fail_notified_at DATETIME NULL;

UPDATE gcv_sales
SET scheduled_payout_at = CONCAT(DATE(COALESCE(excursion_starts_at, scheduled_payout_at, sold_at)), ' 17:00:00')
WHERE deleted_at IS NULL
  AND sale_status = 'PAID'
  AND payout_status = 'PAYOUT_PENDING'
  AND COALESCE(excursion_starts_at, scheduled_payout_at, sold_at) IS NOT NULL;
