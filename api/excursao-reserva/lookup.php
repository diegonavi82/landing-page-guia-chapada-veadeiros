<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/helpers/pix_reservation_store.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON']);
    exit;
}

$reservationId = gcv_pix_safe_id((string)($data['reservation_id'] ?? $data['code'] ?? ''));
$email = strtolower(trim((string)($data['email'] ?? '')));

if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Invalid reservation code']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Invalid email']);
    exit;
}

$res = gcv_pix_read_reservation($reservationId);
if (!$res) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'message' => 'Not found']);
    exit;
}

$storedEmail = strtolower(trim((string)($res['email'] ?? '')));
if ($storedEmail === '') {
    $res['email'] = $email;
    gcv_pix_write_reservation($res);
} elseif (!hash_equals($storedEmail, $email)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Email does not match this reservation']);
    exit;
}

$status = gcv_pix_effective_status($res);
if ($status === 'EXPIRED' && ($res['status'] ?? '') !== 'EXPIRED') {
    $res['status'] = 'EXPIRED';
    gcv_pix_write_reservation($res);
}

$payload = [
    'ok' => true,
    'reservation_id' => $reservationId,
    'status' => $status,
    'amount' => $res['amount'] ?? null,
    'locale' => $res['locale'] ?? 'pt',
    'trips' => $res['trips'] ?? [],
    'paid_at' => $res['paid_at'] ?? null,
    'created_at' => $res['created_at'] ?? null,
    'expires_at' => $res['expires_at'] ?? null,
];
if (!empty($res['incl_excl']) && is_array($res['incl_excl'])) {
    $payload['incl_excl'] = $res['incl_excl'];
}
if (!empty($res['packages']) && is_array($res['packages'])) {
    $payload['packages'] = $res['packages'];
}
echo json_encode($payload);
