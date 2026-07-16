-- Guia Chapada Veadeiros — CMS Admin (Revista, Atrativos, Guias, Cidades, Excursões)
-- Executar no phpMyAdmin após migrations.sql

CREATE TABLE IF NOT EXISTS gcv_media (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  path          VARCHAR(500) NOT NULL,
  url           VARCHAR(500) NOT NULL,
  mime          VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  bytes         INT UNSIGNED NOT NULL DEFAULT 0,
  width         SMALLINT UNSIGNED NULL,
  height        SMALLINT UNSIGNED NULL,
  alt_text      VARCHAR(255) NULL,
  folder        VARCHAR(80) NOT NULL DEFAULT 'general',
  uploaded_by   INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES gcv_users(id) ON DELETE SET NULL,
  INDEX idx_media_folder (folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_cities (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(160) NOT NULL,
  state           VARCHAR(80) NOT NULL DEFAULT 'Goiás',
  state_code      CHAR(2) NOT NULL DEFAULT 'GO',
  country         VARCHAR(80) NOT NULL DEFAULT 'Brasil',
  country_code    CHAR(2) NOT NULL DEFAULT 'BR',
  place_id        VARCHAR(255) NULL,
  formatted_address VARCHAR(400) NULL,
  lat             DECIMAL(10,7) NULL,
  lng             DECIMAL(10,7) NULL,
  is_base         TINYINT(1) NOT NULL DEFAULT 1,
  status          ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_city_place (place_id),
  INDEX idx_city_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_articles (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug            VARCHAR(180) NOT NULL,
  status          ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  title_pt        VARCHAR(255) NOT NULL,
  title_en        VARCHAR(255) NULL,
  title_es        VARCHAR(255) NULL,
  excerpt_pt      TEXT NULL,
  excerpt_en      TEXT NULL,
  excerpt_es      TEXT NULL,
  content_pt      LONGTEXT NULL,
  content_en      LONGTEXT NULL,
  content_es      LONGTEXT NULL,
  seo_title_pt    VARCHAR(255) NULL,
  seo_title_en    VARCHAR(255) NULL,
  seo_title_es    VARCHAR(255) NULL,
  seo_desc_pt     VARCHAR(320) NULL,
  seo_desc_en     VARCHAR(320) NULL,
  seo_desc_es     VARCHAR(320) NULL,
  cover_media_id  INT UNSIGNED NULL,
  cover_url       VARCHAR(500) NULL,
  published_at    DATETIME NULL,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_article_slug (slug),
  FOREIGN KEY (cover_media_id) REFERENCES gcv_media(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES gcv_users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES gcv_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_attractions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug              VARCHAR(180) NOT NULL,
  status            ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  title_pt          VARCHAR(255) NOT NULL,
  title_en          VARCHAR(255) NULL,
  title_es          VARCHAR(255) NULL,
  excerpt_pt        TEXT NULL,
  excerpt_en        TEXT NULL,
  excerpt_es        TEXT NULL,
  content_pt        LONGTEXT NULL,
  content_en        LONGTEXT NULL,
  content_es        LONGTEXT NULL,
  seo_title_pt      VARCHAR(255) NULL,
  seo_title_en      VARCHAR(255) NULL,
  seo_title_es      VARCHAR(255) NULL,
  seo_desc_pt       VARCHAR(320) NULL,
  seo_desc_en       VARCHAR(320) NULL,
  seo_desc_es       VARCHAR(320) NULL,
  distance_km       DECIMAL(8,2) NULL,
  trail_distance_km DECIMAL(8,2) NULL,
  difficulty        ENUM('easy','medium','hard','') NULL DEFAULT '',
  entry_price_cents INT UNSIGNED NULL,
  entry_price_label VARCHAR(120) NULL,
  parking_info      VARCHAR(255) NULL,
  recommended_period VARCHAR(255) NULL,
  city_id           INT UNSIGNED NULL,
  cover_media_id    INT UNSIGNED NULL,
  cover_url         VARCHAR(500) NULL,
  sidebar_html_pt   MEDIUMTEXT NULL,
  sidebar_html_en   MEDIUMTEXT NULL,
  sidebar_html_es   MEDIUMTEXT NULL,
  published_at      DATETIME NULL,
  created_by        INT UNSIGNED NULL,
  updated_by        INT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attraction_slug (slug),
  FOREIGN KEY (city_id) REFERENCES gcv_cities(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_media_id) REFERENCES gcv_media(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES gcv_users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES gcv_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_attraction_media (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attraction_id   INT UNSIGNED NOT NULL,
  media_id        INT UNSIGNED NULL,
  url             VARCHAR(500) NOT NULL,
  alt_text        VARCHAR(255) NULL,
  sort_order      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attraction_id) REFERENCES gcv_attractions(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES gcv_media(id) ON DELETE SET NULL,
  INDEX idx_attr_media (attraction_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extensão do perfil de guia (rode uma vez; ignore erro se a coluna já existir)
-- Preferível: api/helpers/cms_schema.php (auto-migra em runtime)
-- ALTER TABLE gcv_guides ADD COLUMN nickname VARCHAR(80) NULL AFTER user_id;
-- ALTER TABLE gcv_guides ADD COLUMN full_name VARCHAR(160) NULL AFTER nickname;
-- ALTER TABLE gcv_guides ADD COLUMN phone_ddi VARCHAR(8) NULL DEFAULT '+55' AFTER phone;
-- ALTER TABLE gcv_guides ADD COLUMN phone_iso CHAR(2) NULL DEFAULT 'br' AFTER phone_ddi;
-- ALTER TABLE gcv_guides ADD COLUMN birth_date DATE NULL AFTER phone_iso;
-- ALTER TABLE gcv_guides ADD COLUMN base_city_id INT UNSIGNED NULL AFTER birth_date;
-- ALTER TABLE gcv_guides ADD COLUMN diploma_url VARCHAR(500) NULL AFTER photo_url;
-- ALTER TABLE gcv_guides ADD COLUMN association_doc_url VARCHAR(500) NULL AFTER diploma_url;
-- ALTER TABLE gcv_guides ADD COLUMN photo_3x4_url VARCHAR(500) NULL AFTER association_doc_url;

CREATE TABLE IF NOT EXISTS gcv_excursions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status            ENUM('draft','published','cancelled','soldout') NOT NULL DEFAULT 'draft',
  date_iso          DATE NOT NULL,
  departure_time    TIME NOT NULL,
  departure_city_id INT UNSIGNED NOT NULL,
  attraction_id     INT UNSIGNED NOT NULL,
  guide_user_id     INT UNSIGNED NULL,
  price_cents       INT UNSIGNED NOT NULL,
  quorum            TINYINT UNSIGNED NOT NULL DEFAULT 4,
  max_people        TINYINT UNSIGNED NOT NULL DEFAULT 10,
  booked_people     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  include_transport TINYINT(1) NOT NULL DEFAULT 0,
  include_entry     TINYINT(1) NOT NULL DEFAULT 0,
  include_lunch     TINYINT(1) NOT NULL DEFAULT 0,
  notes_pt          TEXT NULL,
  notes_en          TEXT NULL,
  notes_es          TEXT NULL,
  cart_slug         VARCHAR(180) NULL,
  created_by        INT UNSIGNED NULL,
  updated_by        INT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (departure_city_id) REFERENCES gcv_cities(id) ON DELETE RESTRICT,
  FOREIGN KEY (attraction_id) REFERENCES gcv_attractions(id) ON DELETE RESTRICT,
  FOREIGN KEY (guide_user_id) REFERENCES gcv_users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES gcv_users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES gcv_users(id) ON DELETE SET NULL,
  INDEX idx_exc_date (date_iso),
  INDEX idx_exc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cidades base iniciais (Chapada)
INSERT INTO gcv_cities (name, state, state_code, country, country_code, formatted_address, is_base, status) VALUES
  ('Alto Paraíso de Goiás', 'Goiás', 'GO', 'Brasil', 'BR', 'Alto Paraíso de Goiás, GO, Brasil', 1, 'active'),
  ('São Jorge', 'Goiás', 'GO', 'Brasil', 'BR', 'São Jorge, Alto Paraíso de Goiás - GO, Brasil', 1, 'active'),
  ('Cavalcante', 'Goiás', 'GO', 'Brasil', 'BR', 'Cavalcante, GO, Brasil', 1, 'active'),
  ('Teresina de Goiás', 'Goiás', 'GO', 'Brasil', 'BR', 'Teresina de Goiás, GO, Brasil', 1, 'active'),
  ('São João d''Aliança', 'Goiás', 'GO', 'Brasil', 'BR', 'São João d''Aliança, GO, Brasil', 1, 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);
