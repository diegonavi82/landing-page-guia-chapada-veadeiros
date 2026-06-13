<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();

$status  = $_GET['status'] ?? '';
$page    = max(1, (int)($_GET['page'] ?? 1));
$limit   = min(50, max(1, (int)($_GET['limit'] ?? 20)));
$offset  = ($page - 1) * $limit;

$where  = [];
$params = [];

if ($status && in_array($status, ['pending','paid','cancelled','refunded'], true)) {
    $where[] = 'b.status = ?';
    $params[] = $status;
}

$whereStr = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT b.id, b.spots, b.total_cents, b.status, b.payment_method,
               b.mp_payment_id, b.created_at, b.release_date, b.released_at,
               t.title_pt AS tour_title, t.departure_date,
               c.name AS client_name, c.email AS client_email,
               g.name AS guide_name
        FROM gcv_bookings b
        JOIN gcv_tours t ON t.id = b.tour_id
        JOIN gcv_users c ON c.id = b.client_id
        JOIN gcv_users g ON g.id = t.guide_id
        {$whereStr}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;

$stmt = db()->prepare($sql);
$stmt->execute($params);
json_response(true, ['bookings' => $stmt->fetchAll()]);
