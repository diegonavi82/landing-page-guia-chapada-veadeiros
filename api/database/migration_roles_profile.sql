-- Perfil guia completo + perfil cliente + quorum em tours
-- Idempotente: rode no phpMyAdmin se a auto-migração PHP não aplicar.

ALTER TABLE gcv_guides
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(160) NULL,
  ADD COLUMN IF NOT EXISTS phone_ddi VARCHAR(8) NULL DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS phone_iso CHAR(2) NULL DEFAULT 'br',
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
  ADD COLUMN IF NOT EXISTS base_city_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NULL,
  ADD COLUMN IF NOT EXISTS id_document_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS diploma_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS association_doc_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS photo_3x4_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS profile_complete TINYINT(1) NOT NULL DEFAULT 0;

-- MySQL < 8.0.12 não tem IF NOT EXISTS em ADD COLUMN — use a auto-migração PHP nesse caso.

CREATE TABLE IF NOT EXISTS gcv_client_profiles (
  user_id     INT UNSIGNED NOT NULL PRIMARY KEY,
  phone       VARCHAR(20) NULL,
  phone_ddi   VARCHAR(8) NULL DEFAULT '+55',
  cpf         VARCHAR(14) NULL,
  birth_date  DATE NULL,
  photo_url   VARCHAR(500) NULL,
  notes       VARCHAR(500) NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES gcv_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quórum marketplace (cancelamento em formação)
-- ALTER TABLE gcv_tours ADD COLUMN quorum TINYINT UNSIGNED NOT NULL DEFAULT 4 AFTER max_spots;
