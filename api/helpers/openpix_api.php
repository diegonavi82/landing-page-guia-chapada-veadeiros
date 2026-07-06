<?php

declare(strict_types=1);

/**
 * Consulta OpenPix/Woovi para confirmar Pix estático quando o webhook falha ou atrasa.
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/pix_reservation_store.php';
require_once __DIR__ . '/openpix_webhook.php';

function gcv_openpix_app_id(): string
{
    $cfg = gcv_load_config();
    return trim((string)($cfg['openpix_app_id'] ?? ''));
}

/** @return array<string, mixed>|null */
function gcv_openpix_api_get(string $path): ?array
{
    $appId = gcv_openpix_app_id();
    if ($appId === '') {
        return null;
    }

    $url = 'https://api.openpix.com.br' . $path;
    if (!function_exists('curl_init')) {
        return null;
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return null;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: ' . $appId,
        ],
    ]);

    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $code < 200 || $code >= 300) {
        return null;
    }

    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

/** @param array<string, mixed> $reservation */
function gcv_openpix_transaction_matches_reservation(array $tx, array $reservation): bool
{
    $reservationId = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    if ($reservationId === '') {
        return false;
    }

    $expectedCents = (int)round(((float)($reservation['amount'] ?? 0)) * 100);
    $value = $tx['value'] ?? ($tx['amount'] ?? null);
    if (is_numeric($value)) {
        $paidCents = (int)$value;
        if ($expectedCents > 0 && abs($expectedCents - $paidCents) > 1) {
            return false;
        }
    }

    $txType = strtoupper(trim((string)($tx['type'] ?? 'PAYMENT')));
    if ($txType !== '' && !in_array($txType, ['PAYMENT', 'CREDIT'], true)) {
        return false;
    }

    $candidates = [];
    foreach (['infoPagador', 'comment', 'description', 'correlationID', 'transactionID', 'endToEndId'] as $key) {
        if (!empty($tx[$key]) && is_string($tx[$key])) {
            $candidates[] = trim($tx[$key]);
        }
    }
    gcv_openpix_collect_strings($tx, $candidates);

    foreach ($candidates as $candidate) {
        $id = gcv_pix_reservation_id_from_token($candidate);
        if ($id !== null && hash_equals($id, $reservationId)) {
            return true;
        }
    }

    $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation['txid'] ?? '')) ?? '', 0, 25);
    if ($txid !== '') {
        foreach ($candidates as $candidate) {
            $norm = substr(preg_replace('/[^A-Za-z0-9]/', '', $candidate) ?? '', 0, 25);
            if ($norm !== '' && strcasecmp($norm, $txid) === 0) {
                return true;
            }
        }
    }

    return false;
}

/** @param array<string, mixed> $payload */
function gcv_openpix_scan_transactions_payload(array $payload, array $reservation): bool
{
    $lists = [];
    if (isset($payload['transactions']) && is_array($payload['transactions'])) {
        $lists[] = $payload['transactions'];
    }
    if (isset($payload['transaction']) && is_array($payload['transaction'])) {
        $lists[] = [$payload['transaction']];
    }

    foreach ($lists as $transactions) {
        foreach ($transactions as $tx) {
            if (!is_array($tx)) {
                continue;
            }
            if (gcv_openpix_transaction_matches_reservation($tx, $reservation)) {
                return true;
            }
        }
    }

    return false;
}

/** @param array<string, mixed> $reservation */
function gcv_openpix_should_poll(array $reservation): bool
{
    $last = strtotime((string)($reservation['openpix_last_poll_at'] ?? ''));
    if ($last !== false && (time() - $last) < 4) {
        return false;
    }
    return true;
}

/** @param array<string, mixed> $reservation */
function gcv_openpix_mark_poll_attempt(array $reservation): void
{
    $reservation['openpix_last_poll_at'] = gmdate('c');
    gcv_pix_write_reservation($reservation);
}

/**
 * Tenta confirmar reserva consultando a API OpenPix (fallback ao webhook).
 *
 * @param array<string, mixed> $reservation
 * @return array<string, mixed>|null
 */
function gcv_openpix_try_confirm_reservation(array $reservation): ?array
{
    if (gcv_openpix_app_id() === '') {
        return null;
    }

    $reservationId = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    if ($reservationId === '' || gcv_pix_effective_status($reservation) !== 'PENDING') {
        return null;
    }

    if (!gcv_openpix_should_poll($reservation)) {
        return null;
    }

    gcv_openpix_mark_poll_attempt($reservation);

    $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation['txid'] ?? '')) ?? '', 0, 25);
    if ($txid !== '') {
        $direct = gcv_openpix_api_get('/api/v1/transaction/' . rawurlencode($txid));
        if ($direct && gcv_openpix_scan_transactions_payload($direct, $reservation)) {
            return gcv_openpix_mark_paid_if_matches($reservationId, $reservation);
        }
    }

    $createdTs = strtotime((string)($reservation['created_at'] ?? ''));
    if ($createdTs === false) {
        $createdTs = time() - 900;
    }
    $start = gmdate('Y-m-d\TH:i:s\Z', max(0, $createdTs - 120));
    $end = gmdate('Y-m-d\TH:i:s\Z', time() + 120);
    $query = '/api/v1/transaction?start=' . rawurlencode($start)
        . '&end=' . rawurlencode($end)
        . '&type=' . rawurlencode('PAYMENT');
    $list = gcv_openpix_api_get($query);
    if ($list && gcv_openpix_scan_transactions_payload($list, $reservation)) {
        return gcv_openpix_mark_paid_if_matches($reservationId, $reservation);
    }

    return null;
}

/** @param array<string, mixed> $reservation */
function gcv_openpix_mark_paid_if_matches(string $reservationId, array $reservation): ?array
{
    $paidReais = round((float)($reservation['amount'] ?? 0), 2);
    if (!gcv_openpix_amount_matches($reservation, $paidReais > 0 ? $paidReais : null)) {
        return null;
    }

    $res = gcv_pix_mark_paid($reservationId, 'openpix_poll');
    if (!$res) {
        return null;
    }

    $res['openpix_poll_at'] = gmdate('c');
    gcv_pix_write_reservation($res);
    return $res;
}
