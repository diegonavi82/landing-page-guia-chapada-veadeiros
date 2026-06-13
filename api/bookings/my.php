<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();

$stmt = db()->prepare(
    'SELECT b.id, b.spots, b.total_cents, b.status, b.payment_method,
            b.mp_payment_id, b.created_at, b.release_date,
            t.title_pt AS tour_title, t.departure_date, t.departure_time,
            t.meeting_point, t.region, t.cover_url,
            g.name AS guide_name
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_users g ON g.id = t.guide_id
     WHERE b.client_id = ?
     ORDER BY b.created_at DESC'
);
$stmt->execute([$user['id']]);
json_response(true, ['bookings' => $stmt->fetchAll()]);
