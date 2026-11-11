<?php
declare(strict_types=1);

/**
 * Compra de excursão no catálogo (roteiro-…-excursao-…) abre uma saída
 * publicada, com quórum 4 e sem guia. O guia só entra quando o grupo confirma.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/marketplace_schema.php';
require_once __DIR__ . '/private_departure.php';

/**
 * Junta trips e packages. O recibo por e-mail apaga o cartId do trip.
 *
 * @param array<string,mixed> $reservation
 * @return list<array<string,mixed>>
 */
function gcv_catalog_source_rows(array $reservation): array
{
    $trips = is_array($reservation['trips'] ?? null) ? array_values($reservation['trips']) : [];
    $packages = is_array($reservation['packages'] ?? null) ? array_values($reservation['packages']) : [];
    $n = max(count($trips), count($packages));
    $out = [];
    $copy = [
        'cartId', 'id', 'dateIso', 'date_iso', 'hora', 'embarque', 'destino', 'modalidade',
        'valorUnit', 'qty', 'pessoas', 'quorum', 'meetingPoint', 'meetingLat', 'meetingLng',
        'comTransporte', 'abreCatalogo', 'passeioKey',
    ];
    for ($i = 0; $i < $n; $i++) {
        $trip = is_array($trips[$i] ?? null) ? $trips[$i] : [];
        $pack = is_array($packages[$i] ?? null) ? $packages[$i] : [];
        foreach ($copy as $key) {
            $cur = $trip[$key] ?? null;
            $empty = $cur === null || $cur === '';
            if ($empty && array_key_exists($key, $pack) && $pack[$key] !== '' && $pack[$key] !== null) {
                $trip[$key] = $pack[$key];
            }
        }
        if (trim((string)($trip['cartId'] ?? '')) === '' && trim((string)($trip['id'] ?? '')) !== '') {
            $trip['cartId'] = $trip['id'];
        }
        $out[] = $trip;
    }
    return $out;
}

/**
 * @return array{slug:string,date:string,mode:string,transport:bool,ids:list<int>}|null
 */
function gcv_catalog_parse_cart(string $cart): ?array
{
    $cart = trim($cart);
    if ($cart === '' || !str_starts_with($cart, 'roteiro-')) {
        return null;
    }
    if (!preg_match('/-(20\d{2}-\d{2}-\d{2})-(excursao|exclusivo|privativo)-([ts])(?:-bi-(?:en|es))?$/', $cart, $m, PREG_OFFSET_CAPTURE)) {
        return null;
    }
    $before = rtrim(substr($cart, 0, (int)$m[0][1]), '-');
    $before = substr($before, strlen('roteiro-'));
    $ids = [];
    $slug = $before;
    if (preg_match('/^(.*?)-(\d+(?:-\d+)*)$/', $before, $im) && $im[1] !== '') {
        $slug = $im[1];
        foreach (explode('-', $im[2]) as $raw) {
            $n = (int)$raw;
            if ($n > 0) {
                $ids[] = $n;
            }
        }
    }
    if ($slug === '') {
        return null;
    }
    return [
        'slug' => $slug,
        'date' => $m[1][0],
        'mode' => $m[2][0],
        'transport' => $m[3][0] === 't',
        'ids' => $ids,
    ];
}

/**
 * @param array<string,mixed> $trip
 * @param array{slug:string,date:string,mode:string,transport:bool,ids:list<int>} $parsed
 * @return list<int>
 */
function gcv_catalog_attraction_ids(array $trip, array $parsed): array
{
    $ids = $parsed['ids'];
    if (!$ids && function_exists('gcv_private_trip_attraction_ids')) {
        $ids = gcv_private_trip_attraction_ids($trip);
    }
    if ($ids) {
        return array_slice($ids, 0, 3);
    }
    try {
        $st = db()->prepare(
            "SELECT id FROM gcv_attractions
             WHERE status <> 'archived' AND slug = ?
             LIMIT 1"
        );
        $st->execute([$parsed['slug']]);
        $id = (int)$st->fetchColumn();
        if ($id > 0) {
            return [$id];
        }
    } catch (Throwable $e) {
        error_log('catalog attraction slug: ' . $e->getMessage());
    }
    return gcv_private_trip_attraction_ids($trip);
}

/**
 * @param array<string,mixed> $reservation
 * @return array<string,mixed>|null
 */
function gcv_catalog_group_departure_sync(array $reservation): ?array
{
    gcv_marketplace_ensure_excursion_finance_columns(db());
    $chosen = null;
    foreach (gcv_catalog_source_rows($reservation) as $index => $trip) {
        $cart = trim((string)($trip['cartId'] ?? $trip['id'] ?? ''));
        $parsed = gcv_catalog_parse_cart($cart);
        if (!$parsed || $parsed['mode'] !== 'excursao') {
            continue;
        }
        $row = gcv_catalog_group_departure_ensure($reservation, $index, $trip, $parsed);
        if ($chosen === null && $row) {
            $chosen = $row;
        }
    }
    return $chosen;
}

/**
 * @param array<string,mixed> $reservation
 * @param array<string,mixed> $trip
 * @param array{slug:string,date:string,mode:string,transport:bool,ids:list<int>} $parsed
 * @return array<string,mixed>|null
 */
function gcv_catalog_group_departure_ensure(array $reservation, int $index, array $trip, array $parsed): ?array
{
    $attrIds = gcv_catalog_attraction_ids($trip, $parsed);
    if (!$attrIds) {
        error_log('catalog departure skip: atrativo ausente ' . $parsed['slug']);
        return null;
    }
    require_once __DIR__ . '/teste_acesso.php';
    if (gcv_teste_so_atracoes($attrIds)) {
        return null;
    }
    $cityId = gcv_private_city_id($trip);
    if ($cityId <= 0) {
        return null;
    }
    $date = $parsed['date'];
    $transport = $parsed['transport'] || gcv_private_trip_has_transport($trip);
    $slug = 'cat-exc-' . (int)$attrIds[0] . '-' . $date . '-' . $cityId . '-' . ($transport ? 't' : 's');
    $time = function_exists('gcv_normalize_departure_time')
        ? gcv_normalize_departure_time((string)($trip['hora'] ?? '08:00'))
        : '08:00:00';
    if ($time === '') {
        $time = '08:00:00';
    }
    $quorum = 4;
    $fromTrip = (int)($trip['quorum'] ?? 0);
    if ($fromTrip >= 1 && $fromTrip <= 15) {
        $quorum = $fromTrip;
    }
    $rawUnit = $trip['valorUnit'] ?? 0;
    if (is_string($rawUnit)) {
        $rawUnit = str_replace(',', '.', $rawUnit);
    }
    $price = (int)round((float)$rawUnit * 100);
    if ($price < 0) {
        $price = 0;
    }
    $rid = strtoupper(trim((string)($reservation['reservation_id'] ?? '')));
    $notes = 'Catálogo · excursão aberta pela compra' . ($rid !== '' ? ' ' . $rid : '') . '. Quórum ' . $quorum . '.';

    try {
        $existing = db()->prepare(
            'SELECT id FROM gcv_excursions WHERE cart_slug = ? AND deleted_at IS NULL LIMIT 1'
        );
        $existing->execute([$slug]);
        $id = (int)$existing->fetchColumn();
        $created = false;
        if ($id <= 0) {
            $stmt = db()->prepare(
                'INSERT INTO gcv_excursions (
                  status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
                  price_cents, quorum, max_people, booked_people, preconfirmed_people,
                  include_transport, include_entry, include_lunch,
                  notes_pt, cart_slug,
                  business_mode, created_by_origin, approved_at,
                  offer_transport, price_transport_cents, quorum_transport, max_people_transport, booked_people_transport,
                  tour_type
                ) VALUES (
                  \'published\', ?, ?, ?, ?, NULL,
                  ?, ?, 15, 0, 0,
                  ?, 0, 0,
                  ?, ?,
                  \'ADMINISTRATIVE\', \'API\', NOW(),
                  ?, ?, 0, ?, 0,
                  \'excursao\'
                )'
            );
            $stmt->execute([
                $date,
                $time,
                $cityId,
                $attrIds[0],
                $price,
                $quorum,
                $transport ? 1 : 0,
                $notes,
                $slug,
                $transport ? 1 : 0,
                $transport ? $price : null,
                $transport ? 4 : 0,
            ]);
            $id = (int)db()->lastInsertId();
            $created = $id > 0;
            if ($id > 0) {
                require_once __DIR__ . '/excursion_attractions.php';
                gcv_excursion_save_attractions($id, $attrIds);
                $point = trim((string)($trip['meetingPoint'] ?? ''));
                if ($point !== '') {
                    require_once __DIR__ . '/meeting_point.php';
                    gcv_excursion_save_meeting_point(
                        $id,
                        $point,
                        null,
                        $trip['meetingLat'] ?? null,
                        $trip['meetingLng'] ?? null
                    );
                }
            }
        }
        if ($id <= 0) {
            return null;
        }
        gcv_catalog_publish_paid_departure($id);
        gcv_private_departure_link_trip($rid, $index, $id);
        $st = db()->prepare(
            'SELECT e.*, c.name AS departure_city_name, a.title_pt AS attraction_title
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             WHERE e.id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row['_catalog_created'] = $created;
        }
        return $row;
    } catch (Throwable $e) {
        error_log('catalog group departure: ' . $e->getMessage());
        return null;
    }
}

/** Compra pelo site não fica em aprovação: entra publicada, em formação, sem guia. */
function gcv_catalog_publish_paid_pending(): void
{
    try {
        db()->exec(
            "UPDATE gcv_excursions e
             SET e.status = 'published', e.approved_at = COALESCE(e.approved_at, NOW())
             WHERE e.deleted_at IS NULL
               AND e.status = 'pending_approval'
               AND e.created_by_origin = 'API'
               AND COALESCE(e.tour_type, 'excursao') <> 'privativo'
               AND (e.guide_user_id IS NULL OR e.guide_user_id = 0)
               AND (
                 e.booked_people > 0
                 OR e.booked_people_transport > 0
                 OR EXISTS (
                   SELECT 1 FROM gcv_sales s
                   WHERE s.excursion_id = e.id
                     AND s.deleted_at IS NULL
                     AND s.sale_status IN ('PAID','AUTHORIZED')
                 )
               )"
        );
    } catch (Throwable $e) {
        error_log('catalog publish pending: ' . $e->getMessage());
    }
}

/** A compra paga já coloca a excursão no site. O guia continua vazio até o quórum. */
function gcv_catalog_publish_paid_departure(int $id): void
{
    if ($id <= 0) {
        return;
    }
    try {
        db()->prepare(
            "UPDATE gcv_excursions
             SET status = 'published', approved_at = COALESCE(approved_at, NOW())
             WHERE id = ?
               AND deleted_at IS NULL
               AND status = 'pending_approval'
               AND COALESCE(tour_type, 'excursao') <> 'privativo'
               AND created_by_origin = 'API'
               AND (guide_user_id IS NULL OR guide_user_id = 0)"
        )->execute([$id]);
    } catch (Throwable $e) {
        error_log('catalog publish paid: ' . $e->getMessage());
    }
}

function gcv_catalog_repair_paid_sale(array $reservation, array $sale): void
{
    $linked = (int)($sale['excursion_id'] ?? 0);
    if ($linked > 0) {
        gcv_catalog_publish_paid_departure($linked);
        if (function_exists('gcv_sale_refresh_booked_people')) {
            gcv_sale_refresh_booked_people($linked);
        }
        return;
    }
    $row = gcv_catalog_group_departure_sync($reservation);
    if (!$row || (int)($row['id'] ?? 0) <= 0) {
        return;
    }
    $excursionId = (int)$row['id'];
    $saleId = (int)($sale['id'] ?? 0);
    $starts = null;
    $date = (string)($row['date_iso'] ?? '');
    $time = substr((string)($row['departure_time'] ?? '08:00:00'), 0, 8);
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $starts = $date . ' ' . $time;
    }
    if ($saleId > 0) {
        try {
            db()->prepare(
                'UPDATE gcv_sales
                 SET excursion_id = ?, excursion_title = ?, attraction_id = ?, city_id = ?, city_name = ?,
                     excursion_starts_at = COALESCE(excursion_starts_at, ?), updated_at = NOW()
                 WHERE id = ? AND (excursion_id IS NULL OR excursion_id = 0)'
            )->execute([
                $excursionId,
                (string)($row['attraction_title'] ?? '') ?: null,
                (int)($row['attraction_id'] ?? 0) ?: null,
                (int)($row['departure_city_id'] ?? 0) ?: null,
                (string)($row['departure_city_name'] ?? '') ?: null,
                $starts,
                $saleId,
            ]);
        } catch (Throwable $e) {
            error_log('catalog repair sale: ' . $e->getMessage());
        }
    }
    $rid = strtoupper(trim((string)($reservation['reservation_id'] ?? $sale['reservation_id'] ?? '')));
    if ($rid !== '') {
        try {
            db()->prepare(
                'UPDATE gcv_booking_trips
                 SET excursion_id = ?
                 WHERE reservation_id = ? AND (excursion_id IS NULL OR excursion_id = 0)'
            )->execute([$excursionId, $rid]);
        } catch (Throwable $e) {
            error_log('catalog repair trips: ' . $e->getMessage());
        }
    }
    if (function_exists('gcv_sale_refresh_booked_people')) {
        gcv_sale_refresh_booked_people($excursionId);
    }
}
