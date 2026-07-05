<?php

declare(strict_types=1);

/**
 * Webhook OpenPix — confirma reserva Pix automaticamente.
 *
 * Cole no painel OpenPix/Woovi:
 *   https://www.guiachapadaveadeiros.com/api/openpix_webhook.php
 *
 * Eventos tratados: CHARGE_COMPLETED, TRANSACTION_RECEIVED (inclui QR estático).
 * Identifica a reserva pelo correlationID ou txid (GCV-XXXXXX / GCVXXXXXX).
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/openpix_webhook.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

$cfg = gcv_load_config();
$publicKey = trim((string)($cfg['openpix_webhook_public_key'] ?? ''));
$signature = gcv_openpix_signature_header();

if ($publicKey !== '') {
    if ($signature === '' || !gcv_openpix_verify_signature($raw, $signature, $publicKey)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid webhook signature']);
        exit;
    }
} elseif ($signature !== '') {
    error_log('openpix_webhook: assinatura recebida, mas openpix_webhook_public_key não configurado em config.local.php');
}

$event = strtoupper(trim((string)($data['event'] ?? '')));

if ($event === 'OPENPIX:CHARGE_EXPIRED') {
    echo json_encode(['success' => true, 'ignored' => true, 'event' => $event]);
    exit;
}

if (!gcv_openpix_is_paid_event($event)) {
    echo json_encode(['success' => true, 'ignored' => true, 'event' => $event ?: 'UNKNOWN']);
    exit;
}

$reservationId = gcv_openpix_extract_reservation_id($data);
if ($reservationId === null) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Could not map OpenPix payload to reservation (correlationID/txid)',
        'event' => $event,
    ]);
    exit;
}

$existing = gcv_pix_read_reservation($reservationId);
if (!$existing) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Reservation not found',
        'reservation_id' => $reservationId,
    ]);
    exit;
}

if (($existing['status'] ?? '') === 'PAID') {
    echo json_encode([
        'success' => true,
        'status' => 'PAID',
        'reservation_id' => $reservationId,
        'already_paid' => true,
    ]);
    exit;
}

if (gcv_pix_effective_status($existing) === 'EXPIRED') {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'status' => 'EXPIRED',
        'reservation_id' => $reservationId,
    ]);
    exit;
}

$paidReais = gcv_openpix_amount_reais($data);
if (!gcv_openpix_amount_matches($existing, $paidReais)) {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'message' => 'Amount mismatch',
        'reservation_id' => $reservationId,
        'expected' => $existing['amount'] ?? null,
        'received' => $paidReais,
    ]);
    exit;
}

$res = gcv_pix_mark_paid($reservationId, 'openpix');
if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not confirm reservation']);
    exit;
}

if ($paidReais !== null) {
    $res['openpix_paid_reais'] = $paidReais;
}
if ($event !== '') {
    $res['openpix_event'] = $event;
}
$endToEnd = gcv_openpix_array_get($data, ['pix', 'endToEndId']);
if (is_string($endToEnd) && $endToEnd !== '') {
    $res['openpix_end_to_end_id'] = $endToEnd;
}
gcv_pix_write_reservation($res);

echo json_encode([
    'success' => true,
    'status' => 'PAID',
    'reservation_id' => $reservationId,
    'paid_at' => $res['paid_at'] ?? null,
    'event' => $event,
]);
