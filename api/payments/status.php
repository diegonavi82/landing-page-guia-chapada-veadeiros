<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

$user      = require_auth();
$bookingId = (int)($_GET['booking_id'] ?? 0);

if (!$bookingId) json_response(false, null, 'booking_id obrigatório', 422);

$stmt = db()->prepare(
    'SELECT b.id, b.status, b.mp_status, b.payment_method, b.mp_payment_id,
            b.total_cents, b.spots, b.release_date,
            t.title_pt AS tour_title, t.departure_date
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     WHERE b.id = ? AND (b.client_id = ? OR ? = \'admin\')'
);
$stmt->execute([$bookingId, $user['id'], $user['role']]);
$booking = $stmt->fetch();

if (!$booking) json_response(false, null, 'Reserva não encontrada', 404);

json_response(true, $booking);
