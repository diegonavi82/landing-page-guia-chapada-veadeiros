<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../vendor/autoload.php';

use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Payment\PaymentClient;
use MercadoPago\Exceptions\MPApiException;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

$user = require_auth();
$data = body_json();
$bookingId = (int)($data['booking_id'] ?? 0);
$cardToken = sanitize_text($data['card_token'] ?? '', 100);
$installments = max(1, (int)($data['installments'] ?? 1));
$paymentMethodId = sanitize_text($data['payment_method_id'] ?? '', 50);

if (!$bookingId || !$cardToken || !$paymentMethodId) {
    json_response(false, null, 'Campos obrigatórios ausentes', 422);
}

$stmt = db()->prepare(
    'SELECT b.id, b.total_cents, b.status, b.client_id, b.release_date,
            b.mp_guide_amount_cents, b.mp_marketplace_fee_cents,
            t.title_pt,
            c.email AS client_email, c.name AS client_name
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_users c ON c.id = b.client_id
     WHERE b.id = ?'
);
$stmt->execute([$bookingId]);
$booking = $stmt->fetch();

if (!$booking) json_response(false, null, 'Reserva não encontrada', 404);
if ((int)$booking['client_id'] !== (int)$user['id']) json_response(false, null, 'Sem permissão', 403);
if ($booking['status'] !== 'pending') json_response(false, null, 'Reserva não está pendente', 409);

MercadoPagoConfig::setAccessToken($_ENV['MP_ACCESS_TOKEN'] ?? '');

$client = new PaymentClient();

try {
    $request = [
        'transaction_amount' => round($booking['total_cents'] / 100, 2),
        'token'              => $cardToken,
        'description'        => $booking['title_pt'],
        'installments'       => $installments,
        'payment_method_id'  => $paymentMethodId,
        'payer'              => ['email' => $booking['client_email']],
        'money_release_date' => $booking['release_date'] . 'T10:00:00.000-03:00',
        'metadata'           => ['booking_id' => $bookingId],
    ];

    if ($booking['mp_marketplace_fee_cents']) {
        $request['application_fee'] = round($booking['mp_marketplace_fee_cents'] / 100, 2);
    }

    $payment = $client->create($request);

    db()->prepare(
        'UPDATE gcv_bookings SET mp_payment_id = ?, mp_status = ?, payment_method = \'card\' WHERE id = ?'
    )->execute([$payment->id, $payment->status, $bookingId]);

    json_response(true, [
        'mp_payment_id' => $payment->id,
        'status'        => $payment->status,
        'status_detail' => $payment->status_detail,
    ]);
} catch (MPApiException $e) {
    error_log('Card payment error: ' . $e->getMessage());
    json_response(false, null, 'Erro no pagamento: ' . $e->getMessage(), 500);
}
