<?php
declare(strict_types=1);

/**
 * Guia lê o QR da reserva e confirma presença do grupo.
 * POST { reservation_id | qr_text }
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';
require_once __DIR__ . '/../helpers/notify_ops.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$user = require_role('guide');
require_once __DIR__ . '/../helpers/email_verify.php';
gcv_require_guide_approved($user);
gcv_marketplace_ensure_schema();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(false, null, 'Method not allowed', 405);
}

$raw = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($raw)) {
    json_response(false, null, 'JSON inválido', 400);
}

$code = gcv_ops_extract_code((string)($raw['reservation_id'] ?? $raw['qr_text'] ?? $raw['code'] ?? ''));
if ($code === '') {
    json_response(false, null, 'QR / código da reserva inválido', 422);
}

$guideId = (int)$user['id'];
$stmt = db()->prepare(
    "SELECT * FROM gcv_sales WHERE UPPER(reservation_id) = ? AND deleted_at IS NULL LIMIT 1"
);
$stmt->execute([$code]);
$sale = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$sale) {
    json_response(false, null, 'Reserva não encontrada', 404);
}
if ((int)($sale['guide_user_id'] ?? 0) !== $guideId && !gcv_ops_guide_can_checkin($guideId, $sale)) {
    json_response(false, null, 'Esta reserva não é da sua saída', 403);
}
if (($sale['sale_status'] ?? '') !== GcvSaleStatus::PAID) {
    json_response(false, null, 'Reserva não está paga', 409);
}

$att = strtolower(trim((string)($sale['attendance_status'] ?? 'pending')));
if ($att === 'checked_in' && !empty($sale['checked_in_at'])) {
    json_response(true, [
        'already' => true,
        'reservation_id' => $code,
        'checked_in_at' => $sale['checked_in_at'],
        'tourist_name' => $sale['tourist_name'] ?? '',
        'spots' => (int)($sale['spots'] ?? 1),
        'message' => 'Presença já confirmada',
    ]);
}

$win = gcv_ops_checkin_window($sale);
if (!$win['ok']) {
    json_response(false, null, $win['error'], 409);
}

$payoutDone = ($sale['payout_status'] ?? '') === GcvPayoutStatus::PAID;
$restoreSql = '';
$restoreParams = [$guideId, (int)$sale['id']];
if (!$payoutDone && $att === 'no_show') {
    $origGuide = (int)($sale['guide_amount_original_cents'] ?? 0);
    $origPlat = (int)($sale['platform_revenue_original_cents'] ?? 0);
    if ($origGuide > 0) {
        $restoreSql = ', guide_amount_cents = ?, platform_revenue_cents = ?';
        $restoreParams = [$guideId, $origGuide, $origPlat, (int)$sale['id']];
    }
}
db()->prepare(
    "UPDATE gcv_sales
     SET attendance_status = 'checked_in', checked_in_at = NOW(), checked_in_by = ?{$restoreSql}
     WHERE id = ?"
)->execute($restoreParams);

$sale['attendance_status'] = 'checked_in';
$sale['checked_in_at'] = gmdate('c');
$exc = gcv_ops_load_excursion((int)($sale['excursion_id'] ?? 0)) ?: [];
gcv_ops_notify_checkin($sale, $exc, $guideId);

json_response(true, [
    'reservation_id' => $code,
    'tourist_name' => $sale['tourist_name'] ?? '',
    'spots' => (int)($sale['spots'] ?? 1),
    'sold_price_cents' => (int)($sale['sold_price_cents'] ?? 0),
    'attendance_status' => 'checked_in',
    'message' => 'Presença confirmada',
]);
