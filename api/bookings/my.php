<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';

/**
 * Reservas do cliente para o painel.
 * O banco atual não tem as tabelas legadas gcv_bookings/gcv_tours;
 * nesse caso a lista sai das vendas (gcv_sales).
 *
 * @param array<string,mixed> $user
 * @return array{bookings:list<array<string,mixed>>,upcoming:list<array<string,mixed>>}
 */
function gcv_my_bookings(array $user): array
{
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $bookings = gcv_my_bookings_legacy($user, $today);
    if ($bookings === null) {
        $bookings = gcv_my_bookings_from_sales($user);
    }

    $upcoming = array_values(array_filter($bookings, static function ($b) use ($today) {
        return (string)($b['departure_date'] ?? '') >= $today
            && in_array((string)($b['status'] ?? ''), ['pending', 'paid'], true);
    }));

    return [
        'bookings' => $bookings,
        'upcoming' => $upcoming,
    ];
}

/**
 * @param array<string,mixed> $user
 * @return list<array<string,mixed>>|null null quando a tabela legada não existe
 */
function gcv_my_bookings_legacy(array $user, string $today): ?array
{
    try {
        gcv_cms_ensure_schema();
    } catch (Throwable $e) {
        // schema novo segue sem as tabelas antigas
    }

    try {
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
        $stmt->execute([(int)($user['id'] ?? 0)]);
    } catch (Throwable $e) {
        error_log('bookings/my legacy: ' . $e->getMessage());
        return null;
    }

    $bookings = [];
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
    return $bookings;
}

/**
 * @param array<string,mixed> $user
 * @return list<array<string,mixed>>
 */
function gcv_my_bookings_from_sales(array $user): array
{
    try {
        require_once __DIR__ . '/../helpers/marketplace/transfer_service.php';
        $sales = gcv_transfer_list_client_sales($user);
    } catch (Throwable $e) {
        error_log('bookings/my sales: ' . $e->getMessage());
        return [];
    }

    $bookings = [];
    foreach ($sales as $s) {
        $saleStatus = strtoupper((string)($s['sale_status'] ?? ''));
        $status = match ($saleStatus) {
            'PAID' => 'paid',
            'PENDING' => 'pending',
            'CANCELLED', 'REFUNDED' => 'cancelled',
            default => 'pending',
        };
        $bookings[] = [
            'id' => (int)($s['id'] ?? 0),
            'tour_title' => (string)($s['tour_title'] ?? 'Passeio'),
            'departure_date' => (string)($s['date_iso'] ?? ''),
            'departure_time' => (string)($s['departure_time'] ?? ''),
            'guide_name' => (string)($s['guide_display'] ?? $s['guide_name'] ?? ''),
            'total_cents' => (int)($s['sold_price_cents'] ?? 0),
            'status' => $status,
            'lifecycle' => (string)($s['lifecycle'] ?? ''),
            'lifecycle_label' => (string)($s['lifecycle_label'] ?? ''),
            'can_cancel' => false,
            'cancel_no_refund' => false,
        ];
    }
    return $bookings;
}

if (basename((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === 'my.php') {
    header('Content-Type: application/json; charset=utf-8');
    $user = require_auth();
    json_response(true, gcv_my_bookings($user));
}
