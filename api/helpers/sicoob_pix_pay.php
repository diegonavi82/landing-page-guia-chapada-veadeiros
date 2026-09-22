<?php

declare(strict_types=1);

/**
 * Envio de PIX (Pix Pagamentos Sicoob) — somente para chaves já validadas no fluxo admin.
 *
 * Fluxo oficial (2 passos):
 *   1) POST /pagamentos           { chave, valor }       → consulta DICT + endToEndId
 *   2) POST /pagamentos/confirmacao { endToEndId, valor } → efetiva o PIX
 *   valor: string Bacen ^([0-9]{1,13})(\.[0-9]{1,2})?$  (R$ 1,00 → "1")
 */

require_once __DIR__ . '/sicoob_api.php';
require_once __DIR__ . '/pix_key.php';

function gcv_sicoob_pay_api_base(): string
{
    $cfg = gcv_sicoob_api_cfg();
    if (!empty($cfg['pay_api_base'])) {
        return rtrim((string)$cfg['pay_api_base'], '/');
    }
    if (!empty($cfg['sandbox'])) {
        return 'https://sandbox.sicoob.com.br/sicoob/sandbox/pix-pagamentos/v2';
    }
    return 'https://api.sicoob.com.br/pix-pagamentos/v2';
}

/**
 * @return array{ok:bool, endToEndId?:string, raw?:array, error?:string, http?:int}
 */
function gcv_sicoob_send_pix_payment(
    string $pixKey,
    string $pixKeyType,
    int $amountCents,
    string $description,
    string $idempotencyKey,
    string $existingEndToEndId = ''
): array {
    if (!gcv_sicoob_is_configured()) {
        return ['ok' => false, 'error' => 'Sicoob não configurado (client_id + certificado)'];
    }
    if ($amountCents < 100) {
        return ['ok' => false, 'error' => 'Valor mínimo: R$ 1,00'];
    }
    if ($amountCents > 50000000) {
        return ['ok' => false, 'error' => 'Valor acima do limite interno'];
    }

    $prepared = gcv_pix_key_for_sicoob($pixKey, $pixKeyType);
    if (empty($prepared['ok']) || empty($prepared['key'])) {
        return ['ok' => false, 'error' => (string)($prepared['error'] ?? 'Chave PIX inválida')];
    }
    $chave = (string)$prepared['key'];

    $token = gcv_sicoob_access_token();
    if ($token === null) {
        return ['ok' => false, 'error' => 'Falha ao obter token OAuth Sicoob'];
    }

    $valor = gcv_sicoob_pay_format_valor($amountCents);
    $desc = mb_substr(trim($description) !== '' ? $description : 'Pagamento guia GCV', 0, 140);
    $initJson = [];
    $e2e = trim($existingEndToEndId);
    $sentRequests = [];

    if ($e2e === '') {
        $initPayload = [
            'chave' => $chave,
            'valor' => $valor,
        ];
        $sentRequests[] = ['path' => '/pagamentos', 'body' => $initPayload];
        $init = gcv_sicoob_pay_http_retry(
            'POST',
            '/pagamentos',
            $initPayload,
            $idempotencyKey . '-i',
            $token
        );
        if (
            !$init['ok']
            && (int)($init['http'] ?? 0) === 400
            && gcv_sicoob_pay_error_looks_like_unknown_field((string)($init['error'] ?? ''))
        ) {
            $initPayload = ['chave' => $chave];
            $sentRequests[] = ['path' => '/pagamentos', 'body' => $initPayload];
            $init = gcv_sicoob_pay_http_retry(
                'POST',
                '/pagamentos',
                $initPayload,
                $idempotencyKey . '-i2',
                $token
            );
        }
        if (!$init['ok']) {
            return [
                'ok' => false,
                'error' => $init['error'] ?? 'Falha ao iniciar PIX no Sicoob',
                'raw' => [
                    'init' => $init['json'] ?? [],
                    'sent' => $sentRequests,
                ],
                'http' => $init['http'] ?? 0,
            ];
        }

        $initJson = is_array($init['json'] ?? null) ? $init['json'] : [];
        $e2e = gcv_sicoob_pay_extract_e2e($initJson);
        if ($e2e === '') {
            return [
                'ok' => false,
                'error' => 'Sicoob não devolveu endToEndId na iniciação',
                'raw' => $initJson,
                'http' => (int)($init['http'] ?? 0),
            ];
        }

        // Evita o rate limit do gateway (init + confirm no mesmo segundo).
        usleep(1_600_000);
    }

    $valorAlt = gcv_sicoob_pay_format_valor_alt($amountCents, $valor);
    $confirmPayloads = [
        [
            'endToEndId' => $e2e,
            'valor' => $valor,
            'descricao' => $desc,
        ],
        [
            'endToEndId' => $e2e,
            'valor' => $valorAlt,
            'descricao' => $desc,
        ],
        [
            'endToEndId' => $e2e,
            'valor' => $valor,
            'descricao' => $desc,
            'repeticao' => false,
            'meioIniciacao' => 'CHAVE',
        ],
        [
            'endToEndId' => $e2e,
            'valor' => $valor,
            'descricao' => $desc,
            'repeticao' => false,
            'meioIniciacao' => 'DICT',
        ],
    ];

    $destino = gcv_sicoob_pay_extract_destino($initJson);
    $origem = gcv_sicoob_pay_extract_origem($initJson);
    if ($destino !== null) {
        $confirmPayloads[2]['destino'] = $destino;
        $confirmPayloads[3]['destino'] = $destino;
    }
    if ($origem !== null) {
        $confirmPayloads[2]['origem'] = $origem;
        $confirmPayloads[3]['origem'] = $origem;
    }

    $sentRequests[] = ['path' => '/pagamentos/confirmacao', 'body' => $confirmPayloads[0]];
    $confirm = gcv_sicoob_pay_http_retry(
        'POST',
        '/pagamentos/confirmacao',
        $confirmPayloads[0],
        $idempotencyKey . '-c',
        $token
    );
    $confirmHttp = (int)($confirm['http'] ?? 0);
    $confirmErr = strtolower((string)($confirm['error'] ?? ''));
    if (
        !$confirm['ok']
        && $confirmHttp === 400
        && (str_contains($confirmErr, 'valor')
            || str_contains($confirmErr, 'pattern')
            || str_contains($confirmErr, 'meioiniciacao')
            || str_contains($confirmErr, 'required')
            || str_contains($confirmErr, 'obrigat'))
    ) {
        $retryIndexes = str_contains($confirmErr, 'valor') || str_contains($confirmErr, 'pattern')
            ? [1]
            : [2, 3];
        foreach ($retryIndexes as $i) {
            usleep(1_200_000);
            $sentRequests[] = ['path' => '/pagamentos/confirmacao', 'body' => $confirmPayloads[$i]];
            $retry = gcv_sicoob_pay_http_retry(
                'POST',
                '/pagamentos/confirmacao',
                $confirmPayloads[$i],
                $idempotencyKey . '-c' . (string)($i + 1),
                $token
            );
            if ($retry['ok'] || (int)($retry['http'] ?? 0) !== 400) {
                $confirm = $retry;
                break;
            }
            $confirm = $retry;
        }
    }

    if (!$confirm['ok']) {
        $http = (int)($confirm['http'] ?? 0);
        if ($existingEndToEndId !== '' && in_array($http, [400, 404, 409, 422], true)) {
            return gcv_sicoob_send_pix_payment(
                $pixKey,
                $pixKeyType,
                $amountCents,
                $description,
                $idempotencyKey . '-r',
                ''
            );
        }
        return [
            'ok' => false,
            'error' => $confirm['error'] ?? 'Falha ao confirmar PIX no Sicoob',
            'endToEndId' => $e2e,
            'raw' => [
                'init' => $initJson,
                'confirm' => $confirm['json'] ?? [],
                'sent' => $sentRequests,
            ],
            'http' => $confirm['http'] ?? 0,
        ];
    }

    $confirmJson = is_array($confirm['json'] ?? null) ? $confirm['json'] : [];
    $paidE2e = gcv_sicoob_pay_extract_e2e($confirmJson) ?: $e2e;

    return [
        'ok' => true,
        'endToEndId' => $paidE2e,
        'raw' => [
            'init' => $initJson,
            'confirm' => $confirmJson,
        ],
        'http' => (int)($confirm['http'] ?? 0),
    ];
}

/**
 * Valor no padrão Bacen/Sicoob: ^([0-9]{1,13})(\.[0-9]{1,2})?$
 * Reais inteiros vão sem casas ("1") — "1.00" tem sido rejeitado pelo gateway.
 */
function gcv_sicoob_pay_format_valor(int $amountCents): string
{
    $reais = intdiv(max(0, $amountCents), 100);
    $cents = max(0, $amountCents) % 100;
    $valor = $cents === 0
        ? (string)$reais
        : $reais . '.' . str_pad((string)$cents, 2, '0', STR_PAD_LEFT);
    if (!preg_match('/^([0-9]{1,13})(\.[0-9]{1,2})?$/', $valor)) {
        return number_format($amountCents / 100, 2, '.', '');
    }
    return $valor;
}

/** Formato alternativo caso o gateway recuse o primeiro. */
function gcv_sicoob_pay_format_valor_alt(int $amountCents, string $primary): string
{
    $withDecimals = number_format($amountCents / 100, 2, '.', '');
    if ($primary !== $withDecimals) {
        return $withDecimals;
    }
    $reais = intdiv(max(0, $amountCents), 100);
    $cents = max(0, $amountCents) % 100;
    if ($cents === 0) {
        return (string)$reais;
    }
    return $reais . '.' . (string)$cents;
}

function gcv_sicoob_pay_error_looks_like_unknown_field(string $error): bool
{
    $e = strtolower($error);
    return str_contains($e, 'additional')
        || str_contains($e, 'unrecognized')
        || str_contains($e, 'unexpected')
        || str_contains($e, 'not allowed')
        || str_contains($e, 'unknown')
        || str_contains($e, 'nao permitido')
        || str_contains($e, 'não permitido');
}

/**
 * @return array{ok:bool, http:int, json?:array, error?:string, retry_after?:int}
 */
function gcv_sicoob_pay_http_retry(
    string $method,
    string $path,
    ?array $payload,
    string $idempotencyKey,
    string $token
): array {
    $delays = [2, 4, 8];
    $attempt = 0;
    $last = ['ok' => false, 'http' => 0, 'error' => 'Falha Sicoob'];

    while (true) {
        $last = gcv_sicoob_pay_http($method, $path, $payload, $idempotencyKey, $token);
        if ($last['ok'] || (int)($last['http'] ?? 0) !== 429) {
            return $last;
        }

        $retryAfter = (int)($last['retry_after'] ?? 0);
        if ($retryAfter > 12) {
            $last['error'] = 'Sicoob limitou as tentativas agora. Aguarde cerca de 1 minuto e confirme novamente.';
            return $last;
        }
        if ($attempt >= count($delays)) {
            $last['error'] = 'Sicoob limitou as tentativas agora. Aguarde cerca de 1 minuto e confirme novamente.';
            return $last;
        }

        $wait = $retryAfter > 0 ? $retryAfter : $delays[$attempt];
        sleep(max(1, $wait));
        $attempt++;
    }
}

/**
 * @return array{ok:bool, http:int, json?:array, error?:string, retry_after?:int}
 */
function gcv_sicoob_pay_http(
    string $method,
    string $path,
    ?array $payload,
    string $idempotencyKey,
    string $token
): array {
    $cfg = gcv_sicoob_api_cfg();
    $url = gcv_sicoob_pay_api_base() . '/' . ltrim($path, '/');
    $body = null;
    if ($payload !== null) {
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($body === false) {
            return ['ok' => false, 'http' => 0, 'error' => 'JSON inválido'];
        }
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'http' => 0, 'error' => 'curl_init failed'];
    }

    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token,
        'client_id: ' . $cfg['client_id'],
        'x-idempotency-key: ' . mb_substr($idempotencyKey, 0, 64),
    ];

    $respHeaders = '';
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use (&$respHeaders): int {
            $respHeaders .= $header;
            return strlen($header);
        },
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);

    if (!gcv_sicoob_uses_static_sandbox_token() && !gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return ['ok' => false, 'http' => 0, 'error' => 'Certificado mTLS indisponível'];
    }

    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($resp === false) {
        return ['ok' => false, 'http' => $code, 'error' => 'Erro de rede: ' . $curlErr];
    }

    $json = json_decode((string)$resp, true);
    if (!is_array($json)) {
        $json = ['raw' => substr((string)$resp, 0, 800)];
    }

    $retryAfter = 0;
    if (preg_match('/^Retry-After:\s*(\d+)/im', $respHeaders, $m)) {
        $retryAfter = (int)$m[1];
    }

    if ($code >= 200 && $code < 300) {
        $out = ['ok' => true, 'http' => $code, 'json' => $json];
        if ($retryAfter > 0) {
            $out['retry_after'] = $retryAfter;
        }
        return $out;
    }

    $out = [
        'ok' => false,
        'http' => $code,
        'json' => $json,
        'error' => gcv_sicoob_pay_error_message($json, $code),
    ];
    if ($retryAfter > 0) {
        $out['retry_after'] = $retryAfter;
    }
    return $out;
}

/**
 * @param array<string,mixed> $json
 */
function gcv_sicoob_pay_error_message(array $json, int $code): string
{
    if ($code === 429 || (string)($json['httpCode'] ?? '') === '429') {
        $extra = trim((string)($json['moreInformation'] ?? $json['httpMessage'] ?? ''));
        $msg = 'Sicoob limitou as tentativas agora. Aguarde cerca de 1 minuto e confirme novamente.';
        return $extra !== '' && !str_contains(strtolower($extra), 'too many')
            ? $msg . ' (' . mb_substr($extra, 0, 120) . ')'
            : $msg;
    }

    $parts = [];
    foreach (['title', 'mensagem', 'message', 'detail', 'descricao', 'httpMessage', 'moreInformation'] as $k) {
        if (!empty($json[$k]) && is_string($json[$k])) {
            $parts[] = $json[$k];
        }
    }
    $violations = $json['violacoes'] ?? $json['errors'] ?? $json['violations'] ?? [];
    if (is_array($violations)) {
        foreach ($violations as $v) {
            if (!is_array($v)) {
                continue;
            }
            $prop = (string)($v['propriedade'] ?? $v['property'] ?? '');
            $razao = (string)($v['razao'] ?? $v['reason'] ?? $v['message'] ?? $v['mensagem'] ?? '');
            $chunk = trim($prop . ' ' . $razao);
            if ($chunk !== '') {
                $parts[] = $chunk;
            }
        }
    }
    $parts = array_values(array_unique(array_filter($parts)));
    if ($parts) {
        return mb_substr(implode(' — ', $parts), 0, 400);
    }
    return 'Falha Sicoob HTTP ' . $code;
}

/**
 * @param array<string,mixed> $json
 */
function gcv_sicoob_pay_extract_e2e(array $json): string
{
    $candidates = [
        $json['endToEndId'] ?? null,
        $json['e2eId'] ?? null,
        $json['end_to_end_id'] ?? null,
        $json['pagamento']['endToEndId'] ?? null,
        $json['resultado']['endToEndId'] ?? null,
        $json['data']['endToEndId'] ?? null,
        $json['data']['pagamento']['endToEndId'] ?? null,
        $json['init']['endToEndId'] ?? null,
    ];
    foreach ($candidates as $v) {
        $s = trim((string)$v);
        if ($s !== '') {
            return $s;
        }
    }
    return '';
}

/**
 * @param array<string,mixed> $json
 * @return array<string,mixed>|null
 */
function gcv_sicoob_pay_extract_destino(array $json): ?array
{
    foreach (['destino', 'favorecido', 'recebedor'] as $k) {
        if (!empty($json[$k]) && is_array($json[$k])) {
            return $json[$k];
        }
    }
    foreach (['resultado', 'data', 'pagamento'] as $wrap) {
        if (!empty($json[$wrap]) && is_array($json[$wrap])) {
            $inner = gcv_sicoob_pay_extract_destino($json[$wrap]);
            if ($inner !== null) {
                return $inner;
            }
        }
    }
    return null;
}

/**
 * @param array<string,mixed> $json
 * @return array<string,mixed>|null
 */
function gcv_sicoob_pay_extract_origem(array $json): ?array
{
    foreach (['origem', 'pagador'] as $k) {
        if (!empty($json[$k]) && is_array($json[$k])) {
            return $json[$k];
        }
    }
    foreach (['resultado', 'data', 'pagamento'] as $wrap) {
        if (!empty($json[$wrap]) && is_array($json[$wrap])) {
            $inner = gcv_sicoob_pay_extract_origem($json[$wrap]);
            if ($inner !== null) {
                return $inner;
            }
        }
    }
    return null;
}
