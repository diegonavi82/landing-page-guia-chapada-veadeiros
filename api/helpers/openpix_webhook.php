<?php

declare(strict_types=1);

/**
 * Helpers para webhook nativo OpenPix (sem n8n).
 */

/** @return list<string> */
function gcv_openpix_paid_events(): array
{
    return [
        'OPENPIX:CHARGE_COMPLETED',
        'OPENPIX:CHARGE_COMPLETED_NOT_SAME_CUSTOMER_PAYER',
        'OPENPIX:TRANSACTION_RECEIVED',
    ];
}

function gcv_openpix_is_paid_event(string $event): bool
{
    return in_array(strtoupper(trim($event)), gcv_openpix_paid_events(), true);
}

function gcv_openpix_signature_header(): string
{
    $candidates = [
        'HTTP_X_WEBHOOK_SIGNATURE',
        'HTTP_X_OPENPIX_SIGNATURE',
        'HTTP_X_WOOVI_SIGNATURE',
    ];
    foreach ($candidates as $key) {
        $value = trim((string)($_SERVER[$key] ?? ''));
        if ($value !== '') {
            return $value;
        }
    }
    return '';
}

function gcv_openpix_verify_signature(string $payload, string $signatureBase64, string $publicKeyBase64): bool
{
    if ($signatureBase64 === '' || $publicKeyBase64 === '') {
        return false;
    }
    $publicKeyPem = base64_decode($publicKeyBase64, true);
    if ($publicKeyPem === false || $publicKeyPem === '') {
        return false;
    }
    $signature = base64_decode($signatureBase64, true);
    if ($signature === false || $signature === '') {
        return false;
    }
    $key = openssl_pkey_get_public($publicKeyPem);
    if ($key === false) {
        return false;
    }
    $verify = openssl_verify($payload, $signature, $key, OPENSSL_ALGO_SHA256);
    return $verify === 1;
}

/** @param list<int|string> $path */
function gcv_openpix_array_get(array $data, array $path): mixed
{
    $cur = $data;
    foreach ($path as $segment) {
        if (!is_array($cur) || !array_key_exists($segment, $cur)) {
            return null;
        }
        $cur = $cur[$segment];
    }
    return $cur;
}

function gcv_openpix_string_candidates(array $data): array
{
    $paths = [
        ['charge', 'correlationID'],
        ['charge', 'comment'],
        ['charge', 'identifier'],
        ['charge', 'transactionID'],
        ['charge', 'paymentMethods', 'pix', 'txId'],
        ['charge', 'paymentMethods', 'pix', 'transactionID'],
        ['charge', 'paymentMethods', 'pix', 'identifier'],
        ['pix', 'infoPagador'],
        ['pix', 'transactionID'],
        ['pix', 'charge', 'correlationID'],
        ['pix', 'charge', 'comment'],
        ['pix', 'charge', 'identifier'],
        ['pix', 'charge', 'transactionID'],
        ['pix', 'charge', 'paymentMethods', 'pix', 'txId'],
        ['pixQrCode', 'correlationID'],
        ['pixQrCode', 'identifier'],
        ['payment', 'correlationID'],
        ['payment', 'comment'],
    ];
    $out = [];
    foreach ($paths as $path) {
        $value = gcv_openpix_array_get($data, $path);
        if (is_string($value) && trim($value) !== '') {
            $out[] = trim($value);
        }
    }
    foreach (['charge', 'pix'] as $root) {
        $brCode = gcv_openpix_array_get($data, [$root, 'brCode']);
        if (is_string($brCode) && $brCode !== '') {
            $out[] = $brCode;
            $txid = gcv_openpix_txid_from_brcode($brCode);
            if ($txid !== null) {
                $out[] = $txid;
            }
        }
    }
    gcv_openpix_collect_strings($data, $out);
    return array_values(array_unique($out));
}

/** @param list<string> $out */
function gcv_openpix_collect_strings(mixed $node, array &$out, int $depth = 0): void
{
    if ($depth > 8) {
        return;
    }
    if (is_string($node)) {
        if (preg_match('/GCV[- ]?[A-Z0-9]{6}/i', $node)) {
            $out[] = $node;
        }
        return;
    }
    if (!is_array($node)) {
        return;
    }
    foreach ($node as $value) {
        gcv_openpix_collect_strings($value, $out, $depth + 1);
    }
}

function gcv_openpix_txid_from_brcode(string $brCode): ?string
{
    if (!preg_match('/62(\d{2})/', $brCode, $lenMatch, PREG_OFFSET_CAPTURE)) {
        return null;
    }
    $len = (int)$lenMatch[1][0];
    $start = $lenMatch[0][1] + strlen($lenMatch[0][0]);
    $block = substr($brCode, $start, $len);
    if ($block === false || $block === '') {
        return null;
    }
    if (!preg_match('/05(\d{2})([0-9A-Za-z*]{1,25})/', $block, $tx)) {
        return null;
    }
    $value = trim($tx[2]);
    return $value !== '' && $value !== '***' ? $value : null;
}

function gcv_openpix_extract_reservation_id(array $data): ?string
{
    foreach (gcv_openpix_string_candidates($data) as $candidate) {
        $id = gcv_pix_reservation_id_from_token($candidate);
        if ($id !== null && gcv_pix_read_reservation($id)) {
            return $id;
        }
        $found = gcv_pix_find_by_txid($candidate);
        if ($found && !empty($found['reservation_id'])) {
            return gcv_pix_safe_id((string)$found['reservation_id']);
        }
    }
    return null;
}

function gcv_openpix_amount_reais(array $data): ?float
{
    $paths = [
        ['charge', 'value'],
        ['pix', 'value'],
        ['pix', 'charge', 'value'],
        ['transaction', 'value'],
    ];
    foreach ($paths as $path) {
        $value = gcv_openpix_array_get($data, $path);
        if (is_numeric($value)) {
            return round(((float)$value) / 100, 2);
        }
    }
    return null;
}

function gcv_openpix_amount_matches(array $reservation, ?float $paidReais): bool
{
    if ($paidReais === null) {
        return true;
    }
    $expected = round((float)($reservation['amount'] ?? 0), 2);
    if ($expected <= 0) {
        return true;
    }
    return abs($expected - $paidReais) <= 0.01;
}
