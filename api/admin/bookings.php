<?php
declare(strict_types=1);

/**
 * Admin — todas as reservas (vendas PIX / marketplace + legado gcv_bookings).
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/pix_reservation_store.php';

header('Content-Type: application/json; charset=utf-8');

require_admin();
try {
    gcv_marketplace_ensure_schema();
} catch (Throwable $e) {
    error_log('admin bookings schema: ' . $e->getMessage());
}

$statusFilter = strtoupper(trim((string)($_GET['status'] ?? '')));
$limit = min(200, max(1, (int)($_GET['limit'] ?? 100)));

/** @param array<string,mixed> $row */
function gcv_admin_booking_row(array $row): array
{
    $status = strtolower((string)($row['status'] ?? ''));
    if ($status === 'paid') {
        $status = 'paid';
    } elseif ($status === 'cancelled' || $status === 'canceled') {
        $status = 'cancelled';
    } elseif ($status === 'refunded') {
        $status = 'refunded';
    } elseif ($status === 'pending') {
        $status = 'pending';
    }
    return [
        'id' => $row['id'] ?? null,
        'reservation_id' => $row['reservation_id'] ?? null,
        'spots' => (int)($row['spots'] ?? 1),
        'total_cents' => (int)($row['total_cents'] ?? 0),
        'platform_revenue_cents' => isset($row['platform_revenue_cents']) && $row['platform_revenue_cents'] !== null && $row['platform_revenue_cents'] !== ''
            ? (int)$row['platform_revenue_cents']
            : null,
        'guide_amount_cents' => isset($row['guide_amount_cents']) && $row['guide_amount_cents'] !== null && $row['guide_amount_cents'] !== ''
            ? (int)$row['guide_amount_cents']
            : null,
        'payout_status' => $row['payout_status'] ?? null,
        'with_transport' => !empty($row['with_transport']),
        'status' => $status ?: 'pending',
        'created_at' => $row['created_at'] ?? null,
        'tour_title' => $row['tour_title'] ?? 'Passeio',
        'client_name' => $row['client_name'] ?? '—',
        'client_email' => $row['client_email'] ?? '',
        'guide_name' => $row['guide_name'] ?? '—',
        'source' => $row['source'] ?? 'sale',
    ];
}

$rows = [];
$seen = [];

try {
    $salesCols = gcv_marketplace_column_map(db(), 'gcv_sales') ?: [];
    $excCols = gcv_marketplace_column_map(db(), 'gcv_excursions') ?: [];
    $saleTransportSql = isset($salesCols['include_transport'])
        ? 's.include_transport AS sale_include_transport,'
        : 'NULL AS sale_include_transport,';
    $excTransportSql = isset($excCols['include_transport'])
        ? 'e.include_transport,'
        : 'NULL AS include_transport,';
    $excOfferSql = isset($excCols['offer_transport'])
        ? 'e.offer_transport,'
        : 'NULL AS offer_transport,';
    $excPriceSql = isset($excCols['price_cents'])
        ? 'e.price_cents, e.price_transport_cents,'
        : 'NULL AS price_cents, NULL AS price_transport_cents,';
    $sql =
        'SELECT s.id, s.reservation_id, s.spots, s.sold_price_cents AS total_cents,
                s.guide_amount_cents, s.platform_revenue_cents, s.payout_status,
                s.unit_price_cents, ' . $saleTransportSql . '
                ' . $excTransportSql . ' ' . $excOfferSql . ' ' . $excPriceSql . '
                s.sale_status AS status,
                COALESCE(s.paid_at, s.sold_at, s.created_at) AS created_at,
                COALESCE(NULLIF(s.excursion_title, \'\'), a.title_pt, \'Passeio\') AS tour_title,
                COALESCE(NULLIF(s.tourist_name, \'\'), s.tourist_email, \'—\') AS client_name,
                s.tourist_email AS client_email,
                COALESCE(NULLIF(s.guide_name, \'\'), ug.name, \'—\') AS guide_name
         FROM gcv_sales s
         LEFT JOIN gcv_excursions e ON e.id = s.excursion_id
         LEFT JOIN gcv_attractions a ON a.id = COALESCE(s.attraction_id, e.attraction_id)
         LEFT JOIN gcv_users ug ON ug.id = s.guide_user_id
         WHERE s.deleted_at IS NULL';
    $params = [];
    if (in_array($statusFilter, ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'DISPUTED'], true)) {
        $sql .= ' AND s.sale_status = ?';
        $params[] = $statusFilter;
    }
    $sql .= ' ORDER BY COALESCE(s.paid_at, s.sold_at, s.created_at) DESC LIMIT ' . (int)$limit;
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
        $r['source'] = 'sale';
        $rid = strtoupper(trim((string)($r['reservation_id'] ?? '')));
        if ($rid !== '') {
            $seen[$rid] = true;
        }
        $pix = $rid !== '' ? gcv_pix_read_reservation($rid) : null;
        $r['with_transport'] = gcv_sale_row_has_transport($r, $pix);
        $rows[] = gcv_admin_booking_row($r);
    }
} catch (Throwable $e) {
    error_log('admin bookings sales: ' . $e->getMessage());
}

try {
    $dir = gcv_pix_storage_dir();
    foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            continue;
        }
        $res = json_decode($raw, true);
        if (!is_array($res)) {
            continue;
        }
        $rid = strtoupper(trim((string)($res['reservation_id'] ?? '')));
        if ($rid === '' || isset($seen[$rid])) {
            continue;
        }
        $st = gcv_pix_effective_status($res);
        if ($statusFilter !== '' && strtoupper($st) !== $statusFilter) {
            continue;
        }
        $title = (string)($res['destino'] ?? $res['title'] ?? $res['attraction_title'] ?? '');
        if ($title === '' && !empty($res['trips']) && is_array($res['trips'])) {
            $first = $res['trips'][0] ?? [];
            $title = (string)($first['title'] ?? $first['title_pt'] ?? $first['cartId'] ?? '');
        }
        if ($title === '') {
            $title = (string)($res['cart_id'] ?? $res['cartId'] ?? 'Passeio');
        }
        $amount = (float)($res['amount'] ?? 0);
        $created = $res['paid_at'] ?? $res['created_at'] ?? null;
        if (is_string($created) && preg_match('/^\d{4}-\d{2}-\d{2}/', $created)) {
            $created = substr($created, 0, 19);
            $created = str_replace('T', ' ', $created);
        }
        $seen[$rid] = true;
        $spots = (int)($res['qty'] ?? $res['people'] ?? $res['spots'] ?? 0);
        if ($spots < 1 && !empty($res['trips']) && is_array($res['trips'])) {
            foreach ($res['trips'] as $t) {
                $spots += max(1, (int)($t['qty'] ?? 1));
            }
        }
        if ($spots < 1) {
            $spots = 1;
        }
        $guideName = (string)($res['guide_name'] ?? '');
        if ($guideName === '' && !empty($res['trips'][0]['guiaNome'])) {
            $guideName = (string)$res['trips'][0]['guiaNome'];
        }
        $rows[] = gcv_admin_booking_row([
            'id' => $rid,
            'reservation_id' => $rid,
            'spots' => $spots,
            'total_cents' => (int)round($amount * 100),
            'platform_revenue_cents' => $res['platform_revenue_cents'] ?? null,
            'guide_amount_cents' => $res['guide_amount_cents'] ?? null,
            'status' => $st,
            'created_at' => $created,
            'tour_title' => $title,
            'client_name' => $res['name'] ?? $res['nome'] ?? $res['email'] ?? '—',
            'client_email' => $res['email'] ?? '',
            'guide_name' => $guideName !== '' ? $guideName : '—',
            'source' => 'pix',
            'with_transport' => gcv_reservation_has_transport($res),
        ]);
    }
} catch (Throwable $e) {
    error_log('admin bookings pix: ' . $e->getMessage());
}

try {
    $legacy = db()->query(
        'SELECT b.id, b.spots, b.total_cents, b.status, b.created_at,
                b.mp_marketplace_fee_cents AS platform_revenue_cents,
                b.mp_guide_amount_cents AS guide_amount_cents,
                t.title_pt AS tour_title, c.name AS client_name, c.email AS client_email,
                g.name AS guide_name
         FROM gcv_bookings b
         JOIN gcv_tours t ON t.id = b.tour_id
         JOIN gcv_users c ON c.id = b.client_id
         JOIN gcv_users g ON g.id = t.guide_id
         ORDER BY b.created_at DESC
         LIMIT 50'
    );
    if ($legacy) {
        foreach ($legacy->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $r['source'] = 'legacy';
            $rows[] = gcv_admin_booking_row($r);
        }
    }
} catch (Throwable $e) {
    // tabela legado pode não existir
}

usort($rows, static function ($a, $b) {
    return strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? ''));
});

json_response(true, ['bookings' => array_slice($rows, 0, $limit)]);
