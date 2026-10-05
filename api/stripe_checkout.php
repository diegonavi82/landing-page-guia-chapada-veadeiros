<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/stripe_api.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

function gcv_stripe_checkout_fail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    gcv_stripe_checkout_fail(400, 'Invalid JSON');
}

$reservationId = gcv_pix_safe_id((string) ($data['reservation_id'] ?? ''));
if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
    gcv_stripe_checkout_fail(422, 'Invalid reservation_id');
}

$amount = (float) ($data['amount'] ?? 0);
$cents = (int) round($amount * 100);
if (!is_finite($amount) || $cents < 50 || $cents > 10000000) {
    gcv_stripe_checkout_fail(422, 'Invalid amount');
}

$email = strtolower(trim((string) ($data['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    gcv_stripe_checkout_fail(422, 'Invalid email');
}

$name = trim((string) ($data['name'] ?? ''));
if ($name === '') {
    gcv_stripe_checkout_fail(422, 'Invalid name');
}

$locale = in_array($data['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $data['locale'] : 'pt';
$returnPath = gcv_stripe_safe_return_path((string) ($data['return_path'] ?? '/'));

$existing = gcv_pix_read_reservation($reservationId);
if ($existing && gcv_pix_effective_status($existing) === 'PAID') {
    gcv_stripe_checkout_fail(409, 'Reservation already paid');
}

if ($existing && !empty($existing['stripe_session_id'])) {
    $prev = gcv_stripe_request('GET', '/v1/checkout/sessions/' . rawurlencode((string) $existing['stripe_session_id']));
    if (!empty($prev['ok']) && ($prev['data']['status'] ?? '') === 'open' && !empty($prev['data']['url'])) {
        echo json_encode([
            'success' => true,
            'url' => (string) $prev['data']['url'],
            'reservation_id' => $reservationId,
        ]);
        exit;
    }
}

$record = [
    'reservation_id' => $reservationId,
    'status' => 'PENDING',
    'amount' => round($cents / 100, 2),
    'amount_cents' => $cents,
    'txid' => '',
    'brcode' => '',
    'pix_mode' => 'stripe',
    'payment_method' => 'card',
    'locale' => $locale,
    'trips' => is_array($data['trips'] ?? null) ? $data['trips'] : [],
    'created_at' => gmdate('c'),
    'expires_at' => gmdate('c', time() + 86400),
    'paid_at' => null,
    'paid_source' => null,
    'email' => $email,
    'name' => function_exists('mb_substr') ? mb_substr($name, 0, 160) : substr($name, 0, 160),
    'ip' => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
    'return_path' => $returnPath,
];
$record['customer_name'] = $record['name'];

$phone = trim((string) ($data['phone'] ?? ''));
$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($phoneDigits) >= 10 && strlen($phoneDigits) <= 15) {
    $record['phone'] = $phone;
}

$inclExclRaw = $data['incl_excl'] ?? $data['inclExcl'] ?? null;
if (is_array($inclExclRaw)) {
    $record['incl_excl'] = $inclExclRaw;
}
if (is_array($data['packages'] ?? null) && $data['packages']) {
    $record['packages'] = $data['packages'];
}

if (!gcv_pix_write_reservation($record)) {
    gcv_stripe_checkout_fail(500, 'Could not save reservation');
}

$origin = gcv_stripe_origin();
$session = gcv_stripe_request('POST', '/v1/checkout/sessions', [
    'mode' => 'payment',
    'payment_method_types' => ['card'],
    'customer_email' => $email,
    'client_reference_id' => $reservationId,
    'success_url' => $origin . '/api/stripe_return.php?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => $origin . $returnPath,
    'metadata' => [
        'reservation_id' => $reservationId,
        'locale' => $locale,
    ],
    'line_items' => gcv_stripe_line_items($data, $reservationId, $cents, $locale),
]);

if (empty($session['ok']) || empty($session['data']['url'])) {
    gcv_stripe_checkout_fail(502, 'Não foi possível abrir o pagamento com cartão.');
}

$record['stripe_session_id'] = (string) ($session['data']['id'] ?? '');
gcv_pix_write_reservation($record);

echo json_encode([
    'success' => true,
    'url' => (string) $session['data']['url'],
    'reservation_id' => $reservationId,
]);
