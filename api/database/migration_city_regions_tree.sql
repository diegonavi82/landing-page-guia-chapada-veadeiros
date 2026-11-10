CREATE TABLE IF NOT EXISTS gcv_regions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_region_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE gcv_cities ADD COLUMN region_id INT UNSIGNED NULL AFTER region;

ALTER TABLE gcv_cities ADD INDEX idx_city_region (region_id);

INSERT INTO gcv_regions (name, status, sort_order)
SELECT 'Chapada dos Veadeiros', 'active', 0
WHERE NOT EXISTS (
  SELECT 1 FROM gcv_regions WHERE name = 'Chapada dos Veadeiros'
);

UPDATE gcv_cities c
INNER JOIN gcv_regions r ON r.status = 'active' AND r.name = c.region
SET c.region_id = r.id
WHERE (c.region_id IS NULL OR c.region_id = 0)
  AND c.region IS NOT NULL
  AND TRIM(c.region) <> '';

UPDATE gcv_cities c
INNER JOIN gcv_regions r ON r.id = c.region_id
INNER JOIN gcv_regions chapada ON chapada.status = 'active' AND chapada.name = 'Chapada dos Veadeiros'
SET c.region_id = chapada.id, c.region = chapada.name
WHERE LOWER(TRIM(r.name)) IN ('são jorge', 'sao jorge');

UPDATE gcv_cities c
INNER JOIN gcv_regions chapada ON chapada.status = 'active' AND chapada.name = 'Chapada dos Veadeiros'
SET c.region_id = chapada.id, c.region = chapada.name
WHERE LOWER(TRIM(c.region)) IN ('são jorge', 'sao jorge');

UPDATE gcv_regions
SET status = 'archived'
WHERE status = 'active'
  AND LOWER(TRIM(name)) IN ('são jorge', 'sao jorge');
