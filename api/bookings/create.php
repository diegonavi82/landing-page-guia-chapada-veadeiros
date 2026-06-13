<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/settings.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

$user = require_role('client');
$data = body_json();

$tourId = (int)($data['tour_id'] ?? 0);
$spots  = max(1, (int)($data['spots'] ?? 1));

if (!$tourId) json_response(false, null, 'tour_id obrigatório', 422);

$stmt = db()->prepare(
    'SELECT id, price_cents, max_spots, spots_taken, status, departure_date, guide_id
     FROM gcv_tours WHERE id = ? AND status = \'approved\' AND departure_date >= CURDATE()'
);
$stmt->execute([$tourId]);
$tour = $stmt->fetch();

if (!$tour) json_response(false, null, 'Passeio não disponível', 404);
if (($tour['max_spots'] - $tour['spots_taken']) < $spots) {
    json_response(false, null, 'Vagas insuficientes', 409);
}

$commissionPct = (float)setting('platform_commission_pct', 5);
$releaseDays   = (int)setting('mp_release_delay_days', 1);
$totalCents    = $tour['price_cents'] * $spots;
$releaseDateTs = strtotime($tour['departure_date']) + ($releaseDays * 86400);
$releaseDate   = date('Y-m-d', $releaseDateTs);

$feeCents    = (int)round($totalCents * ($commissionPct / 100));
$guideCents  = $totalCents - $feeCents;

$pdo = db();
$pdo->prepare(
    'INSERT INTO gcv_bookings (tour_id, client_id, spots, total_cents, commission_pct_applied,
     mp_marketplace_fee_cents, mp_guide_amount_cents, release_date)
     VALUES (?,?,?,?,?,?,?,?)'
)->execute([$tourId, $user['id'], $spots, $totalCents, $commissionPct, $feeCents, $guideCents, $releaseDate]);

$bookingId = (int)$pdo->lastInsertId();

json_response(true, ['booking_id' => $bookingId, 'total_cents' => $totalCents]);
