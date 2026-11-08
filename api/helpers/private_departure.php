<?php
declare(strict_types=1);

/**
 * Passeio exclusivo (privativo) comprado no catálogo vira uma saída própria
 * na planilha de Excursões. Não entra no carrossel público.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/marketplace_schema.php';

function gcv_private_trip_mode(array $trip): string
{
    $mode = strtolower(trim((string)($trip['modalidade'] ?? '')));
    if ($mode === 'exclusivo' || $mode === 'privativo') {
        return 'privativo';
    }
    if ($mode === 'excursao') {
        return 'excursao';
    }
    $id = strtolower((string)($trip['cartId'] ?? $trip['cart_id'] ?? $trip['id'] ?? ''));
    if (str_contains($id, '-exclusivo-') || str_contains($id, '-privativo-')) {
        return 'privativo';
    }
    if (str_contains($id, '-excursao-')) {
        return 'excursao';
    }
    return '';
}

function gcv_private_trip_has_transport(array $trip): bool
{
    if (!empty($trip['comTransporte']) || !empty($trip['include_transport']) || !empty($trip['with_transport'])) {
        return true;
    }
    $id = strtolower((string)($trip['cartId'] ?? $trip['cart_id'] ?? $trip['id'] ?? ''));
    return (bool)preg_match('/-(?:exclusivo|privativo)-t(?:-|$)/', $id);
}

function gcv_private_trip_slug(string $reservationId, int $index): string
{
    $id = preg_replace('/[^A-Z0-9\-]/', '', strtoupper(trim($reservationId))) ?? '';
    return 'priv-' . $id . '-' . max(0, $index);
}

/**
 * @return list<int>
 */
function gcv_private_trip_attraction_ids(array $trip): array
{
    $cart = (string)($trip['cartId'] ?? $trip['cart_id'] ?? $trip['id'] ?? '');
    $ids = [];
    if (preg_match('/-(\d{4}-\d{2}-\d{2})-(?:exclusivo|excursao|privativo)-/', $cart, $m, PREG_OFFSET_CAPTURE)) {
        $before = substr($cart, 0, (int)$m[0][1]);
        if (preg_match('/(\d+(?:-\d+)*)$/', $before, $im)) {
            foreach (explode('-', $im[1]) as $raw) {
                $n = (int)$raw;
                if ($n > 0) {
                    $ids[] = $n;
                }
            }
        }
    }
    $ids = array_values(array_unique($ids));
    if ($ids) {
        $place = implode(',', array_fill(0, count($ids), '?'));
        try {
            $st = db()->prepare("SELECT id FROM gcv_attractions WHERE id IN ($place)");
            $st->execute($ids);
            $found = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
            $ids = array_values(array_filter($ids, static fn ($id) => in_array($id, $found, true)));
        } catch (Throwable $e) {
            $ids = [];
        }
    }
    if ($ids) {
        return array_slice($ids, 0, 3);
    }
    $title = trim((string)($trip['destino'] ?? $trip['title'] ?? ''));
    if ($title === '') {
        return [];
    }
    $first = trim(explode('+', $title)[0]);
    try {
        $st = db()->prepare(
            "SELECT id FROM gcv_attractions
             WHERE status <> 'archived' AND (title_pt = ? OR title_pt = ?)
             LIMIT 1"
        );
        $st->execute([$title, $first]);
        $id = (int)$st->fetchColumn();
        return $id > 0 ? [$id] : [];
    } catch (Throwable $e) {
        return [];
    }
}

function gcv_private_city_id(array $trip): int
{
    $name = trim((string)($trip['embarque'] ?? $trip['cidade'] ?? $trip['city'] ?? ''));
    try {
        if ($name !== '') {
            $st = db()->prepare(
                "SELECT id FROM gcv_cities
                 WHERE status = 'active'
                   AND (name = ? OR name LIKE ? OR ? LIKE CONCAT(name, '%'))
                 ORDER BY CHAR_LENGTH(name) DESC
                 LIMIT 1"
            );
            $st->execute([$name, $name . '%', $name]);
            $id = (int)$st->fetchColumn();
            if ($id > 0) {
                return $id;
            }
        }
        $fallback = db()->query(
            "SELECT id FROM gcv_cities
             WHERE status = 'active' AND name LIKE 'Alto Paraíso%'
             ORDER BY is_base DESC, id ASC
             LIMIT 1"
        )->fetchColumn();
        return (int)$fallback;
    } catch (Throwable $e) {
        return 0;
    }
}

function gcv_private_trip_people(array $trip): int
{
    $people = (int)($trip['pessoas'] ?? $trip['people'] ?? $trip['qty'] ?? 1);
    if ($people < 1) {
        $people = 1;
    }
    if ($people > 15) {
        $people = 15;
    }
    return $people;
}

function gcv_private_trip_price_cents(array $trip, int $people): int
{
    $unitReais = (int)($trip['valorUnit'] ?? 0);
    $qty = max(1, (int)($trip['qty'] ?? 1));
    $total = $unitReais * $qty * 100;
    if ($total < 100) {
        $base = (int)($trip['base_cents'] ?? 0);
        if ($base > 0) {
            $total = $base;
        }
    }
    if ($total < 100) {
        return 100;
    }
    if ($qty === 1 && $people > 1) {
        return max(100, (int)round($total / $people));
    }
    return max(100, $unitReais > 0 ? $unitReais * 100 : (int)round($total / $people));
}

/**
 * Garante uma saída privativa por passeio exclusivo da reserva.
 * Devolve a saída do primeiro passeio quando ele for privativo.
 *
 * @param array<string,mixed> $reservation
 * @return array<string,mixed>|null
 */
function gcv_private_departure_sync(array $reservation, bool $seedBooked = false): ?array
{
    gcv_marketplace_ensure_excursion_finance_columns(db());
    $rid = strtoupper(trim((string)($reservation['reservation_id'] ?? '')));
    if ($rid === '') {
        return null;
    }
    $trips = [];
    foreach (['trips', 'packages'] as $key) {
        if (!is_array($reservation[$key] ?? null)) {
            continue;
        }
        foreach ($reservation[$key] as $trip) {
            if (is_array($trip)) {
                $trips[] = $trip;
            }
        }
        if ($trips) {
            break;
        }
    }
    if (!$trips) {
        return null;
    }

    $first = null;
    foreach ($trips as $index => $trip) {
        if (gcv_private_trip_mode($trip) !== 'privativo') {
            continue;
        }
        $tripIndex = array_key_exists('trip_index', $trip) ? (int)$trip['trip_index'] : (int)$index;
        $row = gcv_private_departure_ensure($rid, $tripIndex, $trip, $seedBooked);
        if ($tripIndex === 0) {
            $first = $row;
        } elseif ($first === null && $row) {
            $first = $row;
        }
    }
    return $first;
}

/**
 * @param array<string,mixed> $trip
 * @return array<string,mixed>|null
 */
function gcv_private_departure_ensure(string $reservationId, int $index, array $trip, bool $seedBooked): ?array
{
    $slug = gcv_private_trip_slug($reservationId, $index);
    try {
        $existing = db()->prepare(
            'SELECT e.*, c.name AS departure_city_name, a.title_pt AS attraction_title
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             WHERE e.cart_slug = ? AND e.deleted_at IS NULL
             LIMIT 1'
        );
        $existing->execute([$slug]);
        $found = $existing->fetch(PDO::FETCH_ASSOC);
        if ($found) {
            if ($seedBooked) {
                gcv_private_departure_seed_if_empty($found, $trip);
            }
            gcv_private_departure_link_trip($reservationId, $index, (int)$found['id']);
            return $found;
        }
    } catch (Throwable $e) {
        error_log('private departure lookup: ' . $e->getMessage());
        return null;
    }

    $attrIds = gcv_private_trip_attraction_ids($trip);
    $cityId = gcv_private_city_id($trip);
    if (!$attrIds || $cityId <= 0) {
        error_log('private departure skip ' . $slug . ': atrativo ou cidade ausente');
        return null;
    }

    $date = substr(trim((string)($trip['dateIso'] ?? $trip['date_iso'] ?? $trip['dateISO'] ?? '')), 0, 10);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $cart = (string)($trip['cartId'] ?? $trip['cart_id'] ?? '');
        if (preg_match('/(20\d{2}-\d{2}-\d{2})/', $cart, $m)) {
            $date = $m[1];
        }
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        error_log('private departure skip ' . $slug . ': data ausente');
        return null;
    }
    $time = gcv_normalize_departure_time((string)($trip['hora'] ?? '08:00'));
    if ($time === '') {
        $time = '08:00:00';
    }

    $people = gcv_private_trip_people($trip);
    $maxPeople = min(15, max($people, 4));
    $price = gcv_private_trip_price_cents($trip, $people);
    $transport = gcv_private_trip_has_transport($trip);
    $bookedWalk = 0;
    $bookedVan = 0;
    if ($seedBooked) {
        if ($transport) {
            $bookedVan = $people;
        } else {
            $bookedWalk = $people;
        }
    }
    $note = 'Privativo · reserva ' . $reservationId;

    try {
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
              ?, 1, ?, ?, 0,
              ?, 0, 0,
              ?, ?,
              \'ADMINISTRATIVE\', \'API\', NOW(),
              ?, ?, 0, ?, ?,
              \'privativo\'
            )'
        );
        $stmt->execute([
            $date,
            $time,
            $cityId,
            $attrIds[0],
            $price,
            $maxPeople,
            $bookedWalk,
            $transport ? 1 : 0,
            $note,
            $slug,
            $transport ? 1 : 0,
            $transport ? $price : null,
            $transport ? min(4, max(1, $people)) : 0,
            $bookedVan,
        ]);
        $id = (int)db()->lastInsertId();
    } catch (Throwable $e) {
        error_log('private departure insert: ' . $e->getMessage());
        return null;
    }

    if ($id <= 0) {
        return null;
    }
    try {
        require_once __DIR__ . '/excursion_attractions.php';
        gcv_excursion_save_attractions($id, $attrIds);
    } catch (Throwable $e) {
        error_log('private departure attractions: ' . $e->getMessage());
    }
    gcv_private_departure_link_trip($reservationId, $index, $id);

    try {
        $st = db()->prepare(
            'SELECT e.*, c.name AS departure_city_name, a.title_pt AS attraction_title
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             WHERE e.id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (Throwable $e) {
        return [
            'id' => $id,
            'date_iso' => $date,
            'departure_time' => $time,
            'tour_type' => 'privativo',
            'status' => 'published',
            'cart_slug' => $slug,
            'booked_people' => $bookedWalk,
            'booked_people_transport' => $bookedVan,
        ];
    }
}

/**
 * Liga o passeio da reserva à saída privativa.
 * Se estava numa excursão compartilhada, troca.
 */
function gcv_private_departure_link_trip(string $reservationId, int $index, int $excursionId): void
{
    if ($reservationId === '' || $excursionId <= 0) {
        return;
    }
    try {
        db()->prepare(
            'UPDATE gcv_booking_trips t
             LEFT JOIN gcv_excursions e ON e.id = t.excursion_id
             SET t.excursion_id = ?
             WHERE t.reservation_id = ? AND t.trip_index = ?
               AND (
                 t.excursion_id IS NULL OR t.excursion_id = 0 OR t.excursion_id = ?
                 OR e.id IS NULL OR COALESCE(e.tour_type, \'excursao\') <> \'privativo\'
               )'
        )->execute([$excursionId, $reservationId, $index, $excursionId]);
    } catch (Throwable $e) {
        // tabela pode não existir nesta reserva
    }
}

/**
 * @param array<string,mixed> $row
 * @param array<string,mixed> $trip
 */
function gcv_private_departure_seed_if_empty(array &$row, array $trip): void
{
    $id = (int)($row['id'] ?? 0);
    $occupied = (int)($row['booked_people'] ?? 0) + (int)($row['booked_people_transport'] ?? 0);
    if ($id <= 0 || $occupied > 0) {
        return;
    }
    $people = gcv_private_trip_people($trip);
    $transport = gcv_private_trip_has_transport($trip);
    try {
        db()->prepare(
            'UPDATE gcv_excursions
             SET booked_people = ?, booked_people_transport = ?
             WHERE id = ? AND booked_people = 0 AND booked_people_transport = 0'
        )->execute([$transport ? 0 : $people, $transport ? $people : 0, $id]);
        $row['booked_people'] = $transport ? 0 : $people;
        $row['booked_people_transport'] = $transport ? $people : 0;
    } catch (Throwable $e) {
        error_log('private departure seed: ' . $e->getMessage());
    }
}

function gcv_private_departure_backfill(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    gcv_marketplace_ensure_excursion_finance_columns(db());
    try {
        $rows = db()->query(
            "SELECT t.reservation_id, t.trip_index, t.cart_id, t.title, t.starts_at, t.people, t.base_cents
             FROM gcv_booking_trips t
             LEFT JOIN gcv_excursions e ON e.id = t.excursion_id
             WHERE t.cart_id IS NOT NULL
               AND (t.cart_id LIKE '%-exclusivo-%' OR t.cart_id LIKE '%-privativo-%')
               AND (
                 t.excursion_id IS NULL OR t.excursion_id = 0
                 OR e.id IS NULL
                 OR COALESCE(e.tour_type, 'excursao') <> 'privativo'
               )
             ORDER BY t.id DESC
             LIMIT 40"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return;
    }
    if (!$rows) {
        return;
    }
    if (!function_exists('gcv_pix_read_reservation')) {
        require_once __DIR__ . '/pix_reservation_store.php';
    }

    $byRes = [];
    foreach ($rows as $row) {
        $rid = strtoupper(trim((string)($row['reservation_id'] ?? '')));
        if ($rid === '') {
            continue;
        }
        $byRes[$rid][] = $row;
    }
    foreach ($byRes as $rid => $list) {
        $res = gcv_pix_read_reservation($rid);
        if (!$res) {
            $trips = [];
            foreach ($list as $row) {
                $cart = (string)($row['cart_id'] ?? '');
                $trips[] = [
                    'trip_index' => (int)($row['trip_index'] ?? 0),
                    'cartId' => $cart,
                    'destino' => (string)($row['title'] ?? ''),
                    'dateIso' => substr((string)($row['starts_at'] ?? ''), 0, 10),
                    'hora' => substr((string)($row['starts_at'] ?? ''), 11, 5),
                    'pessoas' => (int)($row['people'] ?? 1),
                    'qty' => 1,
                    'valorUnit' => (int)round(((int)($row['base_cents'] ?? 0)) / 100),
                    'base_cents' => (int)($row['base_cents'] ?? 0),
                    'modalidade' => 'exclusivo',
                    'comTransporte' => (bool)preg_match('/-(?:exclusivo|privativo)-t(?:-|$)/', $cart),
                ];
            }
            $res = [
                'reservation_id' => $rid,
                'status' => 'PAID',
                'trips' => $trips,
            ];
        }
        $created = gcv_private_departure_sync($res, true);
        if (!$created || empty($created['id'])) {
            continue;
        }
        $pack = [];
        foreach (['trips', 'packages'] as $key) {
            if (!is_array($res[$key] ?? null)) {
                continue;
            }
            foreach ($res[$key] as $trip) {
                if (is_array($trip)) {
                    $pack[] = $trip;
                }
            }
            if ($pack) {
                break;
            }
        }
        $lead = $pack[0] ?? null;
        $leadPrivate = is_array($lead) && gcv_private_trip_mode($lead) === 'privativo';
        if (!$leadPrivate || (string)($created['cart_slug'] ?? '') !== gcv_private_trip_slug($rid, 0)) {
            continue;
        }
        try {
            $cur = db()->prepare(
                'SELECT excursion_id FROM gcv_sales
                 WHERE reservation_id = ? AND deleted_at IS NULL
                 ORDER BY id DESC LIMIT 1'
            );
            $cur->execute([$rid]);
            $oldId = (int)$cur->fetchColumn();
            $newId = (int)$created['id'];
            $upd = db()->prepare(
                'UPDATE gcv_sales s
                 LEFT JOIN gcv_excursions e ON e.id = s.excursion_id
                 SET s.excursion_id = ?
                 WHERE s.reservation_id = ? AND s.deleted_at IS NULL
                   AND (s.excursion_id IS NULL OR s.excursion_id <> ?)
                   AND (
                     s.excursion_id IS NULL OR s.excursion_id = 0
                     OR e.id IS NULL OR COALESCE(e.tour_type, \'excursao\') <> \'privativo\'
                   )'
            );
            $upd->execute([$newId, $rid, $newId]);
            if ($upd->rowCount() > 0 && !function_exists('gcv_sale_refresh_booked_people')) {
                require_once __DIR__ . '/marketplace/sale_service.php';
            }
            if ($upd->rowCount() > 0) {
                if ($oldId > 0 && $oldId !== $newId) {
                    gcv_sale_refresh_booked_people($oldId);
                }
                $occupied = (int)($created['booked_people'] ?? 0) + (int)($created['booked_people_transport'] ?? 0);
                if ($occupied > 0) {
                    gcv_sale_refresh_booked_people($newId);
                }
            }
        } catch (Throwable $e) {
            error_log('private departure sale link: ' . $e->getMessage());
        }
    }
}
