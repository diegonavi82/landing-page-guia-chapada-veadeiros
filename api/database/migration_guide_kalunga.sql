ALTER TABLE gcv_guides
  ADD COLUMN is_kalunga TINYINT(1) NOT NULL DEFAULT 0 AFTER sexo;

UPDATE gcv_guides g
LEFT JOIN gcv_users u ON u.id = g.user_id
SET g.is_kalunga = 1
WHERE LOWER(TRIM(COALESCE(g.full_name, ''))) IN ('gleisson marques', 'wellington moreira dos santos')
   OR LOWER(TRIM(COALESCE(u.name, ''))) IN ('gleisson marques', 'wellington moreira dos santos')
   OR LOWER(TRIM(COALESCE(g.nickname, ''))) IN ('gleisson marques', 'wellington moreira dos santos')
   OR LOWER(TRIM(COALESCE(g.full_name, ''))) LIKE 'gleisson marques %'
   OR LOWER(TRIM(COALESCE(g.full_name, ''))) LIKE 'wellington moreira dos santos %'
   OR LOWER(TRIM(COALESCE(u.name, ''))) LIKE 'gleisson marques %'
   OR LOWER(TRIM(COALESCE(u.name, ''))) LIKE 'wellington moreira dos santos %';
