<?php

declare(strict_types=1);

/**
 * POST /api/mp_webhook.php — notificações do Mercado Pago (pagamentos, estornos, chargebacks).
 * Painel MP → Suas integrações → Webhooks: URL https://www.guiachapadaveadeiros.com/api/mp_webhook.php
 * eventos "Pagamentos" e "Contestações". Copie a assinatura secreta para MP_WEBHOOK_SECRET.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/mailer.php'; // escopo global: e-mails de aviso
require_once __DIR__ . '/helpers/payments/checkout_common.php';
require_once __DIR__ . '/helpers/payments/mercadopago_api.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
$body = is_array($body) ? $body : [];
$type = (string) ($body['type'] ?? $_GET['type'] ?? $_GET['topic'] ?? '');
$dataId = (string) ($_GET['data_id'] ?? $_GET['data.id'] ?? $body['data']['id'] ?? $_GET['id'] ?? '');

if (!gcv_mp_valid_signature($dataId)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'bad_signature']);
    exit;
}

// Só pagamentos interessam (chargebacks também chegam como mudança de status do pagamento).
if (!in_array($type, ['payment', 'chargebacks'], true) || !preg_match('/^\d{3,20}$/', $dataId)) {
    echo json_encode(['ok' => true, 'ignored' => true]);
    exit;
}

$paymentId = $dataId;
if ($type === 'chargebacks') {
    $cb = gcv_mp_request('GET', '/v1/chargebacks/' . $dataId);
    $paymentId = (string) ($cb['data']['payments'][0] ?? '');
}

$payment = $paymentId !== '' ? gcv_mp_get_payment($paymentId) : null;
if (!$payment) {
    // 200 para o MP não insistir em algo que não é nosso; erro de API → 500 para retentar.
    http_response_code($paymentId === '' ? 200 : 500);
    echo json_encode(['ok' => false, 'error' => 'payment_not_found']);
    exit;
}

$out = gcv_mp_apply_payment($payment);
echo json_encode(['ok' => true, 'status' => $out['status'] ?? '', 'reservation_id' => $out['reservation_id'] ?? null]);
