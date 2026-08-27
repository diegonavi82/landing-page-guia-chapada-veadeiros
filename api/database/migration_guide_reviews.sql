CREATE TABLE IF NOT EXISTS gcv_guide_reviews (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE gcv_sales
  ADD COLUMN review_token CHAR(64) NULL AFTER notify_review_sent_at;

CREATE UNIQUE INDEX uq_sales_review_token ON gcv_sales (review_token);
