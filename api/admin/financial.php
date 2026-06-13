<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();

$month = $_GET['month'] ?? date('Y-m');

$stmt = db()->prepare(
    'SELECT
       COUNT(*) AS total_bookings,
       SUM(CASE WHEN b.status = \'paid\' THEN 1 ELSE 0 END) AS paid_bookings,
       SUM(CASE WHEN b.status = \'paid\' THEN b.total_cents ELSE 0 END) AS gross_cents,
       SUM(CASE WHEN b.status = \'paid\' THEN b.mp_marketplace_fee_cents ELSE 0 END) AS commission_cents,
       SUM(CASE WHEN b.status = \'paid\' THEN b.mp_guide_amount_cents ELSE 0 END) AS guide_cents
     FROM gcv_bookings b
     WHERE DATE_FORMAT(b.created_at, \'%Y-%m\') = ?'
);
$stmt->execute([$month]);
$summary = $stmt->fetch();

$txStmt = db()->prepare(
    'SELECT b.id, b.total_cents, b.mp_marketplace_fee_cents, b.mp_guide_amount_cents,
            b.status, b.payment_method, b.created_at,
            t.title_pt AS tour_title, t.departure_date,
            c.name AS client_name, g.name AS guide_name
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_users c ON c.id = b.client_id
     JOIN gcv_users g ON g.id = t.guide_id
     WHERE DATE_FORMAT(b.created_at, \'%Y-%m\') = ? AND b.status = \'paid\'
     ORDER BY b.created_at DESC'
);
$txStmt->execute([$month]);
$transactions = $txStmt->fetchAll();

json_response(true, ['summary' => $summary, 'transactions' => $transactions]);
