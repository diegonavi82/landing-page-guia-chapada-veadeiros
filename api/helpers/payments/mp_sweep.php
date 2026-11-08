<?php

declare(strict_types=1);

/**
 * Cartão nacional liberado no Mercado Pago → Pix de tudo isso para o Sicoob.
 *
 * O repasse ao guia continua no Sicoob (payout_service), no dia do passeio.
 * Aqui só sai o líquido das vendas já liberadas. O que não é do guia fica no Sicoob.
 *
 * Produção exige o produto Payouts do Mercado Pago e a chave privada Ed25519
 * (MP_PAYOUT_PRIVATE_KEY). A chave pública correspondente fica cadastrada no Mercado Pago.
 */

require_once __DIR__ . '/mercadopago_api.php';
require_once __DIR__ . '/ledger.php';

function gcv_mp_sweep_env(string $key): string
{
    $v = $_ENV[$key] ?? getenv($key);
    return is_string($v) ? trim($v) : '';
}

/** @return array{type:string,chave:string}|null */
function gcv_mp_sweep_destination(): ?array
{
    $type = strtoupper(gcv_mp_sweep_env('MP_PAYOUT_PIX_TYPE'));
    $key = gcv_mp_sweep_env('MP_PAYOUT_PIX_KEY');
    if ($key === '') {
        require_once __DIR__ . '/../sicoob_api.php';
        $key = (string) (gcv_sicoob_api_cfg()['pix_key'] ?? '');
        if ($type === '') {
            $type = 'CNPJ';
        }
    }
    if ($type === '') {
        $type = 'CNPJ';
    }
    if (!in_array($type, ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'PIX_CODE'], true) || $key === '') {
        return null;
    }
    $digits = preg_replace('/\D+/', '', $key) ?? '';
    if ($type === 'CNPJ' && strlen($digits) === 14) {
        $key = substr($digits, 0, 2) . '.' . substr($digits, 2, 3) . '.' . substr($digits, 5, 3)
            . '/' . substr($digits, 8, 4) . '-' . substr($digits, 12, 2);
    } elseif ($type === 'CPF' && strlen($digits) === 11) {
        $key = substr($digits, 0, 3) . '.' . substr($digits, 3, 3) . '.' . substr($digits, 6, 3)
            . '-' . substr($digits, 9, 2);
    }
    return ['type' => $type, 'chave' => $key];
}

function gcv_mp_sweep_private_key(): string
{
    $raw = gcv_mp_sweep_env('MP_PAYOUT_PRIVATE_KEY');
    if ($raw === '') {
        $path = gcv_mp_sweep_env('MP_PAYOUT_PRIVATE_KEY_FILE');
        if ($path !== '' && is_readable($path)) {
            $raw = trim((string) file_get_contents($path));
        }
    }
    return str_replace('\\n', "\n", $raw);
}

/** @return array{ready:bool,reason:string} */
function gcv_mp_sweep_readiness(): array
{
    if (gcv_mp_token() === '') {
        return ['ready' => false, 'reason' => 'Mercado Pago sem access token.'];
    }
    if (gcv_mp_sweep_destination() === null) {
        return ['ready' => false, 'reason' => 'Chave Pix do Sicoob não configurada.'];
    }
    if (!gcv_mp_is_test() && gcv_mp_sweep_private_key() === '') {
        return ['ready' => false, 'reason' => 'Falta a chave privada do Payouts (MP_PAYOUT_PRIVATE_KEY) para assinar o Pix ao Sicoob.'];
    }
    return ['ready' => true, 'reason' => ''];
}

function gcv_mp_sweep_sign(string $body): ?string
{
    $pem = gcv_mp_sweep_private_key();
    if ($pem === '' || !function_exists('openssl_pkey_get_private') || !function_exists('openssl_sign')) {
        return null;
    }
    $key = openssl_pkey_get_private($pem);
    if ($key === false) {
        return null;
    }
    $sig = '';
    if (!openssl_sign($body, $sig, $key)) {
        return null;
    }
    return base64_encode($sig);
}

function gcv_mp_sweep_alert_once(string $code, string $html): void
{
    $file = dirname(__DIR__, 2) . '/storage/mp_sweep_alert.json';
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $state = is_readable($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    if (($state['day'] ?? '') === $today && ($state['code'] ?? '') === $code) {
        return;
    }
    gcv_ledger_alert_admin('Mercado Pago → Sicoob', $html);
    @file_put_contents($file, json_encode(['day' => $today, 'code' => $code]));
}

function gcv_mp_available_balance_cents(): ?int
{
    $me = gcv_mp_request('GET', '/users/me');
    $userId = (int) ($me['data']['id'] ?? 0);
    if (empty($me['ok']) || $userId <= 0) {
        return null;
    }
    $bal = gcv_mp_request('GET', '/users/' . $userId . '/mercadopago_account/balance');
    if (empty($bal['ok'])) {
        return null;
    }
    $amount = $bal['data']['available_balance'] ?? null;
    if (is_array($amount)) {
        $amount = $amount['amount'] ?? $amount['value'] ?? null;
    }
    if (!is_numeric($amount)) {
        return null;
    }
    return (int) round(((float) $amount) * 100);
}

/**
 * Confere um Pix já enviado. Se o Mercado Pago recusou, as vendas voltam a "disponível".
 */
function gcv_mp_sweep_refresh_transit(): void
{
    gcv_ledger_ensure_schema();
    $rows = db()->query(
        "SELECT id, external_id FROM gcv_gateway_settlements
         WHERE gateway = 'mercadopago' AND status = 'IN_TRANSIT'
         ORDER BY id ASC LIMIT 5"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    foreach ($rows as $row) {
        $ext = (string) ($row['external_id'] ?? '');
        if ($ext === '' || str_starts_with($ext, 'gcv-mp-')) {
            continue;
        }
        $res = gcv_mp_request('GET', '/v1/payouts/' . rawurlencode($ext));
        if (empty($res['ok'])) {
            continue;
        }
        $data = $res['data'];
        $status = strtolower((string) ($data['status'] ?? ''));
        $errorItems = (int) ($data['summary']['error']['items'] ?? 0);
        $successItems = (int) ($data['summary']['success']['items'] ?? 0);
        $pendingItems = (int) ($data['summary']['pending']['items'] ?? 0);
        $failed = in_array($status, ['failed', 'canceled', 'cancelled', 'rejected'], true)
            || ($status === 'completed' && $successItems === 0 && $errorItems > 0 && $pendingItems === 0);
        if (!$failed) {
            continue;
        }
        $sid = (int) $row['id'];
        db()->prepare("UPDATE gcv_gateway_settlements SET status = 'FAILED', notes = ? WHERE id = ?")
            ->execute(['Mercado Pago recusou o Pix ao Sicoob', $sid]);
        db()->prepare(
            "UPDATE gcv_payment_transactions
             SET settlement_status = 'AVAILABLE', settlement_id = NULL
             WHERE settlement_id = ? AND settlement_status = 'IN_TRANSIT'"
        )->execute([$sid]);
        gcv_mp_sweep_alert_once('payout_failed_' . $ext, '<p>O Mercado Pago recusou o Pix para o Sicoob (' . htmlspecialchars($ext, ENT_QUOTES, 'UTF-8') . '). As vendas voltaram para a fila e a próxima rodada tenta de novo.</p>');
    }
}

/**
 * Manda para o Sicoob o líquido das vendas de cartão nacional já liberadas.
 *
 * @return array<string,mixed>
 */
function gcv_mp_sweep_to_sicoob(): array
{
    gcv_ledger_ensure_schema();
    gcv_mp_sweep_refresh_transit();
    $ready = gcv_mp_sweep_readiness();
    $open = (int) db()->query(
        "SELECT COUNT(*) FROM gcv_gateway_settlements WHERE gateway = 'mercadopago' AND status = 'IN_TRANSIT'"
    )->fetchColumn();
    if ($open > 0) {
        gcv_ledger_mp_available();
        $stale = (int) db()->query(
            "SELECT COUNT(*) FROM gcv_gateway_settlements
             WHERE gateway = 'mercadopago' AND status = 'IN_TRANSIT'
               AND created_at < NOW() - INTERVAL 2 DAY"
        )->fetchColumn();
        if ($stale > 0) {
            gcv_mp_sweep_alert_once('stale_transit', '<p>Um Pix do Mercado Pago para o Sicoob está há mais de 2 dias sem aparecer no extrato. O próximo envio espera esse chegar, para não transferir duas vezes.</p>');
        }
        return ['ok' => true, 'sent' => false, 'reason' => 'waiting_sicoob', 'in_transit' => $open];
    }
    gcv_ledger_mp_available();
    if (!$ready['ready']) {
        $waiting = gcv_ledger_mp_available();
        if ($waiting['cents'] > 0) {
            gcv_mp_sweep_alert_once('not_ready', '<p>' . htmlspecialchars($ready['reason'], ENT_QUOTES, 'UTF-8') . '</p><p>Há saldo de cartão nacional liberado no Mercado Pago que ainda não foi para o Sicoob.</p>');
        }
        return ['ok' => false, 'sent' => false, 'reason' => 'not_ready', 'detail' => $ready['reason']];
    }

    $rows = db()->query(
        "SELECT id, net_cents, gross_cents, fee_cents, refunded_cents
         FROM gcv_payment_transactions
         WHERE gateway = 'mercadopago' AND method = 'card_br'
           AND status IN ('PAID','PARTIALLY_REFUNDED')
           AND settlement_status = 'AVAILABLE'
         ORDER BY COALESCE(available_at, paid_at, created_at) ASC, id ASC"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $balance = gcv_mp_available_balance_cents();
    $cap = $balance === null ? PHP_INT_MAX : $balance;
    $ids = [];
    $sum = 0;
    $skipped = 0;
    foreach ($rows as $row) {
        $net = (int) ($row['net_cents'] ?? 0);
        if ($net <= 0) {
            $net = max(0, (int) ($row['gross_cents'] ?? 0) - (int) ($row['fee_cents'] ?? 0) - (int) ($row['refunded_cents'] ?? 0));
        }
        if ($net <= 0) {
            continue;
        }
        if ($sum + $net > $cap) {
            $skipped += $net;
            continue;
        }
        $ids[] = (int) $row['id'];
        $sum += $net;
    }
    if ($sum < 100 || !$ids) {
        return ['ok' => true, 'sent' => false, 'reason' => $skipped > 0 ? 'balance_short' : 'nothing', 'cents' => $sum, 'skipped_cents' => $skipped];
    }

    $dest = gcv_mp_sweep_destination();
    if ($dest === null) {
        return ['ok' => false, 'sent' => false, 'reason' => 'not_ready', 'detail' => 'Chave Pix do Sicoob não configurada.'];
    }
    $day = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Ymd');
    $ref = 'gcv-mp-' . substr(hash('sha256', $day . ':' . implode(',', $ids)), 0, 16);
    $payload = [
        'external_reference' => $ref,
        'description' => 'Repasse cartao nacional para o Sicoob',
        'transactions' => [[
            'description' => 'Liquido das vendas de cartao nacional',
            'type' => 'pix',
            'pix' => [
                'type' => $dest['type'],
                'chave' => $dest['chave'],
            ],
            'amount' => [
                'currency' => 'BRL',
                'value' => round($sum / 100, 2),
            ],
            'external_reference' => $ref,
        ]],
    ];
    $raw = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($raw)) {
        return ['ok' => false, 'sent' => false, 'reason' => 'encode'];
    }
    $headers = ['X-Idempotency-Key: ' . $ref];
    if (gcv_mp_is_test()) {
        $headers[] = 'X-test-token: true';
        $headers[] = 'X-enforce-signature: false';
    } else {
        $sig = gcv_mp_sweep_sign($raw);
        if ($sig === null) {
            gcv_mp_sweep_alert_once('sign', '<p>Não foi possível assinar o Pix do Mercado Pago para o Sicoob. Confira MP_PAYOUT_PRIVATE_KEY.</p>');
            return ['ok' => false, 'sent' => false, 'reason' => 'sign'];
        }
        $headers[] = 'X-enforce-signature: true';
        $headers[] = 'X-signature: ' . $sig;
    }
    $res = gcv_mp_sweep_post($raw, $headers);
    if (empty($res['ok'])) {
        $detail = (string) ($res['error'] ?? 'mp_error');
        gcv_mp_sweep_alert_once('post_' . substr($detail, 0, 40), '<p>O Mercado Pago não aceitou o Pix para o Sicoob.</p><p>' . htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') . '</p>');
        return ['ok' => false, 'sent' => false, 'reason' => 'mp_rejected', 'detail' => $detail];
    }
    $payoutId = (string) ($res['data']['id'] ?? '');
    if ($payoutId === '') {
        $payoutId = $ref;
    }
    $sid = gcv_ledger_upsert_settlement([
        'gateway' => 'mercadopago',
        'external_id' => substr($payoutId, 0, 80),
        'amount_cents' => $sum,
        'status' => 'IN_TRANSIT',
        'expected_at' => (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d'),
        'notes' => 'Pix automático do Mercado Pago para o Sicoob',
        'raw_json' => ['idempotency' => $ref, 'ids' => $ids],
    ]);
    if (!$sid) {
        return ['ok' => false, 'sent' => true, 'reason' => 'settlement_save', 'payout_id' => $payoutId, 'cents' => $sum];
    }
    gcv_ledger_attach_settlement($ids, $sid, 'IN_TRANSIT', null);
    return ['ok' => true, 'sent' => true, 'payout_id' => $payoutId, 'cents' => $sum, 'sales' => count($ids)];
}

/**
 * POST com o JSON já assinado, sem reescrever o corpo.
 *
 * @param list<string> $extraHeaders
 * @return array{ok:bool,data?:array<string,mixed>,error?:string,http?:int}
 */
function gcv_mp_sweep_post(string $rawBody, array $extraHeaders): array
{
    $token = gcv_mp_token();
    if ($token === '' || !function_exists('curl_init')) {
        return ['ok' => false, 'error' => 'mp_not_configured'];
    }
    $ch = curl_init('https://api.mercadopago.com/v1/payouts');
    $headers = array_merge([
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
        'Content-Type: application/json',
    ], $extraHeaders);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $rawBody,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode(is_string($raw) ? $raw : '', true);
    if ($http >= 400 || !is_array($data)) {
        $msg = is_array($data) ? (string) ($data['message'] ?? $data['error'] ?? 'mp_error') : 'mp_bad_response';
        error_log('mercadopago payout http=' . $http . ' ' . $msg);
        return ['ok' => false, 'error' => $msg, 'http' => $http];
    }
    return ['ok' => true, 'data' => $data, 'http' => $http];
}

/** Estado para o painel Financeiro. Não expõe chave nem segredo. */
function gcv_mp_sweep_admin(): array
{
    $ready = gcv_mp_sweep_readiness();
    $cents = 0;
    try {
        gcv_ledger_ensure_schema();
        $cents = (int) db()->query(
            "SELECT COALESCE(SUM(amount_cents),0) FROM gcv_gateway_settlements
             WHERE gateway = 'mercadopago' AND status = 'IN_TRANSIT'"
        )->fetchColumn();
    } catch (Throwable $e) {
        $cents = 0;
    }
    return [
        'ready' => $ready['ready'],
        'reason' => $ready['reason'],
        'in_transit_cents' => $cents,
    ];
}
