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
    if ($cfg['cert_pem'] !== '' && $cfg['cert_key'] !== '') {
        return is_readable(gcv_sicoob_resolve_path($cfg['cert_pem']))
            && is_readable(gcv_sicoob_resolve_path($cfg['cert_key']));
    }
    if ($cfg['cert_pfx'] !== '') {
        return is_readable(gcv_sicoob_resolve_path($cfg['cert_pfx']));
    }
    return false;
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

/**
 * Extrai cert.pem + key.pem a partir do .pfx (Hostinger/cURL costuma falhar com P12 direto).
 *
 * @return array{cert: string, key: string}|null
 */
function gcv_sicoob_ensure_pem_from_pfx(): ?array
{
    $cfg = gcv_sicoob_api_cfg();
    if ($cfg['cert_pfx'] === '') {
        return null;
    }
    $pfxPath = gcv_sicoob_resolve_path($cfg['cert_pfx']);
    if (!is_readable($pfxPath)) {
        return null;
    }

    $dir = gcv_sicoob_storage_dir();
    $certPem = $dir . '/client-cert.pem';
    $keyPem = $dir . '/client-key.pem';
    $metaPath = $dir . '/pem_from_pfx.json';

    $pfxMtime = (string)@filemtime($pfxPath);
    $metaRaw = is_readable($metaPath) ? (string)file_get_contents($metaPath) : '';
    $meta = $metaRaw !== '' ? json_decode($metaRaw, true) : null;
    if (
        is_array($meta)
        && ($meta['pfx_mtime'] ?? '') === $pfxMtime
        && is_readable($certPem)
        && is_readable($keyPem)
        && filesize($certPem) > 0
        && filesize($keyPem) > 0
    ) {
        return ['cert' => $certPem, 'key' => $keyPem];
    }

    if (!function_exists('openssl_pkcs12_read')) {
        return null;
    }

    $pfxBin = file_get_contents($pfxPath);
    if ($pfxBin === false || $pfxBin === '') {
        return null;
    }

    $certs = [];
    $ok = @openssl_pkcs12_read($pfxBin, $certs, $cfg['cert_pass']);
    if (!$ok || empty($certs['cert']) || empty($certs['pkey'])) {
        $certs = [];
        $ok = @openssl_pkcs12_read($pfxBin, $certs, '');
    }
    if (!$ok || empty($certs['cert']) || empty($certs['pkey'])) {
        return null;
    }

    $certBody = (string)$certs['cert'];
    if (!empty($certs['extracerts']) && is_array($certs['extracerts'])) {
        foreach ($certs['extracerts'] as $extra) {
            if (is_string($extra) && $extra !== '') {
                $certBody .= "\n" . $extra;
            }
        }
    }

    if (@file_put_contents($certPem, $certBody, LOCK_EX) === false) {
        return null;
    }
    if (@file_put_contents($keyPem, (string)$certs['pkey'], LOCK_EX) === false) {
        return null;
    }
    @chmod($certPem, 0640);
    @chmod($keyPem, 0640);
    @file_put_contents($metaPath, json_encode([
        'pfx_mtime' => $pfxMtime,
        'generated_at' => gmdate('c'),
    ], JSON_UNESCAPED_UNICODE), LOCK_EX);

    return ['cert' => $certPem, 'key' => $keyPem];
}

/** @param resource|\CurlHandle $ch */
function gcv_sicoob_apply_mtls($ch): bool
{
    $cfg = gcv_sicoob_api_cfg();

    if ($cfg['cert_pem'] !== '' && $cfg['cert_key'] !== '') {
        $pem = gcv_sicoob_resolve_path($cfg['cert_pem']);
        $key = gcv_sicoob_resolve_path($cfg['cert_key']);
        if (is_readable($pem) && is_readable($key)) {
            curl_setopt($ch, CURLOPT_SSLCERT, $pem);
            curl_setopt($ch, CURLOPT_SSLKEY, $key);
            if ($cfg['cert_pass'] !== '') {
                curl_setopt($ch, CURLOPT_SSLKEYPASSWD, $cfg['cert_pass']);
            }
            return true;
        }
    }

    $fromPfx = gcv_sicoob_ensure_pem_from_pfx();
    if ($fromPfx) {
        curl_setopt($ch, CURLOPT_SSLCERT, $fromPfx['cert']);
        curl_setopt($ch, CURLOPT_SSLKEY, $fromPfx['key']);
        return true;
    }

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

    return false;
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

/** @return array{ok: bool, http: int, error?: string, body?: string, token?: string, pem_ok?: bool} */
function gcv_sicoob_fetch_token_detailed(): array
{
    if (!gcv_sicoob_is_configured() || !function_exists('curl_init')) {
        return ['ok' => false, 'http' => 0, 'error' => 'not_configured'];
    }

    if (gcv_sicoob_uses_static_sandbox_token()) {
        $t = gcv_sicoob_api_cfg()['sandbox_access_token'];
        return $t !== ''
            ? ['ok' => true, 'http' => 200, 'token' => $t, 'pem_ok' => true]
            : ['ok' => false, 'http' => 0, 'error' => 'empty_sandbox_token'];
    }

    $cfg = gcv_sicoob_api_cfg();
    $scope = trim((string)$cfg['scope']);
    if ($scope === '') {
        $scope = 'cob.read cob.write pix.read pix.write webhook.read webhook.write';
    }

    $post = [
        'grant_type' => 'client_credentials',
        'client_id' => $cfg['client_id'],
        'scope' => $scope,
    ];
    if ($cfg['client_secret'] !== '') {
        $post['client_secret'] = $cfg['client_secret'];
    }

    $pemOk = gcv_sicoob_ensure_pem_from_pfx() !== null
        || ($cfg['cert_pem'] !== '' && is_readable(gcv_sicoob_resolve_path($cfg['cert_pem'])));

    $ch = curl_init(gcv_sicoob_token_url());
    if ($ch === false) {
        return ['ok' => false, 'http' => 0, 'error' => 'curl_init_failed', 'pem_ok' => $pemOk];
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($post),
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
        CURLOPT_SSLVERSION => CURL_SSLVERSION_TLSv1_2,
    ]);
    if (!gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return ['ok' => false, 'http' => 0, 'error' => 'mtls_cert_unavailable', 'pem_ok' => $pemOk];
    }

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) {
        return [
            'ok' => false,
            'http' => $code,
            'error' => 'curl_error_' . $errno,
            'body' => $err,
            'pem_ok' => $pemOk,
        ];
    }

    if ($code < 200 || $code >= 300) {
        return [
            'ok' => false,
            'http' => $code,
            'error' => 'http_' . $code,
            'body' => mb_substr((string)$body, 0, 500),
            'pem_ok' => $pemOk,
        ];
    }

    $json = json_decode((string)$body, true);
    if (!is_array($json) || empty($json['access_token'])) {
        return [
            'ok' => false,
            'http' => $code,
            'error' => 'no_access_token',
            'body' => mb_substr((string)$body, 0, 500),
            'pem_ok' => $pemOk,
        ];
    }

    $expiresIn = (int)($json['expires_in'] ?? 300);
    gcv_sicoob_write_token_cache([
        'access_token' => (string)$json['access_token'],
        'expires_at' => gmdate('c', time() + max(60, $expiresIn)),
    ]);

    return ['ok' => true, 'http' => $code, 'token' => (string)$json['access_token'], 'pem_ok' => $pemOk];
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

    $res = gcv_sicoob_fetch_token_detailed();
    return !empty($res['ok']) && !empty($res['token']) ? (string)$res['token'] : null;
}

/**
 * @param array<string, string> $query
 * @param array<string, mixed>|null $jsonBody
 * @return array{ok: bool, http: int, data: ?array, raw: string}
 */
function gcv_sicoob_api_request(string $method, string $path, array $query = [], ?array $jsonBody = null): array
{
    $token = gcv_sicoob_access_token();
    if ($token === null) {
        return ['ok' => false, 'http' => 0, 'data' => null, 'raw' => 'no_token'];
    }

    $cfg = gcv_sicoob_api_cfg();
    $url = gcv_sicoob_api_base() . $path;
    if ($query) {
        $url .= '?' . http_build_query($query);
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'http' => 0, 'data' => null, 'raw' => 'curl_init_failed'];
    }

    $headers = [
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
        'client_id: ' . $cfg['client_id'],
    ];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
    ];
    if ($jsonBody !== null) {
        $body = json_encode($jsonBody, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);

    if (!gcv_sicoob_uses_static_sandbox_token() && !gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return ['ok' => false, 'http' => 0, 'data' => null, 'raw' => 'mtls_failed'];
    }

    $raw = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        return ['ok' => false, 'http' => $http, 'data' => null, 'raw' => 'curl_exec_failed'];
    }
    $data = json_decode($raw, true);
    return [
        'ok' => $http >= 200 && $http < 300,
        'http' => $http,
        'data' => is_array($data) ? $data : null,
        'raw' => (string)$raw,
    ];
}

/**
 * @param array<string, string> $query
 * @return array<string, mixed>|null
 */
function gcv_sicoob_api_get(string $path, array $query = []): ?array
{
    $res = gcv_sicoob_api_request('GET', $path, $query, null);
    return $res['ok'] ? $res['data'] : null;
}

/**
 * txid Bacen/Sicoob para cobrança imediata: 26–35 alfanumérico.
 * Mantém o código GCVXXXXXX no início para matching.
 */
function gcv_sicoob_txid_from_reservation_id(string $reservationId): string
{
    $alnum = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $reservationId) ?? '');
    if ($alnum === '') {
        $alnum = 'GCV' . strtoupper(bin2hex(random_bytes(4)));
    }
    if (strlen($alnum) < 26) {
        $alnum = str_pad($alnum, 26, '0');
    }
    return substr($alnum, 0, 35);
}

/**
 * Cria cobrança Pix imediata (QR dinâmico) no Sicoob.
 *
 * @return array{ok: bool, txid?: string, brcode?: string, location?: string, status?: string, error?: string, http?: int}
 */
function gcv_sicoob_create_cob(string $reservationId, float $amount, int $expiresIn = 480, string $payerRequest = ''): array
{
    if (!gcv_sicoob_is_configured()) {
        return ['ok' => false, 'error' => 'sicoob_not_configured'];
    }

    $cfg = gcv_sicoob_api_cfg();
    $txid = gcv_sicoob_txid_from_reservation_id($reservationId);
    $amountStr = number_format(round($amount, 2), 2, '.', '');
    $expiresIn = max(60, min(3600, $expiresIn));
    $solicitacao = trim($payerRequest);
    if ($solicitacao === '') {
        $solicitacao = $reservationId . ' Guia Chapada Veadeiros';
    }
    $solicitacao = mb_substr($solicitacao, 0, 140);

    $body = [
        'calendario' => ['expiracao' => $expiresIn],
        'valor' => ['original' => $amountStr],
        'chave' => $cfg['pix_key'],
        'solicitacaoPagador' => $solicitacao,
    ];

    $res = gcv_sicoob_api_request('PUT', '/cob/' . rawurlencode($txid), [], $body);
    if (!$res['ok'] || !is_array($res['data'])) {
        return [
            'ok' => false,
            'error' => 'cob_create_failed',
            'http' => $res['http'],
            'txid' => $txid,
            'detail' => mb_substr($res['raw'], 0, 400),
        ];
    }

    $data = $res['data'];
    $brcode = '';
    foreach (['pixCopiaECola', 'brcode', 'qrCode', 'emv'] as $k) {
        if (!empty($data[$k]) && is_string($data[$k])) {
            $brcode = trim($data[$k]);
            break;
        }
    }
    if ($brcode === '' && !empty($data['loc']['location']) && is_string($data['loc']['location'])) {
        // Alguns retornos só trazem location; o payload EMV completo costuma vir em pixCopiaECola
    }

    return [
        'ok' => $brcode !== '',
        'txid' => (string)($data['txid'] ?? $txid),
        'brcode' => $brcode,
        'location' => is_array($data['loc'] ?? null) ? (string)($data['loc']['location'] ?? '') : '',
        'status' => (string)($data['status'] ?? ''),
        'error' => $brcode === '' ? 'missing_brcode' : null,
        'http' => $res['http'],
    ];
}

/**
 * Confirma reserva se a cobrança dinâmica estiver CONCLUIDA.
 *
 * @param array<string, mixed> $reservation
 */
function gcv_sicoob_try_confirm_via_cob(array $reservation): ?array
{
    $reservationId = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    if ($reservationId === '' || gcv_pix_effective_status($reservation) !== 'PENDING') {
        return null;
    }
    $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation['txid'] ?? '')) ?? '', 0, 35);
    if ($txid === '' || strlen($txid) < 26) {
        $txid = gcv_sicoob_txid_from_reservation_id($reservationId);
    }

    $cob = gcv_sicoob_api_get('/cob/' . rawurlencode($txid));
    if (!$cob) {
        return null;
    }
    $status = strtoupper((string)($cob['status'] ?? ''));
    if ($status !== 'CONCLUIDA') {
        return null;
    }

    $res = gcv_pix_mark_paid($reservationId, 'sicoob_cob');
    if (!$res) {
        return null;
    }
    $res['sicoob_cob_status'] = $status;
    $res['sicoob_poll_at'] = gmdate('c');
    if (!empty($cob['pix']) && is_array($cob['pix'])) {
        $first = $cob['pix'][0] ?? null;
        if (is_array($first)) {
            $e2e = trim((string)($first['endToEndId'] ?? ''));
            if ($e2e !== '') {
                $res['sicoob_end_to_end_id'] = $e2e;
            }
            $paid = gcv_sicoob_pix_item_amount_reais($first);
            if ($paid !== null) {
                $res['sicoob_paid_reais'] = $paid;
            }
        }
    }
    gcv_pix_write_reservation($res);
    return $res;
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

    // 1) Cobrança dinâmica: status CONCLUIDA no /cob/{txid}
    $viaCob = gcv_sicoob_try_confirm_via_cob($reservation);
    if ($viaCob) {
        return $viaCob;
    }

    $createdTs = strtotime((string)($reservation['created_at'] ?? ''));
    if ($createdTs === false) {
        $createdTs = time() - 900;
    }
    $start = gcv_sicoob_format_dt(max(0, $createdTs - 120));
    $end = gcv_sicoob_format_dt(time() + 120);

    $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation['txid'] ?? '')) ?? '', 0, 35);

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
