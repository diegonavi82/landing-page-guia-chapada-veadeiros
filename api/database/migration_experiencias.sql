-- Experiência (atrativo ou terapia) e o vínculo com o passeio.
-- A excursão ganha passeio_id e continua a saída compartilhada.
-- Idempotente: tabela/coluna duplicada é ignorada pelo runner.

CREATE TABLE IF NOT EXISTS gcv_experiencias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('atrativo','terapia') NOT NULL,
  attraction_id INT UNSIGNED NULL,
  nome VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  descricao TEXT NULL,
  preco_hora_cents INT UNSIGNED NULL,
  duracao_padrao_min SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exp_attraction (attraction_id),
  UNIQUE KEY uq_exp_slug (slug),
  INDEX idx_exp_tipo (tipo, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gcv_passeio_experiencia (
  passeio_id INT UNSIGNED NOT NULL,
  experiencia_id INT UNSIGNED NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (passeio_id, experiencia_id),
  INDEX idx_pex_exp (experiencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE gcv_passeio_relacionado
  ADD COLUMN publicado TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE gcv_excursions
  ADD COLUMN passeio_id INT UNSIGNED NULL;

ALTER TABLE gcv_excursions
  ADD INDEX idx_exc_passeio (passeio_id);

INSERT INTO gcv_experiencias (tipo, attraction_id, nome, slug, status, descricao, duracao_padrao_min)
SELECT 'atrativo',
       a.id,
       LEFT(a.title_pt, 160),
       LEFT(IF(a.slug IS NULL OR a.slug = '', CONCAT('atrativo-', a.id), a.slug), 180),
       IF(a.status IN ('draft','published','archived'), a.status, 'draft'),
       NULLIF(LEFT(COALESCE(a.excerpt_pt, ''), 4000), ''),
       a.duration_minutes
FROM gcv_attractions a
WHERE a.title_pt NOT LIKE '% + %'
  AND NOT EXISTS (
    SELECT 1 FROM gcv_experiencias e WHERE e.attraction_id = a.id
  );

INSERT INTO gcv_passeio_relacionado (signature, duration_minutes, publicado)
SELECT CONCAT('', a.id),
       COALESCE(a.duration_minutes, 0),
       IF(a.status = 'published' AND COALESCE(a.tem_passeio, 1) = 1, 1, 0)
FROM gcv_attractions a
WHERE a.title_pt NOT LIKE '% + %'
  AND NOT EXISTS (
    SELECT 1 FROM gcv_passeio_relacionado p WHERE p.signature = CONCAT('', a.id)
  );

INSERT IGNORE INTO gcv_passeio_relacionado_atrativo (passeio_id, attraction_id, sort_order)
SELECT p.id, a.id, 0
FROM gcv_attractions a
INNER JOIN gcv_passeio_relacionado p ON p.signature = CONCAT('', a.id)
WHERE a.title_pt NOT LIKE '% + %';

INSERT IGNORE INTO gcv_passeio_experiencia (passeio_id, experiencia_id, sort_order)
SELECT x.passeio_id, e.id, x.sort_order
FROM gcv_passeio_relacionado_atrativo x
INNER JOIN gcv_experiencias e ON e.attraction_id = x.attraction_id AND e.tipo = 'atrativo';

UPDATE gcv_excursions e
INNER JOIN (
  SELECT x.excursion_id,
         GROUP_CONCAT(x.attraction_id ORDER BY x.attraction_id SEPARATOR '-') AS signature
  FROM gcv_excursion_attractions x
  GROUP BY x.excursion_id
) s ON s.excursion_id = e.id
INNER JOIN gcv_passeio_relacionado p ON p.signature = s.signature
SET e.passeio_id = p.id
WHERE e.passeio_id IS NULL;

UPDATE gcv_excursions e
INNER JOIN gcv_passeio_relacionado p ON p.signature = CONCAT('', e.attraction_id)
SET e.passeio_id = p.id
WHERE e.passeio_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM gcv_excursion_attractions x WHERE x.excursion_id = e.id
  );
