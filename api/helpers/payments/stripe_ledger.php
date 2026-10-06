<?php

declare(strict_types=1);

/**
 * Stripe (cartão internacional, em USD) → registro de transações e repasses ao Sicoob.
 * Taxa e líquido vêm do balance_transaction (já em BRL, com a conversão real da Stripe).
 * Repasse automático: Stripe → conta Sicoob (painel Stripe → Configurações → Repasses: diário).
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../stripe_api.php';
require_once __DIR__ . '/../pix_reservation_store.php';
require_once __DIR__ . '/ledger.php';
require_once __DIR__ . '/checkout_common.php';

/** Verifica Stripe-Signature (t=…,v1=…) com STRIPE_WEBHOOK_SECRET (whsec_…). */
function gcv_stripe_valid_signature(string $payload, string $header, int $tolerance = 300): bool
{
    $secret = trim((string) ($_ENV['STRIPE_WEBHOOK_SECRET'] ?? getenv('STRIPE_WEBHOOK_SECRET') ?: ''));
    if ($secret === '') {
        return false;
    }
    $t = '';
    $sigs = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 't') {
            $t = $v;
        } elseif ($k === 'v1') {
            $sigs[] = $v;
        }
    }
    if ($t === '' || !ctype_digit($t) || !$sigs || abs(time() - (int) $t) > $tolerance) {
        return false;
    }
    $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
    foreach ($sigs as $s) {
        if (hash_equals($expected, $s)) {
            return true;
        }
    }
    return false;
}

/**
 * Busca o PaymentIntent com cobrança e balance_transaction.
 *
 * @return array<string,mixed>|null
 */
function gcv_stripe_get_intent(string $pi): ?array
{
    if (!preg_match('/^pi_[A-Za-z0-9]+$/', $pi)) {
        return null;
    }
    $r = gcv_stripe_request('GET', '/v1/payment_intents/' . rawurlencode($pi)
        . '?expand%5B%5D=latest_charge.balance_transaction');
    return !empty($r['ok']) ? $r['data'] : null;
}

/**
 * Grava/atualiza a transação a partir do PaymentIntent (taxas reais).
 *
 * @param array<string,mixed> $rec reserva
 */
function gcv_stripe_ledger_from_intent(array $rec, string $paymentIntent, string $sessionId = ''): void
{
    $rid = (string) ($rec['reservation_id'] ?? '');
    if ($rid === '') {
        return;
    }
    $intent = $paymentIntent !== '' ? gcv_stripe_get_intent($paymentIntent) : null;
    $charge = is_array($intent['latest_charge'] ?? null) ? $intent['latest_charge'] : [];
    $bt = is_array($charge['balance_transaction'] ?? null) ? $charge['balance_transaction'] : [];

    $currency = strtoupper((string) ($intent['currency'] ?? $rec['charged_currency'] ?? 'USD'));
    $chargeMinor = (int) ($intent['amount_received'] ?? $intent['amount'] ?? $rec['charged_minor'] ?? 0);
    $gross = (int) ($bt['amount'] ?? 0);   // em BRL (moeda da conta)
    $fee = isset($bt['fee']) ? (int) $bt['fee'] : null;
    $net = isset($bt['net']) ? (int) $bt['net'] : null;
    if ($gross <= 0) {
        // Sem balance_transaction ainda: estimativa pelo valor em BRL da cotação.
        $gross = (int) ($rec['charged_brl_cents'] ?? 0);
    }
    $refunded = (int) ($charge['amount_refunded'] ?? 0);
    $status = 'PAID';
    if (!empty($charge['disputed'])) {
        $status = 'CHARGEBACK';
    } elseif ($refunded > 0) {
        $status = $refunded >= $chargeMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    }
    // reembolso vem na moeda cobrada; converte proporcionalmente para BRL
    $refundedBrl = $refunded > 0 && $chargeMinor > 0 ? (int) round($gross * $refunded / $chargeMinor) : 0;

    gcv_ledger_upsert([
        'reservation_id' => $rid,
        'gateway' => 'stripe',
        'method' => 'card_intl',
        'external_id' => $paymentIntent ?: null,
        'checkout_ref' => $sessionId ?: null,
        'status' => $status,
        'installments' => 1,
        'currency' => $currency,
        'charge_minor' => $chargeMinor,
        'fx_rate' => isset($bt['exchange_rate']) ? (float) $bt['exchange_rate'] : ($rec['fx_rate'] ?? null),
        'base_cents' => (int) ($rec['amount_cents'] ?? 0),
        'surcharge_cents' => max(0, $gross - (int) ($rec['amount_cents'] ?? 0)),
        'gross_cents' => $gross,
        'fee_cents' => $fee,
        'net_cents' => $net,
        'fee_source' => $fee !== null ? 'gateway' : 'estimate',
        'fee_detail' => [
            'fee_details' => $bt['fee_details'] ?? null,
            'card_country' => $charge['payment_method_details']['card']['country'] ?? null,
            'card_brand' => $charge['payment_method_details']['card']['brand'] ?? null,
            'card_last4' => $charge['payment_method_details']['card']['last4'] ?? null,
            'charge_id' => $charge['id'] ?? null,
            'balance_transaction' => $bt['id'] ?? null,
        ],
        'refunded_cents' => $refundedBrl,
        'price_review' => !empty($rec['price_review']) ? 1 : 0,
        'paid_at' => gcv_ledger_dt($charge['created'] ?? $intent['created'] ?? null),
        'available_at' => gcv_ledger_dt($bt['available_on'] ?? null),
    ]);
    gcv_ledger_link_sale($rid);
    if (in_array($status, ['REFUNDED', 'CHARGEBACK'], true)) {
        gcv_ledger_flag_sale_dispute($rid, $status);
    }
}

/**
 * Checkout Session concluída → reserva no cartão (captura manual), cartão salvo (setup)
 * ou pagamento já capturado (fluxo antigo). Confere valor e moeda.
 *
 * @param array<string,mixed> $session
 * @return array{ok:bool, reservation_id?:string, locale?:string, reason?:string, state?:string}
 */
function gcv_stripe_apply_session(array $session): array
{
    require_once __DIR__ . '/authorization.php';
    $meta = is_array($session['metadata'] ?? null) ? $session['metadata'] : [];
    $rid = gcv_pix_safe_id((string) ($meta['reservation_id'] ?? $session['client_reference_id'] ?? ''));
    $locale = in_array($meta['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $meta['locale'] : 'pt';
    $rec = preg_match('/^GCV-[A-Z0-9]{6}$/', $rid) ? gcv_pix_read_reservation($rid) : null;
    $base = ['reservation_id' => $rid, 'locale' => $locale];
    if (!$rec || ($session['status'] ?? '') !== 'complete') {
        return ['ok' => false, 'reason' => 'not_complete'] + $base;
    }
    $customer = is_string($session['customer'] ?? null) ? (string) $session['customer'] : '';
    $mode = (string) ($session['mode'] ?? 'payment');

    // a) Só salvar o cartão (passeio longe)
    if ($mode === 'setup') {
        $si = (string) ($session['setup_intent'] ?? '');
        $r = $si !== '' ? gcv_stripe_request('GET', '/v1/setup_intents/' . rawurlencode($si)) : ['ok' => false];
        $pm = (string) ($r['data']['payment_method'] ?? '');
        if (empty($r['ok']) || ($r['data']['status'] ?? '') !== 'succeeded' || $pm === '') {
            return ['ok' => false, 'reason' => 'setup_failed'] + $base;
        }
        gcv_auth_mark_reserved($rid, 'CARD_SAVED', [
            'gateway' => 'stripe',
            'saved' => ['customer_id' => $customer, 'payment_method_id' => $pm],
        ]);
        gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => 'stripe', 'method' => 'card_intl', 'status' => 'CARD_SAVED', 'checkout_ref' => (string) ($session['id'] ?? '')]);
        return ['ok' => true, 'state' => 'CARD_SAVED'] + $base;
    }

    // Valor esperado na moeda cobrada (reservas antigas: BRL em amount_cents).
    $expected = (int) ($rec['charged_minor'] ?? $rec['amount_cents'] ?? round(((float) ($rec['amount'] ?? 0)) * 100));
    $paid = (int) ($session['amount_total'] ?? 0);
    $curExpected = strtolower((string) ($rec['charged_currency'] ?? 'brl'));
    if ($expected < 50 || $paid !== $expected || strtolower((string) ($session['currency'] ?? $curExpected)) !== $curExpected) {
        error_log('stripe amount/currency mismatch ' . $rid);
        return ['ok' => false, 'reason' => 'amount_mismatch'] + $base;
    }
    $pi = (string) ($session['payment_intent'] ?? '');
    $intent = $pi !== '' ? gcv_stripe_request('GET', '/v1/payment_intents/' . rawurlencode($pi)) : ['ok' => false];
    $piStatus = (string) ($intent['data']['status'] ?? '');

    // b) Reserva no cartão (captura manual)
    if ($piStatus === 'requires_capture') {
        $pm = is_string($intent['data']['payment_method'] ?? null) ? (string) $intent['data']['payment_method'] : '';
        gcv_auth_mark_reserved($rid, 'AUTHORIZED', [
            'gateway' => 'stripe',
            'auth_id' => $pi,
            'amount_minor' => (int) ($intent['data']['amount_capturable'] ?? $paid),
            'currency' => (string) ($intent['data']['currency'] ?? $curExpected),
            'saved' => array_filter(['customer_id' => $customer, 'payment_method_id' => $pm]),
        ]);
        gcv_ledger_upsert([
            'reservation_id' => $rid, 'gateway' => 'stripe', 'method' => 'card_intl', 'external_id' => $pi,
            'checkout_ref' => (string) ($session['id'] ?? ''), 'status' => 'AUTHORIZED',
        ]);
        // Já pode estar confirmado (passeio com quórum e guia ok).
        gcv_auth_process_reservation($rid);
        return ['ok' => true, 'state' => 'AUTHORIZED'] + $base;
    }

    // c) Capturado direto (sessões antigas, antes da pré-autorização)
    if (($session['payment_status'] ?? '') !== 'paid') {
        return ['ok' => false, 'reason' => 'not_paid'] + $base;
    }
    $wasPaid = gcv_pix_effective_status($rec) === 'PAID';
    $marked = gcv_pix_mark_paid($rid, 'stripe');
    if (!$marked) {
        $again = gcv_pix_read_reservation($rid);
        if (!$again || gcv_pix_effective_status($again) !== 'PAID') {
            return ['ok' => false, 'reason' => 'mark_failed'] + $base;
        }
        $marked = $again;
    }
    if ($pi !== '' && empty($marked['stripe_payment_intent'])) {
        $marked['stripe_payment_intent'] = $pi;
        $marked['stripe_session_id'] = (string) ($session['id'] ?? '');
        gcv_pix_write_reservation($marked);
    }
    try {
        gcv_stripe_ledger_from_intent($marked, $pi, (string) ($session['id'] ?? ''));
    } catch (Throwable $e) {
        error_log('stripe ledger: ' . $e->getMessage());
    }
    if (!$wasPaid) {
        try {
            require_once __DIR__ . '/../purchase_notify.php';
            gcv_notify_admin_purchase($marked);
        } catch (Throwable $e) {
            error_log('stripe notify: ' . $e->getMessage());
        }
    }
    return ['ok' => true, 'state' => 'PAID'] + $base;
}

/**
 * Repasse Stripe → Sicoob. payout.created/updated → a caminho; payout.paid → chegou.
 * Liga cada cobrança do repasse à transação correspondente.
 *
 * @param array<string,mixed> $payout objeto payout da Stripe
 */
function gcv_stripe_apply_payout(array $payout): void
{
    $id = (string) ($payout['id'] ?? '');
    if (!preg_match('/^po_[A-Za-z0-9]+$/', $id)) {
        return;
    }
    $st = (string) ($payout['status'] ?? 'pending');
    $status = match ($st) {
        'paid' => 'PAID',
        'failed' => 'FAILED',
        'canceled' => 'CANCELLED',
        'in_transit' => 'IN_TRANSIT',
        default => 'PENDING',
    };
    $arrival = isset($payout['arrival_date']) ? gmdate('Y-m-d', (int) $payout['arrival_date']) : null;
    $settlementId = gcv_ledger_upsert_settlement([
        'gateway' => 'stripe',
        'external_id' => $id,
        'amount_cents' => (int) ($payout['amount'] ?? 0),
        'status' => $status,
        'expected_at' => $arrival,
        'arrived_at' => $status === 'PAID' ? gcv_ledger_dt((int) ($payout['arrival_date'] ?? time())) : null,
        'sicoob_confirmed' => $status === 'PAID' ? 1 : 0,
        'raw_json' => ['status' => $st, 'method' => $payout['method'] ?? null, 'destination' => $payout['destination'] ?? null],
    ]);
    if (!$settlementId || in_array($status, ['FAILED', 'CANCELLED'], true)) {
        return;
    }

    // Cobranças incluídas neste repasse
    $ids = [];
    $after = '';
    for ($page = 0; $page < 20; $page++) {
        $q = '/v1/balance_transactions?payout=' . rawurlencode($id) . '&type=charge&limit=100&expand%5B%5D=data.source';
        if ($after !== '') {
            $q .= '&starting_after=' . rawurlencode($after);
        }
        $r = gcv_stripe_request('GET', $q);
        if (empty($r['ok'])) {
            break;
        }
        $rows = is_array($r['data']['data'] ?? null) ? $r['data']['data'] : [];
        foreach ($rows as $bt) {
            $pi = (string) ($bt['source']['payment_intent'] ?? '');
            if ($pi !== '') {
                $row = gcv_ledger_find_external('stripe', $pi);
                if ($row) {
                    $ids[] = (int) $row['id'];
                }
            }
            $after = (string) ($bt['id'] ?? '');
        }
        if (empty($r['data']['has_more'])) {
            break;
        }
    }
    gcv_ledger_attach_settlement(
        $ids,
        $settlementId,
        $status === 'PAID' ? 'IN_SICOOB' : 'IN_TRANSIT',
        $status === 'PAID' ? gcv_ledger_dt((int) ($payout['arrival_date'] ?? time())) : null
    );
}
