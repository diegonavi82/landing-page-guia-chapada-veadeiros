<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();

$stmt = db()->prepare(
    'SELECT u.id, u.name, u.email, u.created_at, g.cadastur, g.phone, g.bio_pt
     FROM gcv_users u
     JOIN gcv_guides g ON g.user_id = u.id
     WHERE u.role = \'guide\' AND u.status = \'pending\'
     ORDER BY u.created_at ASC'
);
$stmt->execute();
json_response(true, ['guides' => $stmt->fetchAll()]);
