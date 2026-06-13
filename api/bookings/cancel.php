<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/settings.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

$user      = require_auth();
$data      = body_json();
$bookingId = (int)($data['booking_id'] ?? 0);

if (!$bookingId) json_response(false, null, 'booking_id obrigatório', 422);

$stmt = db()->prepare(
    'SELECT b.id, b.status, b.total_cents, b.mp_payment_id, b.client_id,
            t.departure_date
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     WHERE b.id = ?'
);
$stmt->execute([$bookingId]);
$booking = $stmt->fetch();

if (!$booking) json_response(false, null, 'Reserva não encontrada', 404);
if ((int)$booking['client_id'] !== (int)$user['id'] && $user['role'] !== 'admin') {
    json_response(false, null, 'Sem permissão', 403);
}
if (!in_array($booking['status'], ['pending', 'paid'], true)) {
    json_response(false, null, 'Reserva não pode ser cancelada', 409);
}

$hoursUntilDeparture = (strtotime($booking['departure_date']) - time()) / 3600;
$refundHours  = (int)setting('cancel_refund_hours', 48);
$partialHours = (int)setting('cancel_partial_hours', 24);
$partialPct   = (float)setting('cancel_partial_pct', 50);

$refundCents = 0;
$refundType  = 'none';

if ($booking['status'] === 'paid' && $booking['mp_payment_id']) {
    if ($hoursUntilDeparture >= $refundHours) {
        $refundCents = $booking['total_cents'];
        $refundType  = 'full';
    } elseif ($hoursUntilDeparture >= $partialHours) {
        $refundCents = (int)round($booking['total_cents'] * ($partialPct / 100));
        $refundType  = 'partial';
    }

    if ($refundCents > 0) {
        // Chamar API do MP para reembolso
        $mpToken = $_ENV['MP_ACCESS_TOKEN'] ?? '';
        $ch = curl_init("https://api.mercadopago.com/v1/payments/{$booking['mp_payment_id']}/refunds");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $mpToken,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode(['amount' => $refundCents / 100]),
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (isset($response['error'])) {
            json_response(false, null, 'Erro ao processar reembolso: ' . ($response['message'] ?? 'desconhecido'), 500);
        }
    }
}

db()->prepare(
    'UPDATE gcv_bookings SET status = \'cancelled\' WHERE id = ?'
)->execute([$bookingId]);

// Liberar vaga
db()->prepare(
    'UPDATE gcv_tours t JOIN gcv_bookings b ON b.tour_id = t.id
     SET t.spots_taken = GREATEST(0, t.spots_taken - b.spots)
     WHERE b.id = ?'
)->execute([$bookingId]);

json_response(true, [
    'message'      => 'Reserva cancelada',
    'refund_type'  => $refundType,
    'refund_cents' => $refundCents,
]);
