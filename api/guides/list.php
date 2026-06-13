<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();

$stmt = db()->prepare(
    'SELECT u.id, u.name, u.email, g.cadastur, g.photo_url, g.approved_at
     FROM gcv_users u
     JOIN gcv_guides g ON g.user_id = u.id
     WHERE u.role = \'guide\' AND u.status = \'active\'
     ORDER BY u.name ASC'
);
$stmt->execute();
$guides = $stmt->fetchAll();

json_response(true, ['guides' => $guides]);
