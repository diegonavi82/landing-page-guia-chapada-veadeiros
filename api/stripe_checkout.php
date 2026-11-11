<?php

declare(strict_types=1);

/**
 * POST /api/stripe_checkout.php — cartão internacional (Stripe).
 * Preço: base conferida no servidor + PAY_CARD_INTL_PCT (25%), cobrado em USD
 * pela PTAX do dia + PAY_FX_SPREAD_PCT (4%). Ver helpers/payments/pricing.php.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/payments/checkout_common.php';
require_once __DIR__ . '/helpers/stripe_api.php';
require_once __DIR__ . '/helpers/payments/ledger.php';
require_once __DIR__ . '/helpers/payments/stripe_auth.php';
require_once __DIR__ . '/helpers/payments/rate_limit.php';
require_once __DIR__ . '/helpers/site_launch.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gcv_checkout_fail(405, 'Method not allowed');
}

if (!gcv_cartao_visivel()) {
    gcv_checkout_fail(403, 'Cartão indisponível no momento. Use Pix.', 'card_disabled');
}
gcv_rate_limit_or_fail('stripe_checkout', 8, 600);
$req = gcv_checkout_read_request();
$fullCents = (int) $req['base']['base_cents'];
require_once __DIR__ . '/helpers/indicacoes.php';
$walletCents = gcv_wallet_reserve_for_email($req['email'], $req['reservation_id'], $fullCents);
$chargeCents = max(0, $fullCents - $walletCents);
if ($walletCents > 0) {
    gcv_wallet_arm($req['reservation_id']);
}
if ($chargeCents < 1) {
    gcv_wallet_disarm();
    $cover = [
        'reservation_id' => $req['reservation_id'],
        'status' => 'PENDING',
        'amount' => 0,
        'amount_cents' => 0,
        'catalog_cents' => $fullCents,
        'wallet_cents' => $walletCents,
        'locale' => $req['locale'],
        'trips' => is_array($req['data']['trips'] ?? null) ? $req['data']['trips'] : [],
        'email' => $req['email'],
        'name' => $req['name'],
        'customer_name' => $req['name'],
        'created_at' => gmdate('c'),
        'paid_source' => null,
    ];
    if ($req['phone'] !== '') {
        $cover['phone'] = $req['phone'];
    }
    if (!gcv_pix_write_reservation($cover)) {
        gcv_wallet_release($req['reservation_id']);
        gcv_checkout_fail(500, 'Could not save reservation');
    }
    $paid = gcv_pix_mark_paid($req['reservation_id'], 'wallet');
    if (!$paid) {
        gcv_wallet_release($req['reservation_id']);
        gcv_checkout_fail(500, 'Could not confirm balance payment');
    }
    echo json_encode([
        'success' => true,
        'state' => 'PAID',
        'paid_with' => 'wallet',
        'url' => gcv_checkout_confirm_path($req['locale']) . '?id=' . rawurlencode($req['reservation_id']),
        'reservation_id' => $req['reservation_id'],
    ]);
    exit;
}
$quote = gcv_pay_quote($chargeCents, 'card_intl');
if (empty($quote['ok'])) {
    $fx = ($quote['error'] ?? '') === 'fx_unavailable';
    gcv_checkout_fail($fx ? 503 : 422, $fx ? 'Câmbio indisponível no momento. Tente de novo em instantes.' : 'Invalid amount', (string) ($quote['error'] ?? ''));
}
$reservationId = $req['reservation_id'];
$existing = $req['existing'];

// Reaproveita sessão aberta só se o valor e a moeda forem os mesmos.
if ($existing && !empty($existing['stripe_session_id'])
    && (int) ($existing['charged_minor'] ?? 0) === (int) $quote['charge_minor']
    && strtoupper((string) ($existing['charged_currency'] ?? '')) === strtoupper((string) $quote['currency'])) {
    $prev = gcv_stripe_request('GET', '/v1/checkout/sessions/' . rawurlencode((string) $existing['stripe_session_id']));
    if (!empty($prev['ok']) && ($prev['data']['status'] ?? '') === 'open' && !empty($prev['data']['url'])) {
        echo json_encode(['success' => true, 'url' => (string) $prev['data']['url'], 'reservation_id' => $reservationId]);
        exit;
    }
}

$record = gcv_checkout_build_record($req, $quote, 'stripe');
$record['catalog_cents'] = $fullCents;
$record['wallet_cents'] = $walletCents;
if (!gcv_pix_write_reservation($record)) {
    gcv_checkout_fail(500, 'Could not save reservation');
}

$origin = gcv_checkout_origin();
$currency = strtolower((string) $quote['currency']);
// Passeio dentro da janela (6 dias): reserva o valor agora (captura manual).
// Mais longe: só salva o cartão; a reserva é feita sozinha 6 dias antes.
$mode = gcv_auth_can_authorize_now($record, 'stripe') ? 'payment' : 'setup';
$lineItems = gcv_stripe_line_items($req['data'], $reservationId, (int) $quote['charge_minor'], $req['locale'], $currency);
$sess = gcv_stripe_auth_session($record, $mode, $origin, $req['return_path'], $lineItems);
if (empty($sess['ok'])) {
    gcv_checkout_fail(502, 'Não foi possível abrir o pagamento com cartão.', (string) ($sess['error'] ?? ''));
}
$session = ['data' => ['id' => $sess['id'], 'url' => $sess['url']]];
if (!empty($sess['customer'])) {
    $record['card_saved'] = ['gateway' => 'stripe', 'customer_id' => (string) $sess['customer']];
}
$record['stripe_flow'] = $mode;

$record['stripe_session_id'] = (string) ($session['data']['id'] ?? '');
gcv_pix_write_reservation($record);

gcv_ledger_upsert([
    'reservation_id' => $reservationId,
    'gateway' => 'stripe',
    'method' => 'card_intl',
    'checkout_ref' => $record['stripe_session_id'],
    'status' => 'PENDING',
    'currency' => $currency,
    'charge_minor' => (int) $quote['charge_minor'],
    'fx_rate' => $quote['fx_rate'] ?? null,
    'base_cents' => (int) $quote['base_cents'],
    'surcharge_cents' => (int) $quote['surcharge_cents'],
    'gross_cents' => (int) $quote['total_brl_cents'],
    'price_review' => !empty($record['price_review']) ? 1 : 0,
]);

gcv_wallet_disarm();
echo json_encode([
    'success' => true,
    'url' => (string) $session['data']['url'],
    'reservation_id' => $reservationId,
    'flow' => $mode,
]);
