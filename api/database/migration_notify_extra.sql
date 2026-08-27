ALTER TABLE gcv_sales
  ADD COLUMN notify_pix_paid_sent_at DATETIME NULL AFTER notify_dayof_sent_at;
ALTER TABLE gcv_sales
  ADD COLUMN notify_h2_sent_at DATETIME NULL AFTER notify_pix_paid_sent_at;
ALTER TABLE gcv_sales
  ADD COLUMN notify_review_sent_at DATETIME NULL AFTER notify_h2_sent_at;

ALTER TABLE gcv_excursions
  ADD COLUMN notify_h2_guide_at DATETIME NULL AFTER notify_d12h_guide_at;
