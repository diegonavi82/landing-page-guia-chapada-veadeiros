<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();

$stmt = db()->prepare(
    'SELECT t.id, t.title_pt, t.title_en, t.title_es, t.departure_date, t.departure_time,
            t.region, t.price_cents, t.difficulty, t.max_spots, t.cover_url, t.created_at,
            u.name AS guide_name, u.email AS guide_email
     FROM gcv_tours t
     JOIN gcv_users u ON u.id = t.guide_id
     WHERE t.status = \'pending\'
     ORDER BY t.created_at ASC'
);
$stmt->execute();
json_response(true, ['tours' => $stmt->fetchAll()]);
