<?php

declare(strict_types=1);

/**
 * Estorno Pix por passeio, dentro da mesma reserva.
 * Passeio confirmado não cancela e não entra no estorno.
 * O valor devolvido é só a parte dos passeios cancelados (PUT /pix/{e2e}/devolucao/{id}).
 */

require_once dirname(__DIR__) . '/db.php';
require_once dirname(__DIR__) . '/pix_reservation_store.php';
require_once dirname(__DIR__) . '/excursion_status.php';
require_once dirname(__DIR__) . '/sicoob_api.php';

final class GcvPixRefundException extends RuntimeException
{
    public function __construct(public string $errorCode, string $message)
    {
        parent::__construct($message);
    }
}

/**
 * @param array<string,mixed> $reservation
 * @return list<array<string,mixed>>
 */
function gcv_pix_refund_annotate_trips(array $reservation): array
{
    $trips = [];
    foreach (is_array($reservation['trips'] ?? null) ? $reservation['trips'] : [] as $trip) {
        if (is_array($trip)) {
            $trips[] = $trip;
        }
    }
    $rid = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    $rows = [];
    if ($rid !== '') {
        try {
            require_once __DIR__ . '/authorization.php';
            $rows = gcv_auth_trip_rows($rid);
            if (!$rows && $trips) {
                gcv_auth_register_trips($reservation, 'pix');
                $rows = gcv_auth_trip_rows($rid);
            }
        } catch (Throwable $e) {
            error_log('pix refund annotate: ' . $e->getMessage());
        }
    }
    $byIndex = [];
    foreach ($rows as $row) {
        $byIndex[(int)($row['trip_index'] ?? 0)] = $row;
    }
    $refundedIdx = gcv_pix_refunded_indexes($reservation);
    $n = max(count($trips), $byIndex ? (max(array_keys($byIndex)) + 1) : 0);
    $out = [];
    for ($i = 0; $i < $n; $i++) {
        $trip = $trips[$i] ?? [];
        $row = $byIndex[$i] ?? null;
        $state = gcv_pix_trip_cancel_state($trip, $row, isset($refundedIdx[$i]));
        $state['trip_index'] = $i;
        $out[] = array_merge($trip, $state);
    }
    return $out;
}

/**
 * @param array<string,mixed> $reservation
 * @return array<int,true>
 */
function gcv_pix_refunded_indexes(array $reservation): array
{
    $out = [];
    foreach (is_array($reservation['pix_refunds'] ?? null) ? $reservation['pix_refunds'] : [] as $rf) {
        if (!is_array($rf)) {
            continue;
        }
        $st = strtoupper((string)($rf['status'] ?? ''));
        if (in_array($st, ['DEVOLVIDO', 'EM_PROCESSAMENTO'], true)) {
            $out[(int)($rf['trip_index'] ?? -1)] = true;
        }
    }
    return $out;
}

/**
 * @param array<string,mixed> $trip
 * @param array<string,mixed>|null $row
 * @return array<string,mixed>
 */
function gcv_pix_trip_cancel_state(array $trip, ?array $row, bool $refundedAlready): array
{
    $decision = strtoupper((string)($row['decision'] ?? $trip['decision'] ?? ''));
    $refunded = $refundedAlready || in_array($decision, ['CANCELLED', 'RELEASED'], true) || !empty($trip['refunded']);
    $life = 'em_formacao';
    $excId = (int)($row['excursion_id'] ?? $trip['excursion_id'] ?? 0);
    if ($excId > 0) {
        try {
            $st = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
            $st->execute([$excId]);
            $exc = $st->fetch(PDO::FETCH_ASSOC);
            if ($exc) {
                $life = gcv_resolve_excursion_lifecycle($exc);
            }
        } catch (Throwable $e) {
            error_log('pix trip life: ' . $e->getMessage());
        }
    } elseif (!empty($trip['lifecycle'])) {
        $life = (string)$trip['lifecycle'];
    }
    $confirmed = !$refunded && (
        in_array($decision, ['CONFIRMED', 'CAPTURED'], true)
        || in_array($life, ['confirmada', 'concluida'], true)
        || !empty($trip['confirmed'])
    );
    if ($life === 'cancelada') {
        $confirmed = false;
    }
    $title = trim((string)($trip['destino'] ?? $row['title'] ?? $trip['title'] ?? ''));
    $dateLabel = trim((string)($trip['dateLabel'] ?? $trip['date_label'] ?? $trip['dateShort'] ?? ''));
    if ($dateLabel === '' && !empty($row['starts_at'])) {
        $dateLabel = substr((string)$row['starts_at'], 0, 16);
    }
    return [
        'trip_index' => (int)($row['trip_index'] ?? 0),
        'title' => $title,
        'date_label' => $dateLabel,
        'cents' => (int)($row['base_cents'] ?? 0),
        'excursion_id' => $excId,
        'people' => (int)($row['people'] ?? $trip['qty'] ?? 1),
        'starts_at' => (string)($row['starts_at'] ?? ''),
        'guide_user_id' => (int)($row['guide_user_id'] ?? 0),
        'can_cancel' => !$refunded && !$confirmed,
        'confirmed' => $confirmed,
        'refunded' => $refunded,
        'lifecycle' => $refunded ? 'cancelada' : $life,
    ];
}

/**
 * @param array<string,mixed> $reservation
 */
function gcv_pix_refund_e2e(array &$reservation): string
{
    foreach (['sicoob_end_to_end_id', 'end_to_end_id', 'endToEndId'] as $key) {
        $v = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation[$key] ?? '')) ?? '');
        if (strlen($v) >= 26) {
            return $v;
        }
    }
    $rid = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    if ($rid !== '') {
        try {
            $st = db()->prepare('SELECT end_to_end_id FROM gcv_pix_payments WHERE reservation_id = ? AND end_to_end_id IS NOT NULL LIMIT 1');
            $st->execute([$rid]);
            $v = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$st->fetchColumn()) ?? '');
            if (strlen($v) >= 26) {
                $reservation['sicoob_end_to_end_id'] = $v;
                gcv_pix_write_reservation($reservation);
                return $v;
            }
        } catch (Throwable $e) {
            error_log('pix refund e2e db: ' . $e->getMessage());
        }
    }
    if (gcv_sicoob_is_configured() && $rid !== '') {
        $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($reservation['txid'] ?? '')) ?? '', 0, 35);
        if ($txid === '' || strlen($txid) < 26) {
            $txid = gcv_sicoob_txid_from_reservation_id($rid);
        }
        $cob = gcv_sicoob_api_get('/cob/' . rawurlencode($txid));
        $first = is_array($cob['pix'][0] ?? null) ? $cob['pix'][0] : null;
        $v = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($first['endToEndId'] ?? '')) ?? '');
        if (strlen($v) >= 26) {
            $reservation['sicoob_end_to_end_id'] = $v;
            gcv_pix_write_reservation($reservation);
            return $v;
        }
    }
    $fake = (string)($_ENV['PAY_FAKE_GATEWAYS'] ?? getenv('PAY_FAKE_GATEWAYS') ?: '') === '1';
    if ($fake) {
        return str_pad('E2EFAKE' . preg_replace('/[^A-Z0-9]/', '', $rid), 32, '0');
    }
    return '';
}

function gcv_pix_refund_original_cents(array $reservation, ?array $sale): int
{
    $fromRes = (int)round(((float)($reservation['amount'] ?? 0)) * 100);
    if ($fromRes <= 0 && !empty($reservation['amount_cents'])) {
        $fromRes = (int)$reservation['amount_cents'];
    }
    $already = 0;
    foreach (is_array($reservation['pix_refunds'] ?? null) ? $reservation['pix_refunds'] : [] as $rf) {
        if (!is_array($rf)) {
            continue;
        }
        if (in_array(strtoupper((string)($rf['status'] ?? '')), ['DEVOLVIDO', 'EM_PROCESSAMENTO'], true)) {
            $already += (int)($rf['cents'] ?? 0);
        }
    }
    if ($fromRes > 0) {
        return $fromRes;
    }
    return $already + (int)($sale['sold_price_cents'] ?? 0);
}

/**
 * @param list<array<string,mixed>> $trips
 * @return array<int,int>
 */
function gcv_pix_refund_shares(array $reservation, array $trips, int $original): array
{
    unset($reservation);
    $raw = [];
    foreach ($trips as $i => $t) {
        $fromRow = (int)($t['cents'] ?? 0);
        $unit = (float)($t['valorUnit'] ?? 0);
        $qty = max(1, (int)($t['qty'] ?? $t['people'] ?? 1));
        $raw[$i] = $fromRow > 0 ? $fromRow : (int)round($unit * 100 * $qty);
    }
    $sum = array_sum($raw);
    $shares = [];
    $running = 0;
    $last = count($trips) - 1;
    foreach ($trips as $i => $_) {
        if ($i === $last) {
            $shares[$i] = max(0, $original - $running);
        } else {
            $shares[$i] = $sum > 0
                ? (int)round($original * $raw[$i] / $sum)
                : (int)floor($original / max(1, count($trips)));
            $running += $shares[$i];
        }
    }
    return $shares;
}

function gcv_pix_refund_already_cents(array $reservation): int
{
    $n = 0;
    foreach (is_array($reservation['pix_refunds'] ?? null) ? $reservation['pix_refunds'] : [] as $rf) {
        if (!is_array($rf)) {
            continue;
        }
        if (in_array(strtoupper((string)($rf['status'] ?? '')), ['DEVOLVIDO', 'EM_PROCESSAMENTO'], true)) {
            $n += (int)($rf['cents'] ?? 0);
        }
    }
    return $n;
}

function gcv_pix_trip_is_due(array $state): bool
{
    if (($state['lifecycle'] ?? '') === 'cancelada' && empty($state['refunded'])) {
        return true;
    }
    $starts = trim((string)($state['starts_at'] ?? ''));
    if ($starts === '') {
        return false;
    }
    $hours = 12;
    try {
        require_once dirname(__DIR__) . '/marketplace/transfer_service.php';
        if (function_exists('gcv_transfer_cancel_hours')) {
            $hours = gcv_transfer_cancel_hours();
        }
    } catch (Throwable $e) {
        error_log('pix refund due hours: ' . $e->getMessage());
    }
    $cut = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))
        ->modify('+' . $hours . ' hours')
        ->format('Y-m-d H:i:s');
    return $starts <= $cut;
}

/**
 * Estorna só os passeios pedidos. Confirmado é recusado.
 * $tripIndexes null = todos os que ainda podem cancelar.
 * $onlyDue = só os que já chegaram na janela automática (quórum não fechou).
 *
 * @param list<int>|null $tripIndexes
 * @return array<string,mixed>
 */
function gcv_pix_refund_reservation(
    string $reservationId,
    string $email,
    ?array $tripIndexes = null,
    bool $notifyClient = true,
    bool $onlyDue = false,
    bool $trustCaller = false
): array {
    $reservationId = gcv_pix_safe_id($reservationId);
    $email = strtolower(trim($email));
    $res = $reservationId !== '' ? gcv_pix_read_reservation($reservationId) : null;
    if (!$res) {
        throw new GcvPixRefundException('not_found', 'Reserva não encontrada');
    }
    if (gcv_pix_effective_status($res) !== 'PAID') {
        throw new GcvPixRefundException('nothing', 'Só é possível estornar Pix de reserva paga.');
    }
    $gw = strtolower((string)($res['gateway'] ?? ''));
    if (in_array($gw, ['stripe', 'mercadopago'], true)) {
        throw new GcvPixRefundException('not_pix', 'Este pagamento não é Pix.');
    }
    $sale = null;
    try {
        $st = db()->prepare('SELECT * FROM gcv_sales WHERE reservation_id = ? AND deleted_at IS NULL LIMIT 1');
        $st->execute([$reservationId]);
        $sale = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    } catch (Throwable $e) {
        error_log('pix refund sale: ' . $e->getMessage());
    }
    if (!$trustCaller) {
        $stored = strtolower(trim((string)($sale['tourist_email'] ?? $res['email'] ?? '')));
        if ($stored !== '' && $stored !== $email) {
            throw new GcvPixRefundException('email', 'E-mail não confere');
        }
    }
    if ($sale && in_array(strtoupper((string)$sale['sale_status']), ['REFUNDED', 'CANCELLED'], true)) {
        return [
            'ok' => true,
            'already' => true,
            'full' => true,
            'partial' => false,
            'refunded_trips' => [],
            'refunded_cents' => 0,
            'status' => (string)$sale['sale_status'],
            'sale' => $sale,
        ];
    }

    $annotated = gcv_pix_refund_annotate_trips($res);
    $byIndex = [];
    foreach ($annotated as $i => $trip) {
        $idx = array_key_exists('trip_index', $trip) ? (int)$trip['trip_index'] : $i;
        if (!isset($annotated[$i]['destino']) && $idx !== $i && isset($annotated[$idx])) {
            // keep file order; trip_index from state may be 0 when row missing
        }
        $trip['trip_index'] = $i;
        $byIndex[$i] = $trip;
    }

    $wanted = null;
    if ($tripIndexes !== null) {
        $wanted = [];
        foreach ($tripIndexes as $n) {
            $wanted[(int)$n] = true;
        }
        foreach (array_keys($wanted) as $idx) {
            $trip = $byIndex[$idx] ?? null;
            if (!$trip) {
                throw new GcvPixRefundException('nothing', 'Passeio não encontrado nesta reserva.');
            }
            if (!empty($trip['confirmed'])) {
                throw new GcvPixRefundException('trip_confirmed', 'Passeio confirmado não pode ser cancelado nem estornado.');
            }
        }
    }

    $targets = [];
    foreach ($byIndex as $i => $trip) {
        if (empty($trip['can_cancel'])) {
            continue;
        }
        if ($wanted !== null && empty($wanted[$i])) {
            continue;
        }
        if ($onlyDue && !gcv_pix_trip_is_due($trip)) {
            continue;
        }
        $targets[] = $trip;
    }
    if (!$targets) {
        if ($onlyDue || ($tripIndexes === null)) {
            return [
                'ok' => true,
                'already' => true,
                'full' => false,
                'partial' => true,
                'refunded_trips' => [],
                'refunded_cents' => 0,
                'status' => 'PAID',
                'sale' => $sale,
            ];
        }
        throw new GcvPixRefundException('nothing', 'Não há passeio em formação para estornar nesta reserva.');
    }

    $original = gcv_pix_refund_original_cents($res, $sale);
    $already = gcv_pix_refund_already_cents($res);
    $remaining = max(0, $original - $already);
    $shares = gcv_pix_refund_shares($res, array_values($byIndex), $original);
    $openCount = 0;
    foreach ($byIndex as $trip) {
        if (!empty($trip['can_cancel'])) {
            $openCount++;
        }
    }
    $sum = 0;
    foreach ($targets as &$target) {
        $idx = (int)$target['trip_index'];
        $cents = max(0, (int)$target['cents']);
        if ($cents <= 0) {
            $cents = max(0, (int)($shares[$idx] ?? 0));
        }
        $target['cents'] = $cents;
        $sum += $cents;
    }
    unset($target);
    if ($openCount === count($targets) && $remaining > 0 && $sum !== $remaining) {
        $last = count($targets) - 1;
        $targets[$last]['cents'] = max(0, (int)$targets[$last]['cents'] + ($remaining - $sum));
        $sum = $remaining;
    }
    if ($sum <= 0 || $sum > $remaining) {
        throw new GcvPixRefundException('nothing', 'Valor de estorno inválido para esta reserva.');
    }

    $e2e = gcv_pix_refund_e2e($res);
    if ($e2e === '') {
        throw new GcvPixRefundException('bank', 'Não achei o Pix desta reserva no banco para devolver.');
    }

    $done = [];
    foreach ($targets as $target) {
        $cents = (int)$target['cents'];
        if ($cents <= 0) {
            continue;
        }
        $idx = (int)$target['trip_index'];
        $failed = 0;
        foreach (is_array($res['pix_refunds'] ?? null) ? $res['pix_refunds'] : [] as $rf) {
            if (is_array($rf) && (int)($rf['trip_index'] ?? -1) === $idx && strtoupper((string)($rf['status'] ?? '')) === 'NAO_REALIZADO') {
                $failed++;
            }
        }
        $id = substr(preg_replace('/[^A-Z0-9]/', '', $reservationId) . 'T' . $idx . ($failed ? 'R' . ($failed + 1) : ''), 0, 35);
        $label = trim((string)($target['date_label'] ?? '') . ' ' . (string)($target['title'] ?? ''));
        $bank = gcv_sicoob_pix_devolucao($e2e, $id, $cents, 'Estorno ' . $reservationId . ' ' . $label);
        if (empty($bank['ok'])) {
            $res['pix_refunds'] = is_array($res['pix_refunds'] ?? null) ? $res['pix_refunds'] : [];
            $res['pix_refunds'][] = [
                'trip_index' => $idx,
                'id' => $id,
                'cents' => $cents,
                'status' => 'NAO_REALIZADO',
                'at' => gmdate('c'),
            ];
            gcv_pix_write_reservation($res);
            if ($done) {
                gcv_pix_refund_commit($res, $sale, $done, $notifyClient);
            }
            throw new GcvPixRefundException('bank', 'O banco não concluiu o estorno do Pix. Tente de novo.');
        }
        $done[] = $target + ['devolucao_id' => $id, 'bank_status' => (string)$bank['status']];
    }
    if (!$done) {
        throw new GcvPixRefundException('nothing', 'Não há passeio em formação para estornar nesta reserva.');
    }
    return gcv_pix_refund_commit($res, $sale, $done, $notifyClient);
}

/**
 * @param array<string,mixed> $reservation
 * @param array<string,mixed>|null $sale
 * @param list<array<string,mixed>> $done
 * @return array<string,mixed>
 */
function gcv_pix_refund_commit(array $reservation, ?array $sale, array $done, bool $notifyClient): array
{
    $rid = gcv_pix_safe_id((string)($reservation['reservation_id'] ?? ''));
    $reservation = gcv_pix_read_reservation($rid) ?: $reservation;
    $refundCents = 0;
    $indexes = [];
    $titles = [];
    foreach ($done as $trip) {
        $idx = (int)$trip['trip_index'];
        $cents = (int)$trip['cents'];
        $refundCents += $cents;
        $indexes[] = $idx;
        $label = trim((string)($trip['date_label'] ?? '') . ' ' . (string)($trip['title'] ?? ''));
        if ($label !== '') {
            $titles[] = $label;
        }
        $reservation['pix_refunds'] = is_array($reservation['pix_refunds'] ?? null) ? $reservation['pix_refunds'] : [];
        $reservation['pix_refunds'][] = [
            'trip_index' => $idx,
            'id' => (string)($trip['devolucao_id'] ?? ''),
            'cents' => $cents,
            'status' => (string)($trip['bank_status'] ?? 'EM_PROCESSAMENTO'),
            'e2e' => (string)($reservation['sicoob_end_to_end_id'] ?? ''),
            'at' => gmdate('c'),
        ];
        if (isset($reservation['trips'][$idx]) && is_array($reservation['trips'][$idx])) {
            $reservation['trips'][$idx]['refunded'] = true;
            $reservation['trips'][$idx]['lifecycle'] = 'cancelada';
        }
        try {
            db()->prepare(
                "UPDATE gcv_booking_trips SET decision = 'CANCELLED', decided_at = NOW()
                 WHERE reservation_id = ? AND trip_index = ? AND decision NOT IN ('CONFIRMED','CAPTURED')"
            )->execute([$rid, $idx]);
        } catch (Throwable $e) {
            error_log('pix refund trip: ' . $e->getMessage());
        }
    }

    try {
        require_once __DIR__ . '/authorization.php';
        gcv_auth_release_seats($reservation, $indexes);
    } catch (Throwable $e) {
        error_log('pix refund seats: ' . $e->getMessage());
    }

    $annotated = gcv_pix_refund_annotate_trips($reservation);
    $stillActive = false;
    foreach ($annotated as $trip) {
        if (empty($trip['refunded'])) {
            $stillActive = true;
        }
    }
    $full = !$stillActive;
    if ($full) {
        $reservation['status'] = 'CANCELLED';
        $reservation['cancelled_at'] = gmdate('c');
    }
    gcv_pix_write_reservation($reservation);

    $saleAfter = $sale;
    if ($sale) {
        $saleAfter = gcv_pix_refund_apply_sale($sale, $reservation, $done, $refundCents, $full);
    }
    gcv_pix_refund_ledger($rid, $refundCents, $full);
    try {
        db()->prepare('UPDATE gcv_pix_payments SET status = ? , updated_at = NOW() WHERE reservation_id = ?')
            ->execute([$full ? 'REFUNDED' : 'PAID', $rid]);
    } catch (Throwable $e) {
        error_log('pix refund payment row: ' . $e->getMessage());
    }

    $kept = [];
    foreach ($annotated as $trip) {
        if (!empty($trip['confirmed'])) {
            $label = trim((string)($trip['date_label'] ?? '') . ' ' . (string)($trip['title'] ?? ''));
            if ($label !== '') {
                $kept[] = $label;
            }
        }
    }
    if ($notifyClient) {
        gcv_pix_refund_notify($reservation, $saleAfter, $done, $refundCents, !$full, $titles);
    }

    return [
        'ok' => true,
        'already' => false,
        'full' => $full,
        'partial' => !$full,
        'refunded_trips' => $indexes,
        'refunded_cents' => $refundCents,
        'refunded_details' => $done,
        'kept' => $kept,
        'status' => $full ? 'REFUNDED' : 'PAID',
        'message' => $full
            ? 'Reserva cancelada. O Pix foi devolvido para a conta de origem.'
            : 'Estorno parcial feito. Os passeios confirmados desta reserva continuam valendo.',
        'sale' => $saleAfter,
        'lifecycle' => $full ? 'cancelada' : 'em_formacao',
    ];
}

/**
 * @param array<string,mixed> $sale
 * @param array<string,mixed> $reservation
 * @param list<array<string,mixed>> $done
 * @return array<string,mixed>
 */
function gcv_pix_refund_apply_sale(array $sale, array $reservation, array $done, int $refundCents, bool $full): array
{
    $snap = is_array($reservation['pix_money_snapshot'] ?? null) ? $reservation['pix_money_snapshot'] : null;
    if (!$snap) {
        $snap = [
            'sold' => (int)($sale['sold_price_cents'] ?? 0),
            'guide' => (int)($sale['guide_amount_cents'] ?? 0),
            'platform' => (int)($sale['platform_revenue_cents'] ?? 0),
        ];
        $rid = (string)($reservation['reservation_id'] ?? '');
        $fresh = $rid !== '' ? gcv_pix_read_reservation($rid) : null;
        if ($fresh) {
            $fresh['pix_money_snapshot'] = $snap;
            gcv_pix_write_reservation($fresh);
        }
    }
    $sold = max(1, (int)$snap['sold']);
    $guideNow = (int)($sale['guide_amount_cents'] ?? 0);
    $platNow = (int)($sale['platform_revenue_cents'] ?? 0);
    if ($full) {
        $guideCut = $guideNow;
        $platCut = $platNow;
    } else {
        $guideCut = min($guideNow, (int)round(((int)$snap['guide']) * $refundCents / $sold));
        $platCut = min($platNow, max(0, $refundCents - $guideCut));
        if ($guideCut + $platCut < $refundCents && $guideNow - $guideCut > 0) {
            $guideCut = min($guideNow, $guideCut + ($refundCents - $guideCut - $platCut));
        }
    }
    $saleExc = (int)($sale['excursion_id'] ?? 0);
    $remainPeople = 0;
    try {
        require_once __DIR__ . '/authorization.php';
        foreach (gcv_auth_trip_rows((string)$sale['reservation_id']) as $row) {
            if (in_array((string)($row['decision'] ?? ''), ['CANCELLED', 'RELEASED'], true)) {
                continue;
            }
            if ($saleExc > 0 && (int)($row['excursion_id'] ?? 0) !== $saleExc) {
                continue;
            }
            $remainPeople += max(0, (int)($row['people'] ?? 0));
        }
    } catch (Throwable $e) {
        $remainPeople = (int)($sale['spots'] ?? 1);
    }
    try {
        if ($full) {
            db()->prepare(
                "UPDATE gcv_sales
                 SET sale_status = 'REFUNDED', payout_status = 'PAYOUT_BLOCKED',
                     guide_amount_cents = 0, platform_revenue_cents = 0, updated_at = NOW()
                 WHERE id = ?"
            )->execute([(int)$sale['id']]);
        } else {
            db()->prepare(
                'UPDATE gcv_sales
                 SET guide_amount_cents = ?, platform_revenue_cents = ?, spots = ?, updated_at = NOW()
                 WHERE id = ? AND sale_status = \'PAID\''
            )->execute([
                max(0, $guideNow - $guideCut),
                max(0, $platNow - $platCut),
                max(0, $remainPeople),
                (int)$sale['id'],
            ]);
        }
        $st = db()->prepare('SELECT * FROM gcv_sales WHERE id = ? LIMIT 1');
        $st->execute([(int)$sale['id']]);
        $sale = $st->fetch(PDO::FETCH_ASSOC) ?: $sale;
    } catch (Throwable $e) {
        error_log('pix refund sale update: ' . $e->getMessage());
    }
    $seen = [];
    foreach ($done as $trip) {
        $excId = (int)($trip['excursion_id'] ?? 0);
        if ($excId <= 0 || isset($seen[$excId])) {
            continue;
        }
        $seen[$excId] = true;
        try {
            require_once dirname(__DIR__) . '/marketplace/sale_service.php';
            if (function_exists('gcv_sale_refresh_booked_people')) {
                gcv_sale_refresh_booked_people($excId);
            }
        } catch (Throwable $e) {
            error_log('pix refund booked: ' . $e->getMessage());
        }
    }
    return $sale;
}

function gcv_pix_refund_ledger(string $reservationId, int $addCents, bool $full): void
{
    if ($addCents <= 0) {
        return;
    }
    try {
        require_once __DIR__ . '/ledger.php';
        $st = db()->prepare("SELECT * FROM gcv_payment_transactions WHERE reservation_id = ? AND method = 'pix' ORDER BY id DESC LIMIT 1");
        $st->execute([$reservationId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return;
        }
        $gross = (int)($row['gross_cents'] ?? 0);
        $refunded = min($gross > 0 ? $gross : PHP_INT_MAX, (int)($row['refunded_cents'] ?? 0) + $addCents);
        $status = ($full || ($gross > 0 && $refunded >= $gross)) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        gcv_ledger_upsert([
            'reservation_id' => $reservationId,
            'gateway' => (string)$row['gateway'],
            'method' => 'pix',
            'refunded_cents' => $refunded,
            'status' => $status,
        ]);
    } catch (Throwable $e) {
        error_log('pix refund ledger: ' . $e->getMessage());
    }
}

/**
 * @param array<string,mixed> $reservation
 * @param array<string,mixed>|null $sale
 * @param list<array<string,mixed>> $done
 * @param list<string> $titles
 */
function gcv_pix_refund_notify(array $reservation, ?array $sale, array $done, int $cents, bool $partial, array $titles): void
{
    try {
        require_once dirname(__DIR__) . '/notify_ops.php';
    } catch (Throwable $e) {
        return;
    }
    $loc = (string)($reservation['locale'] ?? 'pt');
    if ($sale && function_exists('gcv_ops_sale_locale')) {
        $loc = gcv_ops_sale_locale($sale);
    }
    if (!in_array($loc, ['pt', 'en', 'es'], true)) {
        $loc = 'pt';
    }
    $money = function_exists('gcv_ops_brl') ? gcv_ops_brl($cents) : ('R$ ' . number_format($cents / 100, 2, ',', '.'));
    $code = strtoupper((string)($reservation['reservation_id'] ?? ''));
    $list = $titles ? implode("\n", array_map(static fn ($t) => '• ' . $t, $titles)) : '';
    if ($loc === 'en') {
        $text = $partial
            ? "Partial Pix refund.\n\nCode: {$code}\nRefunded: {$money}\nCancelled tours:\n{$list}\n\nConfirmed tours on this booking stay active and were not cancelled."
            : "Pix refunded.\n\nCode: {$code}\nAmount: {$money}\nThe money returns to the account that sent the Pix.";
        $subject = $partial ? 'Partial Pix refund — Guia Chapada Veadeiros' : 'Pix refund — Guia Chapada Veadeiros';
        $guideText = "Client cancelled one tour on booking {$code}. Only that amount was refunded. Confirmed tours stay.";
    } elseif ($loc === 'es') {
        $text = $partial
            ? "Reembolso parcial del Pix.\n\nCódigo: {$code}\nDevuelto: {$money}\nPaseos cancelados:\n{$list}\n\nLos paseos ya confirmados de esta reserva siguen valiendo y no se cancelaron."
            : "Pix devuelto.\n\nCódigo: {$code}\nValor: {$money}\nEl dinero vuelve a la cuenta desde la que salió el Pix.";
        $subject = $partial ? 'Reembolso parcial del Pix — Guia Chapada Veadeiros' : 'Pix devuelto — Guia Chapada Veadeiros';
        $guideText = "El cliente canceló un paseo de la reserva {$code}. Solo se devolvió ese valor. Los paseos confirmados siguen.";
    } else {
        $text = $partial
            ? "Estorno parcial do Pix.\n\nCódigo: {$code}\nDevolvido: {$money}\nPasseios cancelados:\n{$list}\n\nOs passeios já confirmados desta reserva continuam valendo e não foram cancelados."
            : "Pix devolvido.\n\nCódigo: {$code}\nValor: {$money}\nO dinheiro volta para a conta de onde o Pix saiu.";
        $subject = $partial ? 'Estorno parcial do Pix — Guia Chapada Veadeiros' : 'Pix devolvido — Guia Chapada Veadeiros';
        $guideText = "Cliente cancelou um passeio da reserva {$code}. Só esse valor foi estornado. Passeio confirmado continua.";
    }
    $payload = $sale ?: [
        'tourist_email' => (string)($reservation['email'] ?? ''),
        'tourist_phone' => (string)($reservation['phone'] ?? $reservation['telefone'] ?? ''),
        'reservation_id' => $code,
        'locale' => $loc,
    ];
    try {
        gcv_ops_wa_client($payload, $text, ['kind' => $partial ? 'pix_partial_refund' : 'pix_refund']);
    } catch (Throwable $e) {
        error_log('pix refund wa: ' . $e->getMessage());
    }
    $mail = trim((string)($payload['tourist_email'] ?? ''));
    if ($mail !== '' && function_exists('gcv_ops_mail_plain')) {
        try {
            gcv_ops_mail_plain($mail, $subject, $text);
        } catch (Throwable $e) {
            error_log('pix refund mail: ' . $e->getMessage());
        }
    }
    $seen = [];
    foreach ($done as $trip) {
        $guideId = (int)($trip['guide_user_id'] ?? 0);
        if ($guideId <= 0 || isset($seen[$guideId])) {
            continue;
        }
        $seen[$guideId] = true;
        try {
            gcv_ops_wa_guide($guideId, $guideText, ['kind' => 'pix_partial_refund']);
        } catch (Throwable $e) {
            error_log('pix refund guide: ' . $e->getMessage());
        }
    }
}

/**
 * @return array{checked:int,refunded:int,ids:list<string>}
 */
function gcv_pix_refund_scan_unconfirmed(int $max = 40): array
{
    $out = ['checked' => 0, 'refunded' => 0, 'ids' => []];
    $max = max(1, min(80, $max));
    try {
        $rows = db()->query(
            "SELECT DISTINCT reservation_id FROM gcv_booking_trips
             WHERE payment_kind = 'pix' AND decision = 'UNDECIDED' AND starts_at IS NOT NULL
               AND starts_at <= DATE_ADD(NOW(), INTERVAL 3 DAY)
             ORDER BY starts_at ASC
             LIMIT {$max}"
        )->fetchAll(PDO::FETCH_COLUMN) ?: [];
    } catch (Throwable $e) {
        error_log('pix refund scan: ' . $e->getMessage());
        return $out;
    }
    foreach ($rows as $rid) {
        $rid = gcv_pix_safe_id((string)$rid);
        if ($rid === '') {
            continue;
        }
        $out['checked']++;
        $res = gcv_pix_read_reservation($rid);
        if (!$res || gcv_pix_effective_status($res) !== 'PAID') {
            continue;
        }
        try {
            $result = gcv_pix_refund_reservation($rid, (string)($res['email'] ?? ''), null, true, true, true);
            if (!empty($result['refunded_trips'])) {
                $out['refunded']++;
                $out['ids'][] = $rid;
            }
        } catch (Throwable $e) {
            error_log('pix refund scan ' . $rid . ': ' . $e->getMessage());
        }
    }
    return $out;
}
