-- Status de conta do guia: cancelled + inatividade automática (90 dias).

ALTER TABLE gcv_users
  MODIFY COLUMN status ENUM('pending','active','inactive','suspended','cancelled') NOT NULL DEFAULT 'pending';

UPDATE gcv_users u
INNER JOIN gcv_guides g ON g.user_id = u.id
LEFT JOIN (
  SELECT guide_user_id, MAX(COALESCE(approved_at, created_at)) AS last_pub
  FROM gcv_excursions
  WHERE deleted_at IS NULL
    AND guide_user_id IS NOT NULL
    AND status IN ('published','soldout','pending_approval')
  GROUP BY guide_user_id
) x ON x.guide_user_id = u.id
SET u.status = 'inactive'
WHERE u.status = 'active'
  AND COALESCE(x.last_pub, g.approved_at) IS NOT NULL
  AND COALESCE(x.last_pub, g.approved_at) < DATE_SUB(NOW(), INTERVAL 90 DAY);
