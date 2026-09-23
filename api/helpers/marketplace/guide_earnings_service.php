<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../settings.php';
require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/payout_service.php';
require_once __DIR__ . '/guide_financial_service.php';
require_once __DIR__ . '/../sicoob_pix_pay.php';

/** O repasse e a guiagem só contam se este guia leu o QR do cliente. */
function gcv_guide_sale_confirmed_for(int $guideUserId, array $sale): bool
{
    if (strtoupper((string)($sale['sale_status'] ?? '')) !== GcvSaleStatus::PAID) {
        return false;
    }
    $att = strtolower(trim((string)($sale['attendance_status'] ?? '')));
    if ($att !== 'checked_in') {
        return false;
    }
    if (($sale['payout_status'] ?? '') === GcvPayoutStatus::BLOCKED) {
        return false;
    }
    $scanner = (int)($sale['checked_in_by'] ?? 0);
    if ($scanner > 0) {
        return $scanner === $guideUserId;
    }
    return (int)($sale['guide_user_id'] ?? 0) === $guideUserId;
}

/**
 * Resumo financeiro do guia: todos os passeios (inclusive sem venda).
 *
 * @return array<string,mixed>
 */
function gcv_guide_earnings_dashboard(int $guideUserId): array
{
    gcv_marketplace_ensure_schema();
    $autoRun = gcv_payout_process_due($guideUserId, 3);

    $excStmt = db()->prepare(
        'SELECT e.id, e.date_iso, e.departure_time, e.status, e.price_cents, e.quorum, e.max_people,
                a.title_pt AS attraction_title, c.name AS departure_city_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         WHERE e.guide_user_id = ?
         ORDER BY e.date_iso DESC, e.departure_time DESC'
    );
    $excStmt->execute([$guideUserId]);
    $excursions = $excStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $saleStmt = db()->prepare(
        "SELECT s.id, s.excursion_id, s.reservation_id, s.tourist_name, s.tourist_email,
                s.tourist_phone, s.spots, s.sold_price_cents, s.guide_amount_cents,
                s.platform_revenue_cents, s.sale_status, s.payout_status,
                s.paid_at, s.sold_at, s.scheduled_payout_at, s.excursion_starts_at,
                s.attendance_status, s.checked_in_by, s.guide_user_id
         FROM gcv_sales s
         WHERE s.deleted_at IS NULL AND (s.guide_user_id = ? OR s.checked_in_by = ?)
         ORDER BY s.sold_at DESC"
    );
    $saleStmt->execute([$guideUserId, $guideUserId]);
    $sales = $saleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $payoutStmt = db()->prepare(
        "SELECT sale_id, amount_cents, paid_at, status, end_to_end_id, executed_via
         FROM gcv_sale_payouts
         WHERE guide_user_id = ? AND deleted_at IS NULL"
    );
    $payoutStmt->execute([$guideUserId]);
    $payoutBySale = [];
    foreach ($payoutStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $po) {
        $payoutBySale[(int)$po['sale_id']] = $po;
    }

    $salesByExc = [];
    $orphanSales = [];
    foreach ($sales as $sale) {
        $eid = (int)($sale['excursion_id'] ?? 0);
        if ($eid > 0) {
            $salesByExc[$eid][] = $sale;
        } else {
            $orphanSales[] = $sale;
        }
    }

    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');

    $sumBilled = 0;
    $sumGuide = 0;
    $sumPaidOut = 0;
    $sumPendingOut = 0;
    $sumPeople = 0;
    $toursWithSales = 0;
    $nextPayoutAt = null;

    $tours = [];
    foreach ($excursions as $exc) {
        $eid = (int)$exc['id'];
        $list = $salesByExc[$eid] ?? [];
        $mapped = [];
        $people = 0;
        $guiagem = 0;
        $billed = 0;
        $guide = 0;
        $paidOut = 0;
        $pendingOut = 0;
        foreach ($list as $sale) {
            $row = gcv_guide_earnings_map_sale($sale, $payoutBySale[(int)$sale['id']] ?? null);
            $confirmed = gcv_guide_sale_confirmed_for($guideUserId, $sale);
            $row['in_guiagem'] = $confirmed;
            $mapped[] = $row;
            if ($row['sale_status'] === 'PAID' && (int)($sale['guide_user_id'] ?? 0) === $guideUserId) {
                $people += $row['people'];
            }
            if ($confirmed) {
                $guiagem += $row['people'];
                $billed += $row['sold_price_cents'];
                $guide += $row['guide_amount_cents'];
                if ($row['payout_status'] === GcvPayoutStatus::PAID) {
                    $paidOut += $row['payout_amount_cents'] ?: $row['guide_amount_cents'];
                } else {
                    $pendingOut += $row['guide_amount_cents'];
                    if ($row['scheduled_payout_at'] && ($nextPayoutAt === null || $row['scheduled_payout_at'] < $nextPayoutAt)) {
                        $nextPayoutAt = $row['scheduled_payout_at'];
                    }
                }
            }
        }
        if ($mapped) {
            $toursWithSales++;
        }
        $sumBilled += $billed;
        $sumGuide += $guide;
        $sumPaidOut += $paidOut;
        $sumPendingOut += $pendingOut;
        $sumPeople += $people;

        $dateIso = (string)($exc['date_iso'] ?? '');
        $tours[] = [
            'id' => $eid,
            'date_iso' => $dateIso,
            'departure_time' => substr((string)($exc['departure_time'] ?? ''), 0, 5),
            'attraction_title' => $exc['attraction_title'] ?? '',
            'city' => $exc['departure_city_name'] ?? '',
            'status' => $exc['status'] ?? '',
            'price_cents' => (int)($exc['price_cents'] ?? 0),
            'quorum' => (int)($exc['quorum'] ?? 0),
            'max_people' => (int)($exc['max_people'] ?? 0),
            'upcoming' => $dateIso >= $today && ($exc['status'] ?? '') !== 'cancelled',
            'people' => $people,
            'guiagem_people' => $guiagem,
            'sales_count' => count($mapped),
            'paid_sales' => count(array_filter($mapped, static function ($s) {
                return $s['sale_status'] === 'PAID';
            })),
            'billed_cents' => $billed,
            'guide_cents' => $guide,
            'payout_paid_cents' => $paidOut,
            'payout_pending_cents' => $pendingOut,
            'sales' => $mapped,
        ];
    }

    $ownExc = [];
    foreach ($excursions as $exc) {
        $ownExc[(int)$exc['id']] = true;
    }
    foreach ($salesByExc as $eid => $list) {
        if (!empty($ownExc[(int)$eid])) {
            continue;
        }
        foreach ($list as $sale) {
            $orphanSales[] = $sale;
        }
    }

    if ($orphanSales) {
        $mapped = [];
        $people = 0;
        $guiagem = 0;
        $billed = 0;
        $guide = 0;
        $paidOut = 0;
        $pendingOut = 0;
        foreach ($orphanSales as $sale) {
            $row = gcv_guide_earnings_map_sale($sale, $payoutBySale[(int)$sale['id']] ?? null);
            $confirmed = gcv_guide_sale_confirmed_for($guideUserId, $sale);
            $row['in_guiagem'] = $confirmed;
            $mapped[] = $row;
            if ($row['sale_status'] === 'PAID' && (int)($sale['guide_user_id'] ?? 0) === $guideUserId) {
                $people += $row['people'];
            }
            if ($confirmed) {
                $guiagem += $row['people'];
                $billed += $row['sold_price_cents'];
                $guide += $row['guide_amount_cents'];
                if ($row['payout_status'] === GcvPayoutStatus::PAID) {
                    $paidOut += $row['payout_amount_cents'] ?: $row['guide_amount_cents'];
                } else {
                    $pendingOut += $row['guide_amount_cents'];
                }
            }
        }
        $sumBilled += $billed;
        $sumGuide += $guide;
        $sumPaidOut += $paidOut;
        $sumPendingOut += $pendingOut;
        $sumPeople += $people;
        if ($mapped) {
            $toursWithSales++;
        }
        $tours[] = [
            'id' => 0,
            'date_iso' => '',
            'departure_time' => '',
            'attraction_title' => 'Outras vendas',
            'city' => '',
            'status' => '',
            'price_cents' => 0,
            'quorum' => 0,
            'max_people' => 0,
            'upcoming' => false,
            'people' => $people,
            'guiagem_people' => $guiagem,
            'sales_count' => count($mapped),
            'paid_sales' => count(array_filter($mapped, static function ($s) {
                return $s['sale_status'] === 'PAID';
            })),
            'billed_cents' => $billed,
            'guide_cents' => $guide,
            'payout_paid_cents' => $paidOut,
            'payout_pending_cents' => $pendingOut,
            'sales' => $mapped,
        ];
    }

    return [
        'summary' => [
            'tours_count' => count($excursions),
            'tours_with_sales' => $toursWithSales,
            'tours_without_sales' => max(0, count($excursions) - $toursWithSales),
            'people_total' => $sumPeople,
            'guiagem_people_total' => array_sum(array_map(static function ($t) {
                return (int)($t['guiagem_people'] ?? 0);
            }, $tours)),
            'billed_cents' => $sumBilled,
            'guide_cents' => $sumGuide,
            'payout_paid_cents' => $sumPaidOut,
            'payout_pending_cents' => $sumPendingOut,
            'next_payout_at' => $nextPayoutAt,
            'pix_ready' => gcv_guide_financial_is_ready($guideUserId),
            'pix_verified' => gcv_guide_pix_is_verified($guideUserId),
            'auto_pix' => gcv_sicoob_is_configured(),
            'payout_after_hour' => function_exists('gcv_payout_after_hour') ? gcv_payout_after_hour() : 16,
            'payout_after_minute' => function_exists('gcv_payout_after_hm') ? gcv_payout_after_hm()[1] : 20,
            'payout_after_label' => function_exists('gcv_payout_after_label') ? gcv_payout_after_label() : '16h20',
        ],
        'tours' => $tours,
        'auto_run' => [
            'paid' => (int)($autoRun['paid'] ?? 0),
            'failed' => (int)($autoRun['failed'] ?? 0),
        ],
    ];
}

/**
 * @param array<string,mixed> $sale
 * @param array<string,mixed>|null $payout
 * @return array<string,mixed>
 */
function gcv_guide_earnings_map_sale(array $sale, ?array $payout): array
{
    $name = trim((string)($sale['tourist_name'] ?? ''));
    $email = strtolower(trim((string)($sale['tourist_email'] ?? '')));
    if ($name === '' && $email !== '') {
        $name = explode('@', $email)[0];
    }
    $payoutPaidAt = $payout['paid_at'] ?? null;
    $payoutStatus = (string)($sale['payout_status'] ?? GcvPayoutStatus::PENDING);
    if ($payout && ($payout['status'] ?? '') === GcvPayoutStatus::PAID) {
        $payoutStatus = GcvPayoutStatus::PAID;
    }
    $att = strtolower(trim((string)($sale['attendance_status'] ?? 'pending')));
    return [
        'id' => (int)$sale['id'],
        'reservation_id' => (string)($sale['reservation_id'] ?? ''),
        'name' => $name !== '' ? $name : 'Cliente',
        'email' => $email,
        'people' => max(1, (int)($sale['spots'] ?? 1)),
        'attendance_status' => $att !== '' ? $att : 'pending',
        'in_guiagem' => $att === 'checked_in',
        'sold_price_cents' => (int)($sale['sold_price_cents'] ?? 0),
        'guide_amount_cents' => (int)($sale['guide_amount_cents'] ?? 0),
        'sale_status' => strtoupper((string)($sale['sale_status'] ?? '')),
        'payout_status' => $payoutStatus,
        'paid_at' => $sale['paid_at'] ?? $sale['sold_at'] ?? null,
        'scheduled_payout_at' => $sale['scheduled_payout_at'] ?? null,
        'payout_paid_at' => $payoutPaidAt,
        'payout_amount_cents' => $payout ? (int)($payout['amount_cents'] ?? 0) : 0,
        'end_to_end_id' => $payout['end_to_end_id'] ?? null,
        'executed_via' => $payout['executed_via'] ?? null,
    ];
}
