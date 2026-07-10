<?php

declare(strict_types=1);

/**
 * Confirmação manual de reserva Pix (admin / suporte).
 * POST JSON: { "reservation_id": "GCV-XXXXXX" }
 * Auth: header X-GCV-Webhook-Secret ou ?secret= (mesmo pix_webhook_secret)
 */
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/helpers/pix_reservation_store.php';
require_once dirname(__DIR__) . '/db.php';
require_once dirname(__DIR__) . '/helpers/sicoob_api.php';

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

$res = gcv_pix_read_reservation($reservationId);
if (!$res) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Not found']);
    exit;
}

$status = gcv_pix_effective_status($res);
if ($status === 'PAID') {
    echo json_encode([
        'success' => true,
        'status' => 'PAID',
        'reservation_id' => $reservationId,
        'already_paid' => true,
        'paid_at' => $res['paid_at'] ?? null,
    ]);
    exit;
}

if ($status === 'EXPIRED') {
    http_response_code(409);
    echo json_encode(['success' => false, 'status' => 'EXPIRED', 'message' => 'Reservation expired']);
    exit;
}

// Tenta conciliar com a API Sicoob antes de forçar
$confirmed = gcv_sicoob_try_confirm_reservation($res);
if ($confirmed) {
    try {
        require_once dirname(__DIR__) . '/helpers/purchase_notify.php';
        gcv_notify_admin_purchase($confirmed);
    } catch (Throwable $e) {
        error_log('confirm-pix-manual notify: ' . $e->getMessage());
    }
    echo json_encode([
        'success' => true,
        'status' => 'PAID',
        'reservation_id' => $reservationId,
        'source' => 'sicoob_poll',
        'paid_at' => $confirmed['paid_at'] ?? null,
    ]);
    exit;
}

$force = !empty($data['force']);
if (!$force) {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'status' => 'PENDING',
        'message' => 'Sicoob ainda não conciliou. Envie force:true se o Pix já caiu na conta.',
        'sicoob_configured' => gcv_sicoob_is_configured(),
        'amount' => $res['amount'] ?? null,
        'email' => $res['email'] ?? null,
        'created_at' => $res['created_at'] ?? null,
    ]);
    exit;
}

$paid = gcv_pix_mark_paid($reservationId, 'admin_manual');
if (!$paid) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not mark paid']);
    exit;
}

try {
    require_once dirname(__DIR__) . '/helpers/purchase_notify.php';
    gcv_notify_admin_purchase($paid);
} catch (Throwable $e) {
    error_log('confirm-pix-manual notify: ' . $e->getMessage());
}

echo json_encode([
    'success' => true,
    'status' => 'PAID',
    'reservation_id' => $reservationId,
    'source' => 'admin_manual',
    'paid_at' => $paid['paid_at'] ?? null,
]);
