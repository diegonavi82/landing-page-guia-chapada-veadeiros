-- Guia Chapada Veadeiros — Migrations
-- Executar em phpMyAdmin: banco u431245201_GuiaChapadaV → aba SQL

CREATE TABLE gcv_users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(180) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NULL,
  role            ENUM('admin','guide','client') NOT NULL DEFAULT 'client',
  google_id       VARCHAR(100) NULL UNIQUE,
  avatar_url      VARCHAR(500) NULL,
  lang            ENUM('pt','en','es') NOT NULL DEFAULT 'pt',
  status          ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  email_verified  TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_guides (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL UNIQUE,
  bio_pt          TEXT NULL,
  bio_en          TEXT NULL,
  bio_es          TEXT NULL,
  cadastur        VARCHAR(60) NULL,
  phone           VARCHAR(20) NULL,
  photo_url       VARCHAR(500) NULL,
  mp_access_token VARCHAR(500) NULL,
  mp_user_id      VARCHAR(100) NULL,
  mp_connected_at DATETIME NULL,
  approved_at     DATETIME NULL,
  approved_by     INT UNSIGNED NULL,
  FOREIGN KEY (user_id) REFERENCES gcv_users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES gcv_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_tours (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guide_id        INT UNSIGNED NOT NULL,
  title_pt        VARCHAR(200) NOT NULL,
  title_en        VARCHAR(200) NOT NULL,
  title_es        VARCHAR(200) NOT NULL,
  description_pt  TEXT NULL,
  description_en  TEXT NULL,
  description_es  TEXT NULL,
  departure_date  DATE NOT NULL,
  departure_time  TIME NOT NULL,
  meeting_point   VARCHAR(300) NULL,
  region          ENUM('alto-paraiso','sao-jorge','cavalcante','teresina','sao-joao','outro') NOT NULL DEFAULT 'alto-paraiso',
  max_spots       TINYINT UNSIGNED NOT NULL DEFAULT 10,
  spots_taken     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  price_cents     INT UNSIGNED NOT NULL,
  difficulty      ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  status          ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  approved_at     DATETIME NULL,
  approved_by     INT UNSIGNED NULL,
  cover_url       VARCHAR(500) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guide_id) REFERENCES gcv_users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES gcv_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_bookings (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tour_id                 INT UNSIGNED NOT NULL,
  client_id               INT UNSIGNED NOT NULL,
  spots                   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  total_cents             INT UNSIGNED NOT NULL,
  commission_pct_applied  DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  status                  ENUM('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
  payment_method          ENUM('pix','card') NULL,
  mp_payment_id           VARCHAR(100) NULL,
  mp_status               VARCHAR(50) NULL,
  mp_marketplace_fee_cents INT UNSIGNED NULL,
  mp_guide_amount_cents   INT UNSIGNED NULL,
  release_date            DATE NULL,
  released_at             DATETIME NULL,
  notes                   TEXT NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES gcv_tours(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES gcv_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  code_6      CHAR(6) NULL,
  expires_at  DATETIME NOT NULL,
  used        TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES gcv_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_sessions (
  session_id  VARCHAR(128) PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  ip          VARCHAR(45) NULL,
  user_agent  VARCHAR(300) NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES gcv_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_settings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  key_name    VARCHAR(100) NOT NULL UNIQUE,
  value       VARCHAR(500) NOT NULL,
  label       VARCHAR(200) NOT NULL,
  type        ENUM('percent','integer','text','boolean') NOT NULL DEFAULT 'text',
  updated_by  INT UNSIGNED NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES gcv_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gcv_rate_limits (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip           VARCHAR(45) NOT NULL,
  endpoint     VARCHAR(100) NOT NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  window_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_endpoint (ip, endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO gcv_users (name, email, role, status, email_verified)
VALUES ('Diego Navi', 'diegonavi82@gmail.com', 'admin', 'active', 1);

INSERT INTO gcv_settings (key_name, value, label, type) VALUES
  ('platform_commission_pct', '5',  'Comissão da plataforma (%)', 'percent'),
  ('cancel_refund_hours',     '48', 'Prazo para cancelamento com reembolso total (horas)', 'integer'),
  ('cancel_partial_hours',    '24', 'Prazo para reembolso parcial (horas)', 'integer'),
  ('cancel_partial_pct',      '50', 'Percentual de reembolso parcial (%)', 'percent'),
  ('mp_release_delay_days',   '1',  'Dias após o passeio para liberar repasse ao guia', 'integer'),
  ('max_spots_per_tour',      '20', 'Máximo de vagas por passeio', 'integer');
