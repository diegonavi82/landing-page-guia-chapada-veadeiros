<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/openpix_api.php';
require_once __DIR__ . '/helpers/sicoob_api.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$reservationId = gcv_pix_safe_id((string)($_GET['reservation_id'] ?? ''));
if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid reservation_id']);
    exit;
}

$res = gcv_pix_read_reservation($reservationId);
if (!$res) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Not found']);
    exit;
}

$status = gcv_pix_effective_status($res);
if ($status === 'PENDING') {
    $confirmed = gcv_sicoob_try_confirm_reservation($res);
    if (!$confirmed) {
        $confirmed = gcv_openpix_try_confirm_reservation($res);
    }
    if ($confirmed) {
        $res = $confirmed;
        $status = 'PAID';
    }
}
if ($status === 'EXPIRED' && ($res['status'] ?? '') !== 'EXPIRED') {
    $res['status'] = 'EXPIRED';
    gcv_pix_write_reservation($res);
}

$payload = [
    'success' => true,
    'status' => $status,
    'reservation_id' => $reservationId,
    'amount' => $res['amount'] ?? null,
    'locale' => $res['locale'] ?? 'pt',
    'trips' => $res['trips'] ?? [],
    'paid_at' => $res['paid_at'] ?? null,
];
if (!empty($res['incl_excl']) && is_array($res['incl_excl'])) {
    $payload['incl_excl'] = $res['incl_excl'];
}
if (!empty($res['packages']) && is_array($res['packages'])) {
    $payload['packages'] = $res['packages'];
}
echo json_encode($payload);
