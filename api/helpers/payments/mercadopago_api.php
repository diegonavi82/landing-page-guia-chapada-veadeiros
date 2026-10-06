<?php

declare(strict_types=1);

/**
 * Mercado Pago — Checkout Transparente (Card Payment Brick + API de pagamentos), cartão nacional até 4x,
 * com pré-autorização (capture=false, vale 5 dias) e cartão salvo para passeios distantes.
 * Credenciais em api/.env: MP_ACCESS_TOKEN (APP_USR-… produção, TEST-… teste),
 * MP_WEBHOOK_SECRET (assinatura dos webhooks, painel → Webhooks).
 *
 * "Sem juros" é configuração da conta (Seu negócio → Custos → parcelamento sem acréscimo);
 * aqui limitamos o máximo de parcelas.
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/ledger.php';

function gcv_mp_token(): string
{
    $v = $_ENV['MP_ACCESS_TOKEN'] ?? getenv('MP_ACCESS_TOKEN');
    return is_string($v) ? trim($v) : '';
}

function gcv_mp_is_test(): bool
{
    return str_starts_with(gcv_mp_token(), 'TEST-');
}

/**
 * @param array<string,mixed>|null $body
 * @return array{ok:bool, data?:array<string,mixed>, error?:string, http?:int}
 */
function gcv_mp_request(string $method, string $path, ?array $body = null, string $idempotencyKey = ''): array
{
    $token = gcv_mp_token();
    if ($token === '') {
        return ['ok' => false, 'error' => 'mp_not_configured'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => 'curl_missing'];
    }
    $ch = curl_init('https://api.mercadopago.com' . $path);
    $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_TIMEOUT => 20,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $headers[] = 'Content-Type: application/json';
    }
    if ($idempotencyKey !== '') {
        $headers[] = 'X-Idempotency-Key: ' . $idempotencyKey;
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode(is_string($raw) ? $raw : '', true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'mp_bad_response', 'http' => $http];
    }
    if ($http >= 400) {
        $msg = (string) ($data['message'] ?? $data['error'] ?? 'mp_error');
        error_log('mercadopago ' . $method . ' ' . $path . ' http=' . $http . ' ' . $msg);
        return ['ok' => false, 'error' => $msg, 'http' => $http];
    }
    return ['ok' => true, 'data' => $data, 'http' => $http];
}

/** @return array<string,mixed>|null */
function gcv_mp_get_payment(string $paymentId): ?array
{
    if (!preg_match('/^\d{3,20}$/', $paymentId)) {
        return null;
    }
    $r = gcv_mp_request('GET', '/v1/payments/' . $paymentId);
    return !empty($r['ok']) ? $r['data'] : null;
}

/**
 * Valida a assinatura x-signature do webhook (HMAC-SHA256).
 * Manifesto: id:{data.id};request-id:{x-request-id};ts:{ts};
 */
function gcv_mp_valid_signature(string $dataId): bool
{
    $secret = trim((string) ($_ENV['MP_WEBHOOK_SECRET'] ?? getenv('MP_WEBHOOK_SECRET') ?: ''));
    if ($secret === '') {
        // Sem segredo configurado: o webhook ainda confere o pagamento direto na API do MP,
        // então ninguém consegue marcar como pago um pagamento que não existe.
        return true;
    }
    $sig = (string) ($_SERVER['HTTP_X_SIGNATURE'] ?? '');
    $reqId = (string) ($_SERVER['HTTP_X_REQUEST_ID'] ?? '');
    $ts = '';
    $v1 = '';
    foreach (explode(',', $sig) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 'ts') {
            $ts = $v;
        } elseif ($k === 'v1') {
            $v1 = $v;
        }
    }
    if ($ts === '' || $v1 === '') {
        return false;
    }
    $id = ctype_alnum($dataId) ? strtolower($dataId) : $dataId;
    $manifest = 'id:' . $id . ';';
    if ($reqId !== '') {
        $manifest .= 'request-id:' . $reqId . ';';
    }
    $manifest .= 'ts:' . $ts . ';';
    return hash_equals(hash_hmac('sha256', $manifest, $secret), $v1);
}

/**
 * Aplica um pagamento do MP: confere valor/reserva, marca como pago, grava taxas
 * reais no registro de transações. Idempotente (retorno + webhook podem chegar juntos).
 *
 * @param array<string,mixed> $payment  resposta de GET /v1/payments/{id}
 * @return array{ok:bool, status:string, reservation_id?:string, locale?:string, reason?:string}
 */
function gcv_mp_apply_payment(array $payment): array
{
    require_once __DIR__ . '/../pix_reservation_store.php';

    $rid = gcv_pix_safe_id((string) ($payment['external_reference'] ?? ''));
    if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $rid)) {
        return ['ok' => false, 'status' => 'unknown', 'reason' => 'no_reference'];
    }
    $rec = gcv_pix_read_reservation($rid);
    if (!$rec) {
        return ['ok' => false, 'status' => 'unknown', 'reason' => 'no_reservation', 'reservation_id' => $rid];
    }
    $locale = in_array($rec['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $rec['locale'] : 'pt';
    $status = (string) ($payment['status'] ?? '');
    $paymentId = (string) ($payment['id'] ?? '');

    $amountCents = (int) round(((float) ($payment['transaction_amount'] ?? 0)) * 100);
    $expected = (int) ($rec['charged_minor'] ?? 0);
    $installments = max(1, (int) ($payment['installments'] ?? 1));
    $netCents = (int) round(((float) ($payment['transaction_details']['net_received_amount'] ?? 0)) * 100);
    $refundedCents = (int) round(((float) ($payment['transaction_amount_refunded'] ?? 0)) * 100);

    $feeCents = null;
    $feeDetail = is_array($payment['fee_details'] ?? null) ? $payment['fee_details'] : [];
    if ($netCents > 0) {
        $feeCents = max(0, $amountCents - $netCents);
    } elseif ($feeDetail) {
        $feeCents = 0;
        foreach ($feeDetail as $f) {
            if (($f['fee_payer'] ?? 'collector') === 'collector') {
                $feeCents += (int) round(((float) ($f['amount'] ?? 0)) * 100);
            }
        }
        $netCents = $amountCents - $feeCents;
    }

    $ledgerStatus = match ($status) {
        'approved' => 'PAID',
        'authorized' => 'AUTHORIZED',
        'refunded' => 'REFUNDED',
        'charged_back' => 'CHARGEBACK',
        'rejected' => 'FAILED',
        'cancelled' => 'CANCELLED',
        default => 'PENDING',
    };
    if ($ledgerStatus === 'PAID' && $refundedCents > 0) {
        $ledgerStatus = $refundedCents >= $amountCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    }

    $priceReview = !empty($rec['price_review']);
    if ($ledgerStatus === 'PAID' && $expected > 0 && $amountCents !== $expected) {
        error_log('mp amount mismatch ' . $rid . ' paid=' . $amountCents . ' expected=' . $expected);
        $priceReview = true;
    }
    $releaseAt = gcv_ledger_dt($payment['money_release_date'] ?? null);
    $paidAt = gcv_ledger_dt($payment['date_approved'] ?? null);
    $nowSp = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d H:i:s');

    gcv_ledger_upsert([
        'reservation_id' => $rid,
        'gateway' => 'mercadopago',
        'method' => 'card_br',
        'external_id' => $paymentId,
        'status' => $ledgerStatus,
        'installments' => $installments,
        'currency' => 'BRL',
        'charge_minor' => $amountCents,
        'base_cents' => (int) ($rec['amount_cents'] ?? 0),
        'surcharge_cents' => max(0, $amountCents - (int) ($rec['amount_cents'] ?? 0)),
        'gross_cents' => $amountCents,
        'fee_cents' => $feeCents,
        'net_cents' => $netCents ?: null,
        'fee_source' => $feeCents !== null ? 'gateway' : 'estimate',
        'fee_detail' => [
            'fee_details' => $feeDetail,
            'payment_method_id' => $payment['payment_method_id'] ?? null,
            'payment_type_id' => $payment['payment_type_id'] ?? null,
            'card_last4' => $payment['card']['last_four_digits'] ?? null,
            'total_paid_amount' => $payment['transaction_details']['total_paid_amount'] ?? null,
            'status_detail' => $payment['status_detail'] ?? null,
        ],
        'refunded_cents' => $refundedCents,
        'price_review' => $priceReview ? 1 : 0,
        'paid_at' => $paidAt,
        'available_at' => $releaseAt,
        // Liberado na hora → já disponível no MP para transferir ao Sicoob.
        'settlement_status' => ($ledgerStatus === 'PAID' && $releaseAt !== null && $releaseAt <= $nowSp) ? 'AVAILABLE' : null,
    ]);

    if ($ledgerStatus === 'AUTHORIZED') {
        // Só reservado no cartão: quem marca a reserva é o fluxo de pré-autorização.
        return ['ok' => true, 'status' => 'AUTHORIZED', 'reservation_id' => $rid, 'locale' => $locale];
    }
    if ($ledgerStatus !== 'PAID') {
        if (in_array($ledgerStatus, ['REFUNDED', 'CHARGEBACK'], true)) {
            gcv_ledger_flag_sale_dispute($rid, $ledgerStatus);
        }
        return ['ok' => true, 'status' => $ledgerStatus, 'reservation_id' => $rid, 'locale' => $locale];
    }

    $wasPaid = gcv_pix_effective_status($rec) === 'PAID';
    $installLabel = gcv_checkout_installments_label((string) ($rec['charged_currency'] ?? 'BRL'), $amountCents, $installments);
    $marked = gcv_pix_mark_paid($rid, 'mercadopago');
    if ($marked) {
        $marked['mp_payment_id'] = $paymentId;
        $marked['installments'] = $installments;
        $marked['charged_label'] = $installLabel;
        gcv_pix_write_reservation($marked);
        gcv_ledger_link_sale($rid);
        if (!$wasPaid) {
            try {
                require_once __DIR__ . '/../purchase_notify.php';
                gcv_notify_admin_purchase($marked);
            } catch (Throwable $e) {
                error_log('mp notify: ' . $e->getMessage());
            }
        }
    }
    return ['ok' => true, 'status' => 'PAID', 'reservation_id' => $rid, 'locale' => $locale];
}

function gcv_checkout_installments_label(string $currency, int $minor, int $installments): string
{
    require_once __DIR__ . '/checkout_common.php';
    return gcv_checkout_charged_label($currency, $minor, $installments);
}

/** Captura (cobra) uma reserva no cartão; valor menor = captura parcial. */
function gcv_mp_capture(string $paymentId, int $amountMinor): bool
{
    $r = gcv_mp_request('PUT', '/v1/payments/' . rawurlencode($paymentId), [
        'capture' => true,
        'transaction_amount' => round($amountMinor / 100, 2),
    ], 'cap-' . $paymentId);
    if (!empty($r['ok']) && in_array((string) ($r['data']['status'] ?? ''), ['approved'], true)) {
        return true;
    }
    $p = gcv_mp_get_payment($paymentId);
    return $p !== null && ($p['status'] ?? '') === 'approved';
}

/** Cancela a reserva no cartão (nada é cobrado). */
function gcv_mp_cancel(string $paymentId): bool
{
    $r = gcv_mp_request('PUT', '/v1/payments/' . rawurlencode($paymentId), ['status' => 'cancelled'], 'can-' . $paymentId);
    if (!empty($r['ok'])) {
        return true;
    }
    $p = gcv_mp_get_payment($paymentId);
    return $p !== null && in_array((string) ($p['status'] ?? ''), ['cancelled', 'rejected'], true);
}

/** Cliente MP pelo e-mail (cria se não existir). */
function gcv_mp_customer_id(string $email, string $name): ?string
{
    $r = gcv_mp_request('GET', '/v1/customers/search?email=' . rawurlencode($email));
    $found = $r['data']['results'][0]['id'] ?? null;
    if (is_string($found) && $found !== '') {
        return $found;
    }
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $c = gcv_mp_request('POST', '/v1/customers', array_filter([
        'email' => $email,
        'first_name' => $parts[0] ?? null,
        'last_name' => count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : null,
    ]));
    return !empty($c['ok']) ? (string) ($c['data']['id'] ?? '') : null;
}

/** Mensagem amigável para recusa do cartão. */
function gcv_mp_decline_message(string $detail, string $locale): string
{
    $map = [
        'cc_rejected_insufficient_amount' => ['Limite insuficiente no cartão.', 'Insufficient card limit.', 'Límite insuficiente en la tarjeta.'],
        'cc_rejected_bad_filled_security_code' => ['Código de segurança (CVV) inválido.', 'Invalid security code (CVV).', 'Código de seguridad (CVV) inválido.'],
        'cc_rejected_bad_filled_date' => ['Data de validade inválida.', 'Invalid expiration date.', 'Fecha de vencimiento inválida.'],
        'cc_rejected_bad_filled_card_number' => ['Número do cartão inválido.', 'Invalid card number.', 'Número de tarjeta inválido.'],
        'cc_rejected_call_for_authorize' => ['O banco pediu autorização: ligue para o seu banco e tente de novo.', 'Your bank requires authorization: call your bank and try again.', 'El banco pidió autorización: llama a tu banco e inténtalo de nuevo.'],
        'cc_rejected_high_risk' => ['Pagamento recusado por segurança. Tente outro cartão ou o Pix.', 'Payment declined for security reasons. Try another card or Pix.', 'Pago rechazado por seguridad. Prueba otra tarjeta o Pix.'],
    ];
    $i = $locale === 'en' ? 1 : ($locale === 'es' ? 2 : 0);
    $default = ['Cartão recusado. Confira os dados ou tente outro cartão.', 'Card declined. Check the details or try another card.', 'Tarjeta rechazada. Revisa los datos o prueba otra tarjeta.'];
    return ($map[$detail] ?? $default)[$i];
}

/**
 * Cria a reserva no cartão (capture=false).
 *
 * @param array<string,mixed> $card dados do Brick (token, payment_method_id, issuer_id, installments, payer)
 * @return array{ok:bool, payment?:array<string,mixed>, error?:string}
 */
function gcv_mp_authorize(array $rec, array $card, ?string $customerId = null): array
{
    $rid = (string) $rec['reservation_id'];
    $payer = ['email' => (string) ($rec['email'] ?? '')];
    $ident = is_array($card['payer']['identification'] ?? null) ? $card['payer']['identification'] : null;
    if ($ident && !empty($ident['number'])) {
        $payer['identification'] = [
            'type' => (string) ($ident['type'] ?? 'CPF'),
            'number' => preg_replace('/\D+/', '', (string) $ident['number']),
        ];
    }
    if ($customerId) {
        $payer = ['type' => 'customer', 'id' => $customerId] + $payer;
    }
    $origin = rtrim((string) ($_ENV['APP_URL'] ?? getenv('APP_URL') ?: ''), '/');
    $body = [
        'transaction_amount' => round(((int) $rec['charged_minor']) / 100, 2),
        'token' => (string) ($card['token'] ?? ''),
        'description' => 'Guia Chapada Veadeiros ' . $rid,
        'installments' => max(1, (int) ($card['installments'] ?? 1)),
        'payment_method_id' => (string) ($card['payment_method_id'] ?? ''),
        'payer' => $payer,
        'capture' => false,
        'binary_mode' => true,
        'external_reference' => $rid,
        'statement_descriptor' => 'GUIACHAPADA',
        'metadata' => ['reservation_id' => $rid],
        'additional_info' => ['items' => [[
            'id' => $rid, 'title' => 'Passeio Guia Chapada Veadeiros', 'quantity' => 1,
            'unit_price' => round(((int) $rec['charged_minor']) / 100, 2), 'category_id' => 'travels',
        ]]],
    ];
    if (!empty($card['issuer_id'])) {
        $body['issuer_id'] = (string) $card['issuer_id'];
    }
    if ($origin !== '' && !preg_match('#^https?://(localhost|127\.)#', $origin)) {
        $body['notification_url'] = $origin . '/api/mp_webhook.php?source_news=webhooks';
    }
    $r = gcv_mp_request('POST', '/v1/payments', $body, 'auth-' . $rid . '-' . substr(hash('sha256', (string) ($card['token'] ?? '')), 0, 12));
    if (empty($r['ok'])) {
        return ['ok' => false, 'error' => (string) ($r['error'] ?? 'mp_error')];
    }
    return ['ok' => true, 'payment' => $r['data']];
}
