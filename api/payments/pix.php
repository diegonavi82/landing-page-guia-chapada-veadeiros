<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/settings.php';
require_once __DIR__ . '/../vendor/autoload.php';

use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Payment\PaymentClient;
use MercadoPago\Exceptions\MPApiException;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

$user = require_auth();
$data = body_json();
$bookingId = (int)($data['booking_id'] ?? 0);

if (!$bookingId) json_response(false, null, 'booking_id obrigatório', 422);

$stmt = db()->prepare(
    'SELECT b.id, b.total_cents, b.status, b.client_id, b.release_date,
            b.mp_guide_amount_cents, b.mp_marketplace_fee_cents,
            t.title_pt, t.departure_date, t.guide_id,
            g.mp_access_token AS guide_mp_token, g.mp_user_id AS guide_mp_user_id,
            c.email AS client_email, c.name AS client_name
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_guides g ON g.user_id = t.guide_id
     JOIN gcv_users c ON c.id = b.client_id
     WHERE b.id = ?'
);
$stmt->execute([$bookingId]);
$booking = $stmt->fetch();

if (!$booking) json_response(false, null, 'Reserva não encontrada', 404);
if ((int)$booking['client_id'] !== (int)$user['id']) json_response(false, null, 'Sem permissão', 403);
if ($booking['status'] !== 'pending') json_response(false, null, 'Reserva não está pendente', 409);

MercadoPagoConfig::setAccessToken($_ENV['MP_ACCESS_TOKEN'] ?? '');
MercadoPagoConfig::setRuntimeEnviroment(MercadoPagoConfig::LOCAL);

$client = new PaymentClient();

try {
    $request = [
        'transaction_amount' => round($booking['total_cents'] / 100, 2),
        'description'        => $booking['title_pt'],
        'payment_method_id'  => 'pix',
        'payer'              => [
            'email' => $booking['client_email'],
            'first_name' => explode(' ', $booking['client_name'])[0],
        ],
        'date_of_expiration' => date('Y-m-d\TH:i:s.000-03:00', time() + 1800),
        'money_release_date' => $booking['release_date'] . 'T10:00:00.000-03:00',
        'metadata'           => ['booking_id' => $bookingId],
    ];

    // Split para o guia se tiver MP conectado
    if ($booking['guide_mp_token'] && $booking['guide_mp_user_id'] && $booking['mp_guide_amount_cents']) {
        $request['application_fee'] = round($booking['mp_marketplace_fee_cents'] / 100, 2);
    }

    $payment = $client->create($request);

    db()->prepare(
        'UPDATE gcv_bookings SET mp_payment_id = ?, payment_method = \'pix\' WHERE id = ?'
    )->execute([$payment->id, $bookingId]);

    $pixData = $payment->point_of_interaction->transaction_data ?? null;

    json_response(true, [
        'mp_payment_id'  => $payment->id,
        'qr_code'        => $pixData->qr_code ?? null,
        'qr_code_base64' => $pixData->qr_code_base64 ?? null,
        'expires_in'     => 1800,
    ]);
} catch (MPApiException $e) {
    error_log('PIX error: ' . $e->getMessage());
    json_response(false, null, 'Erro ao gerar PIX: ' . $e->getMessage(), 500);
}
