<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/settings.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

$user      = require_auth();
$data      = body_json();
$bookingId = (int)($data['booking_id'] ?? 0);

if (!$bookingId) json_response(false, null, 'booking_id obrigatório', 422);

try {
    gcv_cms_ensure_schema();
} catch (Throwable $e) {
    // ok
}

$stmt = db()->prepare(
    'SELECT b.id, b.status, b.total_cents, b.mp_payment_id, b.client_id, b.spots,
            t.departure_date, t.spots_taken, t.quorum, t.max_spots, t.status AS tour_status
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     WHERE b.id = ?'
);
$stmt->execute([$bookingId]);
$booking = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$booking) json_response(false, null, 'Reserva não encontrada', 404);
if ((int)$booking['client_id'] !== (int)$user['id'] && $user['role'] !== 'admin') {
    json_response(false, null, 'Sem permissão', 403);
}
if (!in_array($booking['status'], ['pending', 'paid'], true)) {
    json_response(false, null, 'Reserva não pode ser cancelada', 409);
}
if (($booking['tour_status'] ?? '') === 'cancelled') {
    json_response(false, null, 'Passeio já cancelado', 409);
}

$quorum = max(4, (int)($booking['quorum'] ?? 4));
$taken = (int)($booking['spots_taken'] ?? 0);
$life = gcv_resolve_excursion_lifecycle([
    'status' => 'published',
    'date_iso' => $booking['departure_date'],
    'booked_people' => $taken,
    'quorum' => $quorum,
]);

// Em formação: pode cancelar. Confirmada: sem ressarcimento (ainda permite cancelar a vaga).
$allowCancel = in_array($life, ['em_formacao', 'confirmada'], true);
if (!$allowCancel) {
    json_response(false, null, 'Não é possível cancelar este passeio', 409);
}

$hoursUntilDeparture = (strtotime((string)$booking['departure_date']) - time()) / 3600;
$refundCents = 0;
$refundType  = 'none';

if ($life === 'confirmada') {
    // Regra de negócio: confirmado → sem ressarcimento
    $refundCents = 0;
    $refundType = 'none';
} elseif ($booking['status'] === 'paid' && $booking['mp_payment_id']) {
    $refundHours  = (int)setting('cancel_refund_hours', 48);
    $partialHours = (int)setting('cancel_partial_hours', 24);
    $partialPct   = (float)setting('cancel_partial_pct', 50);

    if ($hoursUntilDeparture >= $refundHours) {
        $refundCents = (int)$booking['total_cents'];
        $refundType  = 'full';
    } elseif ($hoursUntilDeparture >= $partialHours) {
        $refundCents = (int)round((int)$booking['total_cents'] * ($partialPct / 100));
        $refundType  = 'partial';
    }

    if ($refundCents > 0) {
        $mpToken = $_ENV['MP_ACCESS_TOKEN'] ?? '';
        if ($mpToken !== '') {
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
            $response = json_decode((string)curl_exec($ch), true);
            curl_close($ch);

            if (isset($response['error'])) {
                json_response(false, null, 'Erro ao processar reembolso: ' . ($response['message'] ?? 'desconhecido'), 500);
            }
        }
    }
}

db()->prepare(
    'UPDATE gcv_bookings SET status = \'cancelled\' WHERE id = ?'
)->execute([$bookingId]);

db()->prepare(
    'UPDATE gcv_tours t JOIN gcv_bookings b ON b.tour_id = t.id
     SET t.spots_taken = GREATEST(0, t.spots_taken - b.spots)
     WHERE b.id = ?'
)->execute([$bookingId]);

$msg = $life === 'confirmada'
    ? 'Reserva cancelada sem ressarcimento (passeio já confirmado).'
    : 'Reserva cancelada' . ($refundType !== 'none' ? ' com reembolso (' . $refundType . ').' : '.');

json_response(true, [
    'message'      => $msg,
    'lifecycle'    => $life,
    'refund_type'  => $refundType,
    'refund_cents' => $refundCents,
]);
