<?php

declare(strict_types=1);

/**
 * Envio de PIX (Pix Pagamentos Sicoob) — somente para chaves já validadas no fluxo admin.
 */

require_once __DIR__ . '/sicoob_api.php';

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
    string $idempotencyKey
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

    $token = gcv_sicoob_access_token();
    if ($token === null) {
        return ['ok' => false, 'error' => 'Falha ao obter token OAuth Sicoob'];
    }

    $cfg = gcv_sicoob_api_cfg();
    $valor = number_format($amountCents / 100, 2, '.', '');
    $tipoMap = [
        'cpf' => 'CPF',
        'cnpj' => 'CNPJ',
        'email' => 'EMAIL',
        'phone' => 'TELEFONE',
        'random' => 'CHAVE_ALEATORIA',
    ];
    $tipo = $tipoMap[$pixKeyType] ?? 'CHAVE_ALEATORIA';

    $payload = [
        'valor' => $valor,
        'descricao' => mb_substr(trim($description) !== '' ? $description : 'Pagamento guia GCV', 0, 140),
        'destino' => [
            'chave' => $pixKey,
            'tipo' => $tipo,
        ],
        'idIdempotente' => mb_substr($idempotencyKey, 0, 64),
    ];

    $url = gcv_sicoob_pay_api_base() . '/pagamentos';
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return ['ok' => false, 'error' => 'JSON inválido'];
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'error' => 'curl_init failed'];
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
            'client_id: ' . $cfg['client_id'],
            'x-idempotency-key: ' . $idempotencyKey,
        ],
    ]);

    if (!gcv_sicoob_uses_static_sandbox_token() && !gcv_sicoob_apply_mtls($ch)) {
        curl_close($ch);
        return ['ok' => false, 'error' => 'Certificado mTLS indisponível'];
    }

    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($resp === false) {
        return ['ok' => false, 'error' => 'Erro de rede: ' . $curlErr, 'http' => $code];
    }

    $json = json_decode($resp, true);
    if (!is_array($json)) {
        $json = ['raw' => substr($resp, 0, 800)];
    }

    if ($code >= 200 && $code < 300) {
        $e2e = '';
        if (!empty($json['endToEndId'])) {
            $e2e = (string)$json['endToEndId'];
        } elseif (!empty($json['e2eId'])) {
            $e2e = (string)$json['e2eId'];
        } elseif (!empty($json['pagamento']['endToEndId'])) {
            $e2e = (string)$json['pagamento']['endToEndId'];
        } elseif (!empty($json['data']['endToEndId'])) {
            $e2e = (string)$json['data']['endToEndId'];
        }
        return [
            'ok' => true,
            'endToEndId' => $e2e !== '' ? $e2e : null,
            'raw' => $json,
            'http' => $code,
        ];
    }

    $msg = 'HTTP ' . $code;
    if (!empty($json['mensagem'])) {
        $msg = (string)$json['mensagem'];
    } elseif (!empty($json['message'])) {
        $msg = (string)$json['message'];
    } elseif (!empty($json['errors'][0]['message'])) {
        $msg = (string)$json['errors'][0]['message'];
    }

    return [
        'ok' => false,
        'error' => mb_substr($msg !== '' ? $msg : ('Falha Sicoob HTTP ' . $code), 0, 400),
        'raw' => $json,
        'http' => $code,
    ];
}
