<?php

declare(strict_types=1);

/**
 * API Pix Sicoob — OAuth mTLS + consulta de PIX recebidos (fallback ao webhook).
 *
 * Cadastro: developers.sicoob.com.br
 * Webhook: registrar https://www.guiachapadaveadeiros.com/api/sicoob_webhook
 *          (Sicoob chama …/api/sicoob_webhook/pix)
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/pix_reservation_store.php';
require_once __DIR__ . '/sicoob_webhook.php';

/** @return array<string, mixed> */
function gcv_sicoob_api_cfg(): array
{
    static $cached = null;
    if (is_array($cached)) {
        return $cached;
    }

    $root = gcv_load_config();
    $cfg = is_array($root['sicoob'] ?? null) ? $root['sicoob'] : [];

    $sandbox = filter_var($cfg['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $cached = [
        'client_id' => trim((string)($cfg['client_id'] ?? '')),
        'client_secret' => trim((string)($cfg['client_secret'] ?? '')),
        'pix_key' => preg_replace('/\D/', '', (string)($cfg['pix_key'] ?? '24354289000105')) ?: '24354289000105',
        'cert_pem' => trim((string)($cfg['cert_pem'] ?? '')),
        'cert_key' => trim((string)($cfg['cert_key'] ?? '')),
        'cert_pfx' => trim((string)($cfg['cert_pfx'] ?? '')),
        'cert_pass' => (string)($cfg['cert_pass'] ?? ''),
        'scope' => trim((string)($cfg['scope'] ?? 'pix.read webhook.read')),
        'sandbox' => $sandbox,
        /** Token fixo do portal Sandbox Sicoob (sem certificado — só homologação). */
        'sandbox_access_token' => trim((string)($cfg['sandbox_access_token'] ?? '')),
        'token_url' => trim((string)($cfg['token_url'] ?? '')),
        'api_base' => trim((string)($cfg['api_base'] ?? '')),
        'pay_api_base' => trim((string)($cfg['pay_api_base'] ?? '')),
        'webhook_base_url' => rtrim(trim((string)($cfg['webhook_base_url'] ?? 'https://www.guiachapadaveadeiros.com/api/sicoob_webhook')), '/'),
    ];
    return $cached;
}

function gcv_sicoob_uses_static_sandbox_token(): bool
{
    $cfg = gcv_sicoob_api_cfg();
    return $cfg['sandbox'] && $cfg['sandbox_access_token'] !== '';
}

function gcv_sicoob_is_configured(): bool
{
    $cfg = gcv_sicoob_api_cfg();
    if ($cfg['client_id'] === '') {
        return false;
    }
    if (gcv_sicoob_uses_static_sandbox_token()) {
        return true;
    }
    if ($cfg['cert_pfx'] !== '') {
        return is_readable(gcv_sicoob_resolve_path($cfg['cert_pfx']));
    }
    if ($cfg['cert_pem'] === '' || $cfg['cert_key'] === '') {
        return false;
    }
    return is_readable(gcv_sicoob_resolve_path($cfg['cert_pem']))
        && is_readable(gcv_sicoob_resolve_path($cfg['cert_key']));
}

function gcv_sicoob_resolve_path(string $rel): string
{
    if ($rel === '') {
        return '';
    }
    if ($rel[0] === '/' || preg_match('/^[A-Za-z]:[\\\\\\/]/', $rel)) {
        return $rel;
    }
    return dirname(__DIR__) . '/' . ltrim(str_replace('\\', '/', $rel), '/');
}

function gcv_sicoob_storage_dir(): string
{
    $dir = dirname(__DIR__) . '/storage/sicoob';
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    return $dir;
}

function gcv_sicoob_token_url(): string
{
    $cfg = gcv_sicoob_api_cfg();
    if ($cfg['token_url'] !== '') {
        return $cfg['token_url'];
    }
    if ($cfg['sandbox']) {
        return 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token';
    }
    // Produção (portal Developers)
    return 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token';
}

function gcv_sicoob_api_base(): string
{
    $cfg = gcv_sicoob_api_cfg();
    if ($cfg['api_base'] !== '') {
        return rtrim($cfg['api_base'], '/');
    }
    if ($cfg['sandbox']) {
        return 'https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2';
    }
    return 'https://api.sicoob.com.br/pix/api/v2';
}

function gcv_sicoob_format_dt(int $timestamp): string
{
    $dt = new DateTime('@' . $timestamp);
    $dt->setTimezone(new DateTimeZone('America/Sao_Paulo'));
    return $dt->format('Y-m-d\TH:i:s.00P');
}

/** @param resource|\CurlHandle $ch */
function gcv_sicoob_apply_mtls($ch): bool
{
    $cfg = gcv_sicoob_api_cfg();
    if ($cfg['cert_pfx'] !== '') {
        $path = gcv_sicoob_resolve_path($cfg['cert_pfx']);
        if (!is_readable($path)) {
            return false;
        }
        curl_setopt($ch, CURLOPT_SSLCERT, $path);
        curl_setopt($ch, CURLOPT_SSLCERTTYPE, 'P12');
        if ($cfg['cert_pass'] !== '') {
            curl_setopt($ch, CURLOPT_SSLCERTPASSWD, $cfg['cert_pass']);
        }
        return true;
    }

    $pem = gcv_sicoob_resolve_path($cfg['cert_pem']);
    $key = gcv_sicoob_resolve_path($cfg['cert_key']);
    if (!is_readable($pem) || !is_readable($key)) {
        return false;
    }
    curl_setopt($ch, CURLOPT_SSLCERT, $pem);
    curl_setopt($ch, CURLOPT_SSLKEY, $key);
    if ($cfg['cert_pass'] !== '') {
        curl_setopt($ch, CURLOPT_SSLKEYPASSWD, $cfg['cert_pass']);
    }
    return true;
}

/** @return array<string, mixed>|null */
function gcv_sicoob_read_token_cache(): ?array
{
    $path = gcv_sicoob_storage_dir() . '/oauth_token.json';
    if (!is_readable($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

/** @param array<string, mixed> $data */
function gcv_sicoob_write_token_cache(array $data): void
{
    $path = gcv_sicoob_storage_dir() . '/oauth_token.json';
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function gcv_sicoob_access_token(): ?string
{
    if (!gcv_sicoob_is_configured() || !function_exists('curl_init')) {
        return null;
    }

    if (gcv_sicoob_uses_static_sandbox_token()) {
        return gcv_sicoob_api_cfg()['sandbox_access_token'];
    }

    $cached = gcv_sicoob_read_token_cache();
    if ($cached && !empty($cached['access_token']) && !empty($cached['expires_at'])) {
        $exp = strtotime((string)$cached['expires_at']);
        if ($exp !== false && ($exp - 30) > time()) {
            return (string)$cached['access_token'];
        }
    }

    $cfg = gcv_sicoob_api_cfg();
    $post = [
        'grant_type' => 'client_credentials',
        'client_id' => $cfg['client_id'],
        'scope' => $cfg['scope'],
    ];
    if ($cfg['client_secret'] !== '') {
        $post['client_secret'] = $cfg['client_secret'];
    }

    $ch = curl_init(gcv_sicoob_token_url());
    if ($ch === false) {
        return null;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($post),
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
    ]);
    if (!gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return null;
    }

    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $code < 200 || $code >= 300) {
        return null;
    }

    $json = json_decode($body, true);
    if (!is_array($json) || empty($json['access_token'])) {
        return null;
    }

    $expiresIn = (int)($json['expires_in'] ?? 300);
    gcv_sicoob_write_token_cache([
        'access_token' => (string)$json['access_token'],
        'expires_at' => gmdate('c', time() + max(60, $expiresIn)),
    ]);

    return (string)$json['access_token'];
}

/**
 * @param array<string, string> $query
 * @return array<string, mixed>|null
 */
function gcv_sicoob_api_get(string $path, array $query = []): ?array
{
    $token = gcv_sicoob_access_token();
    if ($token === null) {
        return null;
    }

    $cfg = gcv_sicoob_api_cfg();
    $url = gcv_sicoob_api_base() . $path;
    if ($query) {
        $url .= '?' . http_build_query($query);
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return null;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer ' . $token,
            'client_id: ' . $cfg['client_id'],
        ],
    ]);
    if (!gcv_sicoob_uses_static_sandbox_token() && !gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return null;
    }

    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $code < 200 || $code >= 300) {
        return null;
    }

    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

/** @return list<array<string, mixed>> */
function gcv_sicoob_extract_pix_list(?array $payload): array
{
    if (!$payload) {
        return [];
    }
    if (isset($payload['pix']) && is_array($payload['pix'])) {
        $out = [];
        foreach ($payload['pix'] as $item) {
            if (is_array($item)) {
                $out[] = $item;
            }
        }
        return $out;
    }
    return [];
}

/** @param array<string, mixed> $reservation */
function gcv_sicoob_should_poll(array $reservation): bool
{
    $last = strtotime((string)($reservation['sicoob_last_poll_at'] ?? ''));
    if ($last !== false && (time() - $last) < 4) {
        return false;
    }
    return true;
}

/** @param array<string, mixed> $reservation */
function gcv_sicoob_mark_poll_attempt(array $reservation): void
{
    $reservation['sicoob_last_poll_at'] = gmdate('c');
    gcv_pix_write_reservation($reservation);
}

/** @param array<string, mixed> $reservation */
function gcv_sicoob_try_confirm_reservation(array $reservation): ?array
{
    if (!gcv_sicoob_is_configured()) {
        return null;
    }

    $reservationId = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    if ($reservationId === '' || gcv_pix_effective_status($reservation) !== 'PENDING') {
        return null;
    }

    if (!gcv_sicoob_should_poll($reservation)) {
        return null;
    }

    gcv_sicoob_mark_poll_attempt($reservation);

    $createdTs = strtotime((string)($reservation['created_at'] ?? ''));
    if ($createdTs === false) {
        $createdTs = time() - 900;
    }
    $start = gcv_sicoob_format_dt(max(0, $createdTs - 120));
    $end = gcv_sicoob_format_dt(time() + 120);

    $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation['txid'] ?? '')) ?? '', 0, 25);

    $queries = [];
    if ($txid !== '') {
        $queries[] = ['inicio' => $start, 'fim' => $end, 'txId' => $txid];
    }
    $queries[] = ['inicio' => $start, 'fim' => $end];

    foreach ($queries as $query) {
        $payload = gcv_sicoob_api_get('/pix', $query);
        foreach (gcv_sicoob_extract_pix_list($payload) as $pixItem) {
            $match = gcv_sicoob_match_webhook_payload(['pix' => [$pixItem]], $reservation);
            if (!$match) {
                continue;
            }
            $matchedId = gcv_pix_safe_id((string)($match['reservation']['reservation_id'] ?? ''));
            if ($matchedId !== $reservationId) {
                continue;
            }
            if (($match['reservation']['status'] ?? '') === 'PAID') {
                return $match['reservation'];
            }
            $res = gcv_pix_mark_paid($reservationId, 'sicoob_poll');
            if (!$res) {
                return null;
            }
            $paid = gcv_sicoob_pix_item_amount_reais($pixItem);
            if ($paid !== null) {
                $res['sicoob_paid_reais'] = $paid;
            }
            $e2e = trim((string)($pixItem['endToEndId'] ?? ''));
            if ($e2e !== '') {
                $res['sicoob_end_to_end_id'] = $e2e;
            }
            $res['sicoob_poll_at'] = gmdate('c');
            gcv_pix_write_reservation($res);
            return $res;
        }
    }

    return null;
}

/**
 * Registra webhook na API Sicoob (executar uma vez após deploy).
 *
 * @return array{success: bool, message?: string, webhookUrl?: string}
 */
function gcv_sicoob_register_webhook(): array
{
    if (!gcv_sicoob_is_configured()) {
        return ['success' => false, 'message' => 'Sicoob não configurado (client_id + certificado)'];
    }

    $token = gcv_sicoob_access_token();
    if ($token === null) {
        return ['success' => false, 'message' => 'Não foi possível obter token OAuth'];
    }

    $cfg = gcv_sicoob_api_cfg();
    $webhookUrl = $cfg['webhook_base_url'];
    $pixKey = $cfg['pix_key'];
    $url = gcv_sicoob_api_base() . '/webhook/' . rawurlencode($pixKey);
    $body = json_encode(['webhookUrl' => $webhookUrl], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($url);
    if ($ch === false) {
        return ['success' => false, 'message' => 'curl_init failed'];
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
            'client_id: ' . $cfg['client_id'],
        ],
    ]);
    if (!gcv_sicoob_uses_static_sandbox_token() && !gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return ['success' => false, 'message' => 'Certificado mTLS indisponível'];
    }

    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code >= 200 && $code < 300) {
        return [
            'success' => true,
            'webhookUrl' => $webhookUrl,
            'message' => 'Webhook registrado. Sicoob chamará ' . $webhookUrl . '/pix',
        ];
    }

    if (gcv_sicoob_uses_static_sandbox_token()) {
        return [
            'success' => false,
            'message' => 'HTTP ' . $code . ' (sandbox): webhook real exige app de produção + certificado',
        ];
    }

    return [
        'success' => false,
        'message' => 'HTTP ' . $code . ': ' . substr((string)$resp, 0, 400),
    ];
}
