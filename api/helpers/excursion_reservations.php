<?php
declare(strict_types=1);

/**
 * Reservas ligadas a uma saída (excursão ou privativo).
 */

function gcv_excursion_reservation_code(string $raw): string
{
    $code = strtoupper(trim($raw));
    $code = preg_replace('/\s+/', '', $code) ?? '';
    if (!preg_match('/^GCV-[A-Z0-9]{4,}$/', $code)) {
        return '';
    }
    return $code;
}

/**
 * @return list<string>
 */
function gcv_excursion_codes_in_notes(string $notes): array
{
    if (!preg_match_all('/GCV-[A-Z0-9]{4,}/i', $notes, $m)) {
        return [];
    }
    $out = [];
    foreach ($m[0] as $code) {
        $norm = gcv_excursion_reservation_code((string)$code);
        if ($norm !== '' && !in_array($norm, $out, true)) {
            $out[] = $norm;
        }
    }
    return $out;
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function gcv_excursion_reservation_public(array $row, bool $linked): array
{
    $status = strtoupper((string)($row['sale_status'] ?? ''));
    $labels = [
        'PAID' => 'Paga',
        'AUTHORIZED' => 'Reservada',
        'PENDING' => 'Pendente',
        'CANCELLED' => 'Cancelada',
        'REFUNDED' => 'Estornada',
        'DISPUTED' => 'Em disputa',
    ];
    $name = trim((string)($row['tourist_name'] ?? ''));
    if ($name === '') {
        $name = trim((string)($row['tourist_email'] ?? ''));
    }
    if ($name === '') {
        $name = '—';
    }
    return [
        'reservation_id' => strtoupper((string)($row['reservation_id'] ?? '')),
        'client_name' => $name,
        'spots' => max(1, (int)($row['spots'] ?? 1)),
        'status' => $status,
        'status_label' => $labels[$status] ?? ($status !== '' ? $status : '—'),
        'linked' => $linked,
    ];
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_excursion_linked_reservations(int $excursionId, string $notes = ''): array
{
    if ($excursionId <= 0) {
        return [];
    }
    $out = [];
    $seen = [];
    try {
        $st = db()->prepare(
            'SELECT reservation_id, tourist_name, tourist_email, spots, sale_status, excursion_id
             FROM gcv_sales
             WHERE excursion_id = ? AND deleted_at IS NULL
             ORDER BY id DESC'
        );
        $st->execute([$excursionId]);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $code = gcv_excursion_reservation_code((string)($row['reservation_id'] ?? ''));
            if ($code === '' || isset($seen[$code])) {
                continue;
            }
            $seen[$code] = true;
            $out[] = gcv_excursion_reservation_public($row, true);
        }
    } catch (Throwable $e) {
        error_log('excursion reservations: ' . $e->getMessage());
    }
    foreach (gcv_excursion_codes_in_notes($notes) as $code) {
        if (isset($seen[$code])) {
            continue;
        }
        try {
            $st = db()->prepare(
                'SELECT reservation_id, tourist_name, tourist_email, spots, sale_status, excursion_id
                 FROM gcv_sales
                 WHERE reservation_id = ? AND deleted_at IS NULL
                 LIMIT 1'
            );
            $st->execute([$code]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = false;
        }
        if (!$row) {
            continue;
        }
        $seen[$code] = true;
        $linked = (int)($row['excursion_id'] ?? 0) === $excursionId;
        $out[] = gcv_excursion_reservation_public($row, $linked);
    }
    return $out;
}

function gcv_excursion_refresh_sale_counts(int $excursionId): void
{
    if ($excursionId <= 0) {
        return;
    }
    if (!function_exists('gcv_sale_refresh_booked_people')) {
        require_once __DIR__ . '/marketplace/sale_service.php';
    }
    if (function_exists('gcv_sale_refresh_booked_people')) {
        gcv_sale_refresh_booked_people($excursionId);
    }
}

function gcv_excursion_link_trips(string $code, int $excursionId, string $dateIso): void
{
    try {
        $st = db()->prepare('SELECT id, starts_at FROM gcv_booking_trips WHERE reservation_id = ? ORDER BY trip_index ASC');
        $st->execute([$code]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return;
    }
    if (!$rows) {
        return;
    }
    $ids = [];
    foreach ($rows as $row) {
        $day = substr((string)($row['starts_at'] ?? ''), 0, 10);
        if ($dateIso !== '' && $day === $dateIso) {
            $ids[] = (int)$row['id'];
        }
    }
    if (!$ids && count($rows) === 1) {
        $ids[] = (int)$rows[0]['id'];
    }
    if (!$ids) {
        return;
    }
    $place = implode(',', array_fill(0, count($ids), '?'));
    $sql = 'UPDATE gcv_booking_trips SET excursion_id = ? WHERE id IN (' . $place . ')';
    db()->prepare($sql)->execute(array_merge([$excursionId], $ids));
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_excursion_link_reservation(int $excursionId, string $rawCode): array
{
    $code = gcv_excursion_reservation_code($rawCode);
    if ($excursionId <= 0 || $code === '') {
        throw new InvalidArgumentException('Informe o código da reserva, no formato GCV-XXXX.');
    }
    $ex = db()->prepare('SELECT id, date_iso, notes_pt FROM gcv_excursions WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $ex->execute([$excursionId]);
    $tour = $ex->fetch(PDO::FETCH_ASSOC);
    if (!$tour) {
        throw new InvalidArgumentException('Passeio não encontrado');
    }
    $sale = db()->prepare(
        'SELECT id, excursion_id FROM gcv_sales WHERE reservation_id = ? AND deleted_at IS NULL LIMIT 1'
    );
    $sale->execute([$code]);
    $row = $sale->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new InvalidArgumentException('Reserva não encontrada.');
    }
    $previous = (int)($row['excursion_id'] ?? 0);
    db()->prepare('UPDATE gcv_sales SET excursion_id = ? WHERE id = ?')->execute([$excursionId, (int)$row['id']]);
    gcv_excursion_link_trips($code, $excursionId, (string)($tour['date_iso'] ?? ''));
    gcv_excursion_refresh_sale_counts($excursionId);
    if ($previous > 0 && $previous !== $excursionId) {
        gcv_excursion_refresh_sale_counts($previous);
    }
    return gcv_excursion_linked_reservations($excursionId, (string)($tour['notes_pt'] ?? ''));
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_excursion_unlink_reservation(int $excursionId, string $rawCode): array
{
    $code = gcv_excursion_reservation_code($rawCode);
    if ($excursionId <= 0 || $code === '') {
        throw new InvalidArgumentException('Informe o código da reserva, no formato GCV-XXXX.');
    }
    $ex = db()->prepare('SELECT id, notes_pt FROM gcv_excursions WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $ex->execute([$excursionId]);
    $tour = $ex->fetch(PDO::FETCH_ASSOC);
    if (!$tour) {
        throw new InvalidArgumentException('Passeio não encontrado');
    }
    db()->prepare(
        'UPDATE gcv_sales SET excursion_id = NULL WHERE reservation_id = ? AND excursion_id = ? AND deleted_at IS NULL'
    )->execute([$code, $excursionId]);
    try {
        db()->prepare(
            'UPDATE gcv_booking_trips SET excursion_id = NULL WHERE reservation_id = ? AND excursion_id = ?'
        )->execute([$code, $excursionId]);
    } catch (Throwable $e) {
        error_log('unlink trips: ' . $e->getMessage());
    }
    gcv_excursion_refresh_sale_counts($excursionId);
    return gcv_excursion_linked_reservations($excursionId, (string)($tour['notes_pt'] ?? ''));
}
