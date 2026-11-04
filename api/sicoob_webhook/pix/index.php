<?php

declare(strict_types=1);

/**
 * Webhook PIX Sicoob — recebe POST em /api/sicoob_webhook/pix
 *
 * Registre na API Sicoob (PUT /webhook/{chave}):
 *   webhookUrl = https://www.guiachapadaveadeiros.com/api/sicoob_webhook
 * O Sicoob adiciona /pix → POST neste endpoint.
 */
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/helpers/pix_reservation_store.php';
require_once dirname(__DIR__, 2) . '/helpers/sicoob_webhook.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!gcv_sicoob_webhook_ip_allowed()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden IP']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

$match = gcv_sicoob_match_webhook_payload($data);
if (!$match) {
    // Não é de reserva: pode ser o repasse do Mercado Pago chegando no Sicoob.
    try {
        require_once dirname(__DIR__, 2) . '/helpers/payments/ledger.php';
        if (gcv_ledger_match_incoming_transfer($data)) {
            echo json_encode(['success' => true, 'status' => 'SETTLEMENT', 'gateway' => 'mercadopago']);
            exit;
        }
    } catch (Throwable $e) {
        error_log('sicoob_webhook settlement: ' . $e->getMessage());
    }
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Could not map Sicoob payload to reservation (txid GCV-XXXXXX)',
    ]);
    exit;
}

$reservationId = gcv_pix_safe_id((string)($match['reservation']['reservation_id'] ?? ''));
if (($match['reservation']['status'] ?? '') === 'PAID') {
    echo json_encode([
        'success' => true,
        'status' => 'PAID',
        'reservation_id' => $reservationId,
        'already_paid' => true,
    ]);
    exit;
}

$res = gcv_sicoob_confirm_webhook_payload($data);
if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not confirm reservation']);
    exit;
}

try {
    require_once dirname(__DIR__, 2) . '/helpers/purchase_notify.php';
    gcv_notify_admin_purchase($res);
} catch (Throwable $e) {
    error_log('sicoob_webhook purchase notify: ' . $e->getMessage());
}

echo json_encode([
    'success' => true,
    'status' => 'PAID',
    'reservation_id' => $reservationId,
    'paid_at' => $res['paid_at'] ?? null,
]);
