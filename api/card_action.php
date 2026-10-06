<?php

declare(strict_types=1);

/**
 * Página "Confirmar cartão" (link assinado enviado por e-mail).
 *
 * GET  ?r=GCV-XXXXXX&k=…            → dados para a página
 * POST {r, k, action:"mp", token}    → Mercado Pago: reserva no cartão salvo (CVV digitado no Brick)
 * POST {r, k, action:"stripe"}       → Stripe: abre o checkout para reservar (quando o banco pediu)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/helpers/mailer.php';
require_once __DIR__ . '/helpers/payments/checkout_common.php';
require_once __DIR__ . '/helpers/payments/authorization.php';
require_once __DIR__ . '/helpers/payments/mercadopago_api.php';
require_once __DIR__ . '/helpers/payments/rate_limit.php';

function gcv_card_action_out(int $code, array $data): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = $method === 'POST' ? (json_decode(file_get_contents('php://input') ?: '', true) ?: []) : $_GET;
$rid = gcv_pix_safe_id((string) ($body['r'] ?? ''));
$key = (string) ($body['k'] ?? '');
if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $rid) || !gcv_auth_valid_action_token($rid, $key)) {
    gcv_card_action_out(403, ['success' => false, 'message' => 'Link inválido ou expirado.']);
}
$rec = gcv_pix_read_reservation($rid);
if (!$rec) {
    gcv_card_action_out(404, ['success' => false, 'message' => 'Reserva não encontrada.']);
}
$status = strtoupper((string) ($rec['status'] ?? ''));
$gateway = (string) ($rec['gateway'] ?? '');
$locale = (string) ($rec['locale'] ?? 'pt');

if ($method === 'GET') {
    $trips = [];
    foreach (gcv_auth_trip_rows($rid) as $t) {
        $trips[] = ['title' => $t['title'], 'starts_at' => $t['starts_at'], 'people' => (int) $t['people']];
    }
    $saved = is_array($rec['card_saved'] ?? null) ? $rec['card_saved'] : [];
    gcv_card_action_out(200, [
        'success' => true,
        'reservation_id' => $rid,
        'status' => $status,
        'gateway' => $gateway,
        'locale' => $locale,
        'charged_label' => (string) ($rec['charged_label'] ?? ''),
        'trips' => $trips,
        'mp' => $gateway === 'mercadopago' ? [
            'public_key' => (string) ($_ENV['MP_PUBLIC_KEY'] ?? getenv('MP_PUBLIC_KEY') ?: ''),
            'customer_id' => (string) ($saved['customer_id'] ?? ''),
            'card_id' => (string) ($saved['card_id'] ?? ''),
            'last4' => (string) ($saved['last4'] ?? ''),
            'payment_method_id' => (string) ($saved['payment_method_id'] ?? ''),
            'amount' => round(((int) ($rec['charged_minor'] ?? 0)) / 100, 2),
        ] : null,
    ]);
}

if ($method !== 'POST') {
    gcv_card_action_out(405, ['success' => false]);
}
gcv_rate_limit_or_fail('card_action', 6, 600);
if ($status !== 'CARD_SAVED') {
    gcv_card_action_out(200, ['success' => true, 'status' => $status, 'redirect' => gcv_checkout_confirm_path($locale) . '?id=' . rawurlencode($rid)]);
}

$action = (string) ($body['action'] ?? '');
if ($action === 'mp' && $gateway === 'mercadopago') {
    $saved = $rec['card_saved'] ?? [];
    $token = (string) ($body['token'] ?? '');
    if ($token === '') {
        gcv_card_action_out(422, ['success' => false, 'message' => 'Digite o código de segurança do cartão.']);
    }
    $r = gcv_mp_authorize($rec, [
        'token' => $token,
        'installments' => (int) ($saved['installments'] ?? $rec['installments'] ?? 1),
        'payment_method_id' => (string) ($saved['payment_method_id'] ?? ''),
        'issuer_id' => (string) ($saved['issuer_id'] ?? ''),
        'payer' => ['identification' => $saved['identification'] ?? null],
    ], (string) ($saved['customer_id'] ?? ''));
    $p = $r['payment'] ?? [];
    if (empty($r['ok']) || ($p['status'] ?? '') !== 'authorized') {
        gcv_card_action_out(402, ['success' => false, 'message' => gcv_mp_decline_message((string) ($p['status_detail'] ?? ''), $locale)]);
    }
    gcv_auth_mark_reserved($rid, 'AUTHORIZED', [
        'gateway' => 'mercadopago',
        'auth_id' => (string) $p['id'],
        'amount_minor' => (int) round(((float) $p['transaction_amount']) * 100),
        'currency' => 'BRL',
        'installments' => (int) ($p['installments'] ?? 1),
    ]);
    gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => 'mercadopago', 'external_id' => (string) $p['id'], 'status' => 'AUTHORIZED']);
    gcv_auth_process_reservation($rid);
    gcv_card_action_out(200, ['success' => true, 'status' => 'AUTHORIZED', 'redirect' => gcv_checkout_confirm_path($locale) . '?id=' . rawurlencode($rid)]);
}

if ($action === 'stripe' && $gateway === 'stripe') {
    require_once __DIR__ . '/helpers/payments/stripe_auth.php';
    $items = gcv_stripe_line_items($rec, $rid, (int) $rec['charged_minor'], $locale, strtolower((string) ($rec['charged_currency'] ?? 'usd')));
    $s = gcv_stripe_auth_session($rec, 'payment', gcv_checkout_origin(), gcv_checkout_confirm_path($locale) . '?id=' . rawurlencode($rid), $items);
    if (empty($s['ok'])) {
        gcv_card_action_out(502, ['success' => false, 'message' => 'Não foi possível abrir o pagamento. Tente de novo.']);
    }
    gcv_card_action_out(200, ['success' => true, 'url' => $s['url']]);
}

gcv_card_action_out(400, ['success' => false, 'message' => 'Ação inválida.']);
