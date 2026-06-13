<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';

header('Content-Type: application/json; charset=utf-8');

// Carregar .env
$envFile = dirname(__DIR__, 2) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

// Validar assinatura x-signature do MP
$xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
$payload    = file_get_contents('php://input');
$data       = json_decode($payload, true);

if ($xSignature && $_ENV['MP_WEBHOOK_SECRET'] ?? '') {
    // Extrair ts e v1 da assinatura
    $sigParts = [];
    foreach (explode(',', $xSignature) as $part) {
        [$k, $v] = array_pad(explode('=', $part, 2), 2, '');
        $sigParts[trim($k)] = trim($v);
    }
    $ts = $sigParts['ts'] ?? '';
    $v1 = $sigParts['v1'] ?? '';
    $dataId  = $data['data']['id'] ?? '';
    $manifest = "id:{$dataId};request-id:{$xRequestId};ts:{$ts};";
    $expected = hash_hmac('sha256', $manifest, $_ENV['MP_WEBHOOK_SECRET']);
    if (!hash_equals($expected, $v1)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Assinatura inválida']);
        exit;
    }
}

if (($data['type'] ?? '') !== 'payment') {
    echo json_encode(['ok' => true]);
    exit;
}

$mpPaymentId = (string)($data['data']['id'] ?? '');
if (!$mpPaymentId) {
    echo json_encode(['ok' => true]);
    exit;
}

// Buscar detalhes do pagamento na API do MP
$mpToken = $_ENV['MP_ACCESS_TOKEN'] ?? '';
$ch = curl_init("https://api.mercadopago.com/v1/payments/{$mpPaymentId}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $mpToken],
]);
$mpPayment = json_decode(curl_exec($ch), true);
curl_close($ch);

if (($mpPayment['status'] ?? '') !== 'approved') {
    // Atualizar status no banco mesmo assim
    if ($mpPaymentId) {
        db()->prepare(
            'UPDATE gcv_bookings SET mp_status = ? WHERE mp_payment_id = ?'
        )->execute([$mpPayment['status'] ?? 'unknown', $mpPaymentId]);
    }
    echo json_encode(['ok' => true]);
    exit;
}

// Buscar booking pelo mp_payment_id
$stmt = db()->prepare(
    'SELECT b.id, b.status, b.spots, b.total_cents, b.tour_id,
            b.client_id, c.name AS client_name, c.email AS client_email,
            t.title_pt AS tour_title, t.departure_date,
            g.name AS guide_name, g.email AS guide_email
     FROM gcv_bookings b
     JOIN gcv_users c ON c.id = b.client_id
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_users g ON g.id = t.guide_id
     WHERE b.mp_payment_id = ? AND b.status = \'pending\''
);
$stmt->execute([$mpPaymentId]);
$booking = $stmt->fetch();

if (!$booking) {
    echo json_encode(['ok' => true]);
    exit;
}

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare(
        'UPDATE gcv_bookings SET status = \'paid\', mp_status = \'approved\', updated_at = NOW() WHERE id = ?'
    )->execute([$booking['id']]);

    $pdo->prepare(
        'UPDATE gcv_tours SET spots_taken = spots_taken + ? WHERE id = ?'
    )->execute([$booking['spots'], $booking['tour_id']]);

    $pdo->commit();
} catch (\Exception $e) {
    $pdo->rollBack();
    error_log('Webhook booking update error: ' . $e->getMessage());
    http_response_code(500);
    exit;
}

mail_payment_approved($booking['client_email'], $booking['client_name'], $booking['tour_title']);
mail_booking_confirmed(
    $booking['guide_email'],
    $booking['guide_name'],
    $booking['tour_title'],
    $booking['departure_date'],
    $booking['spots'],
    $booking['total_cents']
);

echo json_encode(['ok' => true]);
