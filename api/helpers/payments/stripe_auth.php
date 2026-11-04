<?php

declare(strict_types=1);

/**
 * Stripe — pré-autorização (capture_method=manual), cartão salvo e reserva automática.
 */

require_once __DIR__ . '/../stripe_api.php';
require_once __DIR__ . '/authorization.php';

/** Cria o cliente na Stripe (para salvar o cartão). */
function gcv_stripe_create_customer(string $email, string $name, string $reservationId): ?string
{
    $r = gcv_stripe_request('POST', '/v1/customers', [
        'email' => $email,
        'name' => $name,
        'metadata' => ['reservation_id' => $reservationId],
    ]);
    return !empty($r['ok']) ? (string) ($r['data']['id'] ?? '') : null;
}

function gcv_stripe_auth_capture(string $paymentIntent, int $amountMinor): bool
{
    $r = gcv_stripe_request('POST', '/v1/payment_intents/' . rawurlencode($paymentIntent) . '/capture', [
        'amount_to_capture' => $amountMinor,
    ]);
    if (!empty($r['ok'])) {
        return true;
    }
    // Já capturado (retentativa do cron) conta como sucesso.
    $pi = gcv_stripe_request('GET', '/v1/payment_intents/' . rawurlencode($paymentIntent));
    return !empty($pi['ok']) && ($pi['data']['status'] ?? '') === 'succeeded';
}

function gcv_stripe_auth_cancel(string $paymentIntent): bool
{
    $r = gcv_stripe_request('POST', '/v1/payment_intents/' . rawurlencode($paymentIntent) . '/cancel', [
        'cancellation_reason' => 'abandoned',
    ]);
    if (!empty($r['ok'])) {
        return true;
    }
    $pi = gcv_stripe_request('GET', '/v1/payment_intents/' . rawurlencode($paymentIntent));
    return !empty($pi['ok']) && ($pi['data']['status'] ?? '') === 'canceled';
}

/**
 * Reserva no cartão salvo sem o cliente presente. Se o banco pedir autenticação
 * ou recusar, manda o link de confirmação ao cliente.
 */
function gcv_stripe_auth_off_session(array $rec): string
{
    $saved = is_array($rec['card_saved'] ?? null) ? $rec['card_saved'] : [];
    $customer = (string) ($saved['customer_id'] ?? '');
    $pm = (string) ($saved['payment_method_id'] ?? '');
    if ($customer === '' || $pm === '') {
        return gcv_auth_request_customer_action($rec, 'stripe_no_card');
    }
    $rid = (string) $rec['reservation_id'];
    $r = gcv_stripe_request('POST', '/v1/payment_intents', [
        'amount' => (int) $rec['charged_minor'],
        'currency' => strtolower((string) ($rec['charged_currency'] ?? 'usd')),
        'customer' => $customer,
        'payment_method' => $pm,
        'off_session' => 'true',
        'confirm' => 'true',
        'capture_method' => 'manual',
        'description' => 'Guia Chapada Veadeiros ' . $rid,
        'statement_descriptor_suffix' => 'CHAPADA',
        'metadata' => ['reservation_id' => $rid, 'kind' => 'off_session_auth'],
    ]);
    if (!empty($r['ok']) && ($r['data']['status'] ?? '') === 'requires_capture') {
        gcv_auth_mark_reserved($rid, 'AUTHORIZED', [
            'gateway' => 'stripe',
            'auth_id' => (string) $r['data']['id'],
            'amount_minor' => (int) $r['data']['amount'],
            'currency' => (string) $r['data']['currency'],
        ]);
        gcv_ledger_upsert([
            'reservation_id' => $rid, 'gateway' => 'stripe', 'method' => 'card_intl',
            'external_id' => (string) $r['data']['id'], 'status' => 'AUTHORIZED',
        ]);
        return 'authorized';
    }
    return gcv_auth_request_customer_action($rec, 'stripe_auth_failed');
}

/**
 * Checkout Session para o cliente reservar/confirmar o cartão (fluxo inicial ou link).
 * $mode: 'payment' (reserva já, captura manual) | 'setup' (só salva o cartão).
 *
 * @return array{ok:bool, url?:string, id?:string, error?:string}
 */
function gcv_stripe_auth_session(array $rec, string $mode, string $origin, string $cancelPath, array $lineItems = []): array
{
    $rid = (string) $rec['reservation_id'];
    $loc = (string) ($rec['locale'] ?? 'pt');
    $customer = (string) ($rec['card_saved']['customer_id'] ?? '');
    if ($customer === '') {
        $customer = (string) gcv_stripe_create_customer((string) $rec['email'], (string) ($rec['name'] ?? ''), $rid);
    }
    $fields = [
        'mode' => $mode,
        'payment_method_types' => ['card'],
        'client_reference_id' => $rid,
        'locale' => $loc === 'pt' ? 'pt-BR' : $loc,
        'success_url' => $origin . '/api/stripe_return.php?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $origin . $cancelPath,
        'expires_at' => time() + 23 * 3600,
        'metadata' => ['reservation_id' => $rid, 'locale' => $loc, 'auth_flow' => $mode],
        // 3D Secure sempre que o cartão suportar: fraude com 3DS aprovado é responsabilidade do banco.
        'payment_method_options' => ['card' => ['request_three_d_secure' => 'any']],
    ];
    if ($customer !== '') {
        $fields['customer'] = $customer;
    } else {
        $fields['customer_email'] = (string) $rec['email'];
    }
    if ($mode === 'payment') {
        $fields['line_items'] = $lineItems;
        $fields['payment_intent_data'] = [
            'capture_method' => 'manual',
            'setup_future_usage' => 'off_session',
            'statement_descriptor_suffix' => 'CHAPADA',
            'metadata' => ['reservation_id' => $rid],
        ];
    } else {
        $fields['setup_intent_data'] = ['metadata' => ['reservation_id' => $rid]];
    }
    $s = gcv_stripe_request('POST', '/v1/checkout/sessions', $fields);
    if (empty($s['ok']) || empty($s['data']['url'])) {
        return ['ok' => false, 'error' => (string) ($s['error'] ?? 'stripe_error')];
    }
    return ['ok' => true, 'url' => (string) $s['data']['url'], 'id' => (string) $s['data']['id'], 'customer' => $customer];
}
