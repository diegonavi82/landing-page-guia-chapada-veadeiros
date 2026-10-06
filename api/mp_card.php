<?php

declare(strict_types=1);

/**
 * POST /api/mp_card.php — cartão nacional pelo formulário embutido do Mercado Pago (Card Payment Brick).
 * Corpo: os campos do checkout (reservation_id, amount base, trips, name, email, phone, locale, return_path)
 *        + card: { token, payment_method_id, issuer_id, installments, payer: { identification } }
 *
 * Passeio em até PAY_MP_AUTH_DAYS (4) dias → reserva o valor no cartão (não cobra).
 * Mais longe → salva o cartão no Mercado Pago; 4 dias antes o cliente confirma o CVV por link.
 * Em ambos os casos a cobrança só acontece quando o passeio confirmar.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/mailer.php'; // escopo global: e-mails
require_once __DIR__ . '/helpers/payments/checkout_common.php';
require_once __DIR__ . '/helpers/payments/mercadopago_api.php';
require_once __DIR__ . '/helpers/payments/authorization.php';
require_once __DIR__ . '/helpers/payments/rate_limit.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gcv_checkout_fail(405, 'Method not allowed');
}
gcv_rate_limit_or_fail('mp_card', 8, 600);

$req = gcv_checkout_read_request();
$card = is_array($req['data']['card'] ?? null) ? $req['data']['card'] : [];
if (empty($card['token']) || empty($card['payment_method_id'])) {
    gcv_checkout_fail(422, 'Dados do cartão incompletos.', 'card_missing');
}

$quote = gcv_pay_quote((int) $req['base']['base_cents'], 'card_br');
if (empty($quote['ok'])) {
    gcv_checkout_fail(422, 'Invalid amount');
}
$installments = max(1, (int) ($card['installments'] ?? 1));
if ($installments > (int) $quote['max_installments']) {
    gcv_checkout_fail(422, 'Número de parcelas inválido.', 'installments');
}

$rec = gcv_checkout_build_record($req, $quote, 'mercadopago');
$rec['installments'] = $installments;
$rec['charged_label'] = gcv_checkout_charged_label('brl', (int) $quote['charge_minor'], $installments);
if (!gcv_pix_write_reservation($rec)) {
    gcv_checkout_fail(500, 'Could not save reservation');
}
$rid = $rec['reservation_id'];
$locale = $req['locale'];

gcv_ledger_upsert([
    'reservation_id' => $rid, 'gateway' => 'mercadopago', 'method' => 'card_br', 'status' => 'PENDING',
    'installments' => $installments, 'currency' => 'BRL', 'charge_minor' => (int) $quote['charge_minor'],
    'base_cents' => (int) $quote['base_cents'], 'surcharge_cents' => (int) $quote['surcharge_cents'],
    'gross_cents' => (int) $quote['total_brl_cents'], 'price_review' => !empty($rec['price_review']) ? 1 : 0,
]);

$confirmUrl = gcv_checkout_confirm_path($locale) . '?id=' . rawurlencode($rid);

if (gcv_auth_can_authorize_now($rec, 'mercadopago')) {
    // Reserva o valor agora (capture=false)
    $r = gcv_mp_authorize($rec, $card);
    $p = $r['payment'] ?? [];
    if (empty($r['ok']) || ($p['status'] ?? '') !== 'authorized') {
        $detail = (string) ($p['status_detail'] ?? $r['error'] ?? '');
        gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => 'mercadopago', 'status' => 'FAILED', 'external_id' => isset($p['id']) ? (string) $p['id'] : null]);
        gcv_checkout_fail(402, gcv_mp_decline_message($detail, $locale), 'declined');
    }
    gcv_auth_mark_reserved($rid, 'AUTHORIZED', [
        'gateway' => 'mercadopago',
        'auth_id' => (string) $p['id'],
        'amount_minor' => (int) round(((float) $p['transaction_amount']) * 100),
        'currency' => 'BRL',
        'installments' => $installments,
    ]);
    gcv_ledger_upsert([
        'reservation_id' => $rid, 'gateway' => 'mercadopago', 'external_id' => (string) $p['id'], 'status' => 'AUTHORIZED',
        'fee_detail' => ['card_last4' => $p['card']['last_four_digits'] ?? null, 'payment_method_id' => $p['payment_method_id'] ?? null],
    ]);
    gcv_auth_process_reservation($rid); // se o passeio já estiver confirmado, cobra na hora
    echo json_encode(['success' => true, 'state' => 'AUTHORIZED', 'redirect' => $confirmUrl, 'reservation_id' => $rid]);
    exit;
}

// Passeio distante: salva o cartão
$customerId = gcv_mp_customer_id($req['email'], $req['name']);
if (!$customerId) {
    gcv_checkout_fail(502, 'Não foi possível salvar o cartão. Tente de novo.', 'customer');
}
$saved = gcv_mp_request('POST', '/v1/customers/' . rawurlencode($customerId) . '/cards', ['token' => (string) $card['token']]);
if (empty($saved['ok']) || empty($saved['data']['id'])) {
    gcv_checkout_fail(402, gcv_mp_decline_message('', $locale), 'card_save');
}
gcv_auth_mark_reserved($rid, 'CARD_SAVED', [
    'gateway' => 'mercadopago',
    'installments' => $installments,
    'saved' => [
        'customer_id' => $customerId,
        'card_id' => (string) $saved['data']['id'],
        'payment_method_id' => (string) ($card['payment_method_id'] ?? ''),
        'issuer_id' => (string) ($card['issuer_id'] ?? ''),
        'installments' => $installments,
        'last4' => (string) ($saved['data']['last_four_digits'] ?? ''),
        'identification' => $card['payer']['identification'] ?? null,
    ],
]);
gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => 'mercadopago', 'status' => 'CARD_SAVED']);
echo json_encode(['success' => true, 'state' => 'CARD_SAVED', 'redirect' => $confirmUrl, 'reservation_id' => $rid]);
