<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/sicoob_api.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

function gcv_pix_json_error(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    gcv_pix_json_error(400, 'Invalid JSON');
}

$reservationId = gcv_pix_safe_id((string)($data['reservation_id'] ?? ''));
if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
    gcv_pix_json_error(422, 'Invalid reservation_id');
}

$amount = (float)($data['amount'] ?? 0);
if (!is_finite($amount) || $amount <= 0) {
    gcv_pix_json_error(422, 'Invalid amount');
}

$expiresIn = (int)($data['expires_in'] ?? 480);
$expiresIn = max(60, min(3600, $expiresIn));

$existing = gcv_pix_read_reservation($reservationId);
if ($existing && gcv_pix_effective_status($existing) === 'PAID') {
    echo json_encode([
        'success' => true,
        'status' => 'PAID',
        'reservation_id' => $reservationId,
        'brcode' => (string)($existing['brcode'] ?? ''),
        'txid' => (string)($existing['txid'] ?? ''),
    ]);
    exit;
}

// Reusa cobrança dinâmica já criada (mesmo QR) se ainda pendente
if (
    $existing
    && gcv_pix_effective_status($existing) === 'PENDING'
    && !empty($existing['brcode'])
    && !empty($existing['txid'])
) {
    echo json_encode([
        'success' => true,
        'status' => 'PENDING',
        'reservation_id' => $reservationId,
        'expires_at' => $existing['expires_at'] ?? null,
        'brcode' => (string)$existing['brcode'],
        'txid' => (string)$existing['txid'],
        'pix_mode' => (string)($existing['pix_mode'] ?? 'sicoob_cob'),
    ]);
    exit;
}

$txid = gcv_sicoob_txid_from_reservation_id($reservationId);
$pixMode = 'static_fallback';
$brcode = '';
$cobError = null;

if (gcv_sicoob_is_configured()) {
    $payerRequest = trim((string)($data['description'] ?? ''));
    if ($payerRequest === '') {
        $payerRequest = $reservationId . ' Guia Chapada Veadeiros';
    }
    $cob = gcv_sicoob_create_cob($reservationId, $amount, $expiresIn, $payerRequest);
    if (!empty($cob['ok']) && !empty($cob['brcode'])) {
        $txid = (string)$cob['txid'];
        $brcode = (string)$cob['brcode'];
        $pixMode = 'sicoob_cob';
    } else {
        $cobError = [
            'error' => $cob['error'] ?? 'cob_failed',
            'http' => $cob['http'] ?? null,
            'detail' => $cob['detail'] ?? null,
        ];
    }
}

$record = [
    'reservation_id' => $reservationId,
    'status' => 'PENDING',
    'amount' => round($amount, 2),
    'txid' => $txid,
    'brcode' => $brcode,
    'pix_mode' => $pixMode,
    'locale' => in_array($data['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? $data['locale'] : 'pt',
    'trips' => is_array($data['trips'] ?? null) ? $data['trips'] : [],
    'created_at' => gmdate('c'),
    'expires_at' => gmdate('c', time() + $expiresIn),
    'paid_at' => null,
    'paid_source' => null,
    'ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
];
if ($cobError) {
    $record['sicoob_cob_error'] = $cobError;
}

$inclExclRaw = $data['incl_excl'] ?? $data['inclExcl'] ?? null;
if (is_array($inclExclRaw)) {
    $incl = [];
    $excl = [];
    if (is_array($inclExclRaw['incl'] ?? null)) {
        foreach ($inclExclRaw['incl'] as $item) {
            $s = trim((string) $item);
            if ($s !== '') {
                $incl[] = mb_substr($s, 0, 240);
            }
        }
    }
    if (is_array($inclExclRaw['excl'] ?? null)) {
        foreach ($inclExclRaw['excl'] as $item) {
            $s = trim((string) $item);
            if ($s !== '') {
                $excl[] = mb_substr($s, 0, 240);
            }
        }
    }
    if ($incl || $excl) {
        $record['incl_excl'] = ['incl' => $incl, 'excl' => $excl];
    }
}

if (is_array($data['packages'] ?? null) && $data['packages']) {
    $record['packages'] = $data['packages'];
}

$clientEmail = trim((string)($data['email'] ?? ''));
if ($clientEmail !== '' && filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
    $record['email'] = strtolower($clientEmail);
}

$clientPhone = trim((string)($data['phone'] ?? $data['telefone'] ?? ''));
if ($clientPhone !== '') {
    $phoneDigits = preg_replace('/\D+/', '', $clientPhone) ?? '';
    if (strlen($phoneDigits) >= 10 && strlen($phoneDigits) <= 13) {
        $record['phone'] = $clientPhone;
    }
}

if (!gcv_pix_write_reservation($record)) {
    gcv_pix_json_error(500, 'Could not save reservation');
}

$out = [
    'success' => true,
    'status' => 'PENDING',
    'reservation_id' => $reservationId,
    'expires_at' => $record['expires_at'],
    'txid' => $txid,
    'brcode' => $brcode,
    'pix_mode' => $pixMode,
];
if ($pixMode !== 'sicoob_cob') {
    $out['warning'] = 'sicoob_cob_unavailable_using_static_fallback';
}
echo json_encode($out);
