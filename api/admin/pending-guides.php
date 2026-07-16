<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/user_roles.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();
gcv_auth_ensure_role_schema();

// Guias com status pending (coluna role legado OU papel em gcv_user_roles)
try {
    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.created_at, g.cadastur, g.phone, g.bio_pt
         FROM gcv_users u
         INNER JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.status = \'pending\'
           AND (
             u.role = \'guide\'
             OR EXISTS (
               SELECT 1 FROM gcv_user_roles r
               WHERE r.user_id = u.id AND r.role = \'guide\'
             )
           )
         ORDER BY u.created_at ASC'
    );
    $stmt->execute();
    json_response(true, ['guides' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    // Fallback sem gcv_user_roles
    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.created_at, g.cadastur, g.phone, g.bio_pt
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.role = \'guide\' AND u.status = \'pending\'
         ORDER BY u.created_at ASC'
    );
    $stmt->execute();
    json_response(true, ['guides' => $stmt->fetchAll()]);
}
