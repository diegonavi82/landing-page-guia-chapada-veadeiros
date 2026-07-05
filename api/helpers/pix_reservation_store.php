<?php

declare(strict_types=1);

/**
 * Persistência de reservas Pix do carrossel (JSON em disco — Apache + PHP simples).
 */

function gcv_pix_storage_dir(): string
{
    $dir = dirname(__DIR__) . '/storage/pix_reservations';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function gcv_pix_safe_id(string $id): string
{
    return preg_replace('/[^A-Z0-9\-]/', '', strtoupper(trim($id))) ?? '';
}

function gcv_pix_reservation_path(string $reservationId): string
{
    $safe = gcv_pix_safe_id($reservationId);
    if ($safe === '' || !preg_match('/^GCV-[A-Z0-9]{6}$/', $safe)) {
        throw new InvalidArgumentException('Invalid reservation id');
    }
    return gcv_pix_storage_dir() . '/' . $safe . '.json';
}

/** @return array<string, mixed>|null */
function gcv_pix_read_reservation(string $reservationId): ?array
{
    try {
        $path = gcv_pix_reservation_path($reservationId);
    } catch (Throwable $e) {
        return null;
    }
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
function gcv_pix_write_reservation(array $data): bool
{
    $id = gcv_pix_safe_id((string)($data['reservation_id'] ?? ''));
    if ($id === '') {
        return false;
    }
    $data['reservation_id'] = $id;
    $path = gcv_pix_storage_dir() . '/' . $id . '.json';
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    return file_put_contents($path, $json, LOCK_EX) !== false;
}

/** @return 'PENDING'|'PAID'|'EXPIRED' */
function gcv_pix_effective_status(array $reservation): string
{
    $status = strtoupper((string)($reservation['status'] ?? 'PENDING'));
    if ($status === 'PAID') {
        return 'PAID';
    }
    $expires = (string)($reservation['expires_at'] ?? '');
    if ($expires !== '') {
        $ts = strtotime($expires);
        if ($ts !== false && time() > $ts) {
            return 'EXPIRED';
        }
    }
    return 'PENDING';
}

function gcv_pix_mark_paid(string $reservationId, string $source = 'manual'): ?array
{
    $res = gcv_pix_read_reservation($reservationId);
    if (!$res) {
        return null;
    }
    if (gcv_pix_effective_status($res) === 'EXPIRED') {
        return null;
    }
    $res['status'] = 'PAID';
    $res['paid_at'] = gmdate('c');
    $res['paid_source'] = $source;
    if (!gcv_pix_write_reservation($res)) {
        return null;
    }
    return $res;
}

/**
 * Converte correlationID / txid OpenPix em código GCV-XXXXXX quando possível.
 */
function gcv_pix_reservation_id_from_token(string $token): ?string
{
    $token = trim($token);
    if ($token === '') {
        return null;
    }
    $upper = strtoupper($token);
    if (preg_match('/^GCV-[A-Z0-9]{6}$/', $upper)) {
        return gcv_pix_safe_id($upper);
    }
    $alnum = strtoupper(preg_replace('/[^A-Z0-9]/', '', $token) ?? '');
    if (preg_match('/^GCV([A-Z0-9]{6})$/', $alnum, $m)) {
        return 'GCV-' . $m[1];
    }
    if (preg_match('/GCV[- ]?([A-Z0-9]{6})/', $upper, $m)) {
        return 'GCV-' . $m[1];
    }
    return null;
}

/** @return array<string, mixed>|null */
function gcv_pix_find_by_txid(string $txid): ?array
{
    $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', $txid) ?? '', 0, 25);
    if ($txid === '') {
        return null;
    }
    $fromToken = gcv_pix_reservation_id_from_token($txid);
    if ($fromToken) {
        $direct = gcv_pix_read_reservation($fromToken);
        if ($direct) {
            return $direct;
        }
    }
    $dir = gcv_pix_storage_dir();
    foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            continue;
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            continue;
        }
        $stored = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($data['txid'] ?? '')) ?? '', 0, 25);
        if ($stored !== '' && strcasecmp($stored, $txid) === 0) {
            return $data;
        }
    }
    return null;
}

/** @return list<array<string, mixed>> */
function gcv_pix_find_all_by_email(string $email, int $limit = 20): array
{
    $needle = strtolower(trim($email));
    if ($needle === '' || !filter_var($needle, FILTER_VALIDATE_EMAIL)) {
        return [];
    }
    $out = [];
    $dir = gcv_pix_storage_dir();
    foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            continue;
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            continue;
        }
        $stored = strtolower(trim((string)($data['email'] ?? '')));
        if ($stored === '' || !hash_equals($stored, $needle)) {
            continue;
        }
        $out[] = $data;
    }
    usort($out, static function (array $a, array $b): int {
        $ta = strtotime((string)($a['created_at'] ?? '')) ?: 0;
        $tb = strtotime((string)($b['created_at'] ?? '')) ?: 0;
        return $tb <=> $ta;
    });
    if ($limit > 0 && count($out) > $limit) {
        $out = array_slice($out, 0, $limit);
    }
    return $out;
}

function gcv_pix_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [
        'https://www.guiachapadaveadeiros.com',
        'https://guiachapadaveadeiros.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ];
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Accept-Language');
}
