<?php

declare(strict_types=1);

/**
 * Confirmação de Pix — apenas via segredo de webhook (banco / OpenPix / admin).
 * Não aceita confirmação manual do navegador do cliente.
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/db.php';

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

$cfg = gcv_load_config();
$expected = (string)($cfg['pix_webhook_secret'] ?? '');
$secret = (string)($_SERVER['HTTP_X_GCV_WEBHOOK_SECRET'] ?? ($_GET['secret'] ?? ''));

if ($expected === '' || !hash_equals($expected, $secret)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

$reservationId = gcv_pix_safe_id((string)($data['reservation_id'] ?? ''));
if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid reservation_id']);
    exit;
}

$res = gcv_pix_mark_paid($reservationId, 'webhook');

if (!$res) {
    $existing = gcv_pix_read_reservation($reservationId);
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Not found']);
        exit;
    }
    if (gcv_pix_effective_status($existing) === 'EXPIRED') {
        http_response_code(409);
        echo json_encode(['success' => false, 'status' => 'EXPIRED']);
        exit;
    }
    if (($existing['status'] ?? '') === 'PAID') {
        echo json_encode(['success' => true, 'status' => 'PAID', 'reservation_id' => $reservationId]);
        exit;
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not confirm']);
    exit;
}

try {
    require_once __DIR__ . '/helpers/purchase_notify.php';
    gcv_notify_admin_purchase($res);
} catch (Throwable $e) {
    error_log('confirm_pix_payment notify: ' . $e->getMessage());
}

echo json_encode([
    'success' => true,
    'status' => 'PAID',
    'reservation_id' => $reservationId,
    'paid_at' => $res['paid_at'] ?? null,
]);
