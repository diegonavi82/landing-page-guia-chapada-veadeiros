<?php

declare(strict_types=1);

/**
 * Processamento de webhook PIX Sicoob (POST em …/sicoob_webhook/pix).
 *
 * Payload típico: {"pix":[{"txid":"GCVABC123","valor":"150.00","endToEndId":"…",…}]}
 */

require_once __DIR__ . '/pix_reservation_store.php';

/** @return array<string, mixed> */
function gcv_sicoob_cfg(): array
{
    static $cached = null;
    if (is_array($cached)) {
        return $cached;
    }

    if (!function_exists('gcv_load_config')) {
        require_once dirname(__DIR__) . '/db.php';
    }
    $root = gcv_load_config();
    $cfg = is_array($root['sicoob'] ?? null) ? $root['sicoob'] : [];

    $cached = [
        'client_id' => trim((string)($cfg['client_id'] ?? '')),
        'pix_key' => preg_replace('/\D/', '', (string)($cfg['pix_key'] ?? '24354289000105')) ?: '24354289000105',
        'webhook_ips' => is_array($cfg['webhook_ips'] ?? null) ? $cfg['webhook_ips'] : [],
    ];
    return $cached;
}

function gcv_sicoob_webhook_ip_allowed(): bool
{
    $ips = gcv_sicoob_cfg()['webhook_ips'];
    if (!$ips) {
        return true;
    }
    $remote = trim((string)($_SERVER['REMOTE_ADDR'] ?? ''));
    if ($remote === '') {
        return false;
    }
    return in_array($remote, $ips, true);
}

/** @param array<string, mixed> $pixItem */
function gcv_sicoob_pix_item_amount_reais(array $pixItem): ?float
{
    $valor = $pixItem['valor'] ?? null;
    if (is_numeric($valor)) {
        return round((float)$valor, 2);
    }
    if (is_string($valor) && $valor !== '') {
        return round((float)str_replace(',', '.', $valor), 2);
    }
    return null;
}

/** @param array<string, mixed> $pixItem */
function gcv_sicoob_amount_matches(array $reservation, array $pixItem): bool
{
    $paid = gcv_sicoob_pix_item_amount_reais($pixItem);
    if ($paid === null) {
        return true;
    }
    $expected = round((float)($reservation['amount'] ?? 0), 2);
    if ($expected <= 0) {
        return true;
    }
    return abs($expected - $paid) <= 0.01;
}

/** @param array<string, mixed> $pixItem */
function gcv_sicoob_reservation_from_pix_item(array $pixItem): ?string
{
    $txid = trim((string)($pixItem['txid'] ?? $pixItem['txId'] ?? ''));
    if ($txid !== '') {
        $fromTx = gcv_pix_reservation_id_from_token($txid);
        if ($fromTx && gcv_pix_read_reservation($fromTx)) {
            return $fromTx;
        }
        $found = gcv_pix_find_by_txid($txid);
        if ($found && !empty($found['reservation_id'])) {
            return gcv_pix_safe_id((string)$found['reservation_id']);
        }
    }

    foreach (['infoPagador', 'descricao', 'solicitacaoPagador'] as $key) {
        if (!empty($pixItem[$key]) && is_string($pixItem[$key])) {
            $id = gcv_pix_reservation_id_from_token($pixItem[$key]);
            if ($id && gcv_pix_read_reservation($id)) {
                return $id;
            }
        }
    }

    return null;
}

/**
 * @param array<string, mixed> $data
 * @return array{reservation: array<string, mixed>, pix: array<string, mixed>}|null
 */
function gcv_sicoob_match_webhook_payload(array $data): ?array
{
    $items = [];
    if (isset($data['pix']) && is_array($data['pix'])) {
        $items = $data['pix'];
    } elseif (isset($data['endToEndId']) || isset($data['txid']) || isset($data['txId'])) {
        $items = [$data];
    }

    foreach ($items as $pixItem) {
        if (!is_array($pixItem)) {
            continue;
        }
        $reservationId = gcv_sicoob_reservation_from_pix_item($pixItem);
        if ($reservationId === null) {
            continue;
        }
        $reservation = gcv_pix_read_reservation($reservationId);
        if (!$reservation) {
            continue;
        }
        if (gcv_pix_effective_status($reservation) === 'EXPIRED') {
            continue;
        }
        if (!gcv_sicoob_amount_matches($reservation, $pixItem)) {
            continue;
        }
        return ['reservation' => $reservation, 'pix' => $pixItem];
    }

    return null;
}

/** @param array<string, mixed> $data */
function gcv_sicoob_confirm_webhook_payload(array $data): ?array
{
    $match = gcv_sicoob_match_webhook_payload($data);
    if (!$match) {
        return null;
    }

    $reservationId = gcv_pix_safe_id((string)($match['reservation']['reservation_id'] ?? ''));
    if ($reservationId === '') {
        return null;
    }

    if (($match['reservation']['status'] ?? '') === 'PAID') {
        return $match['reservation'];
    }

    $res = gcv_pix_mark_paid($reservationId, 'sicoob_webhook');
    if (!$res) {
        return null;
    }

    $paid = gcv_sicoob_pix_item_amount_reais($match['pix']);
    if ($paid !== null) {
        $res['sicoob_paid_reais'] = $paid;
    }
    $e2e = trim((string)($match['pix']['endToEndId'] ?? ''));
    if ($e2e !== '') {
        $res['sicoob_end_to_end_id'] = $e2e;
    }
    $res['sicoob_webhook_at'] = gmdate('c');
    gcv_pix_write_reservation($res);
    return $res;
}
