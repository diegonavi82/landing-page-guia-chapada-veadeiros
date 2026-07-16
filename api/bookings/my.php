<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();

try {
    gcv_cms_ensure_schema();
} catch (Throwable $e) {
    // ok
}

$stmt = db()->prepare(
    'SELECT b.id, b.spots, b.total_cents, b.status, b.payment_method,
            b.mp_payment_id, b.created_at, b.release_date,
            t.title_pt AS tour_title, t.departure_date, t.departure_time,
            t.meeting_point, t.region, t.cover_url, t.spots_taken, t.quorum, t.max_spots,
            g.name AS guide_name
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_users g ON g.id = t.guide_id
     WHERE b.client_id = ?
     ORDER BY t.departure_date ASC, b.created_at DESC'
);
$stmt->execute([$user['id']]);
$bookings = [];
$today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $b) {
    $quorum = max(4, (int)($b['quorum'] ?? 4));
    $life = gcv_resolve_excursion_lifecycle([
        'status' => ($b['status'] === 'cancelled') ? 'cancelled' : 'published',
        'date_iso' => $b['departure_date'],
        'booked_people' => (int)($b['spots_taken'] ?? 0),
        'quorum' => $quorum,
    ]);
    if ($b['status'] === 'cancelled') {
        $life = 'cancelada';
    }
    $b['lifecycle'] = $life;
    $b['lifecycle_label'] = gcv_excursion_lifecycle_label($life);
    $b['can_cancel'] = in_array($b['status'], ['pending', 'paid'], true)
        && in_array($life, ['em_formacao', 'confirmada'], true)
        && (string)$b['departure_date'] >= $today;
    $b['cancel_no_refund'] = $life === 'confirmada';
    $bookings[] = $b;
}

$upcoming = array_values(array_filter($bookings, static function ($b) use ($today) {
    return (string)$b['departure_date'] >= $today
        && in_array($b['status'], ['pending', 'paid'], true);
}));

json_response(true, [
    'bookings' => $bookings,
    'upcoming' => $upcoming,
]);
