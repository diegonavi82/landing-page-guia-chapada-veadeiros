ALTER TABLE gcv_excursions
  MODIFY COLUMN status ENUM('draft','pending_approval','published','cancelled','soldout','rejected')
  NOT NULL DEFAULT 'draft';

UPDATE gcv_excursions e
LEFT JOIN gcv_users u ON u.id = e.created_by
SET e.status = 'pending_approval',
    e.approved_at = NULL,
    e.approved_by = NULL
WHERE e.status IN ('published', 'soldout')
  AND e.approved_at IS NULL
  AND e.deleted_at IS NULL
  AND e.booked_people = 0
  AND (
    e.created_by_origin = 'GUIDE'
    OR e.business_mode = 'GUIDE_MARKETPLACE'
    OR (
      e.guide_user_id IS NOT NULL
      AND e.created_by IS NOT NULL
      AND e.created_by = e.guide_user_id
      AND (u.role IS NULL OR u.role <> 'admin')
    )
  );
