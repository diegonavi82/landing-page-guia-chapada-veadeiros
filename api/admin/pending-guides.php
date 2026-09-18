<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/guide_registration.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();
gcv_auth_ensure_role_schema();
gcv_cms_ensure_schema();
gcv_blocked_guide_emails_ensure();

$payload = [
    'reject_reasons' => gcv_guide_reject_reason_presets(),
    'blocked_emails' => gcv_guide_blocked_emails_list(),
    'guides' => [],
];

$sql = 'SELECT u.id, u.name, u.email, u.created_at, u.status,
               g.cadastur, g.phone, g.bio_pt, g.full_name, g.nickname, g.photo_3x4_url, g.photo_url,
               g.rejected_at, g.rejected_reason, g.approved_at, g.sexo
        FROM gcv_users u
        INNER JOIN gcv_guides g ON g.user_id = u.id
        WHERE COALESCE(g.profile_complete, 0) = 1
          AND COALESCE(g.needs_resubmit, 0) = 0
          AND g.approved_at IS NULL
          AND u.status IN (\'pending\', \'suspended\')';

try {
    $stmt = db()->prepare(
        $sql . ' AND (
             u.role = \'guide\'
             OR EXISTS (
               SELECT 1 FROM gcv_user_roles r
               WHERE r.user_id = u.id AND r.role = \'guide\'
             )
           )
         ORDER BY CASE WHEN u.status = \'pending\' THEN 0 ELSE 1 END, u.created_at ASC'
    );
    $stmt->execute();
    $payload['guides'] = $stmt->fetchAll() ?: [];
} catch (Throwable $e) {
    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.created_at, u.status,
                g.cadastur, g.phone, g.bio_pt, g.full_name, g.nickname, g.photo_3x4_url, g.photo_url
         FROM gcv_users u
         INNER JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.status = \'pending\'
           AND COALESCE(g.profile_complete, 0) = 1
           AND COALESCE(g.needs_resubmit, 0) = 0
           AND u.role = \'guide\'
         ORDER BY u.created_at ASC'
    );
    $stmt->execute();
    $payload['guides'] = $stmt->fetchAll() ?: [];
}

json_response(true, $payload);
