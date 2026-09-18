<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../settings.php';
require_once __DIR__ . '/../excursion_status.php';
require_once __DIR__ . '/../mailer.php';
require_once __DIR__ . '/../purchase_notify.php';
require_once __DIR__ . '/../notify_ops.php';
require_once __DIR__ . '/audit_service.php';

/**
 * Snapshot financeiro imutável de vendas.
 * Nunca recalcular a partir do preço atual da excursão.
 */

/**
 * Cria (ou retorna) venda + pagamento PIX a partir de reserva Pix confirmada.
 *
 * @param array<string,mixed> $reservation
 * @return array<string,mixed>
 */
function gcv_sale_capture_from_pix_reservation(array $reservation, string $source = 'webhook'): array
{
    gcv_marketplace_ensure_schema();
    if (!empty($reservation['kind']) && (string)$reservation['kind'] === 'transfer') {
        require_once __DIR__ . '/transfer_service.php';
        gcv_transfer_on_balance_paid($reservation);
        return ['ok' => true, 'kind' => 'transfer', 'sale_status' => 'PAID'];
    }

    $reservationId = strtoupper(trim((string)($reservation['reservation_id'] ?? '')));
    if ($reservationId === '' || !preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
        throw new InvalidArgumentException('reservation_id inválido');
    }

    $pdo = db();
    $existing = $pdo->prepare('SELECT * FROM gcv_sales WHERE reservation_id = ? AND deleted_at IS NULL LIMIT 1');
    $existing->execute([$reservationId]);
    $sale = $existing->fetch(PDO::FETCH_ASSOC);
    if ($sale && ($sale['sale_status'] ?? '') === GcvSaleStatus::PAID) {
        gcv_sale_upsert_pix_payment($sale, $reservation, GcvSaleStatus::PAID);
        $phone = trim((string)($reservation['phone'] ?? $reservation['telefone'] ?? $sale['tourist_phone'] ?? ''));
        if ($phone !== '' && empty($sale['tourist_phone'])) {
            try {
                $pdo->prepare('UPDATE gcv_sales SET tourist_phone = ? WHERE id = ?')->execute([$phone, (int)$sale['id']]);
                $sale['tourist_phone'] = $phone;
            } catch (Throwable $e) {
                error_log('sale tourist_phone: ' . $e->getMessage());
            }
        }
        try {
            $excursion = gcv_sale_resolve_excursion($reservation);
            gcv_ops_notify_client_pix_paid($sale, $excursion);
        } catch (Throwable $e) {
            error_log('notify client pix paid (already paid): ' . $e->getMessage());
        }
        try {
            gcv_notify_admin_purchase($reservation);
        } catch (Throwable $e) {
            error_log('notify admin purchase (already paid): ' . $e->getMessage());
        }
        return $sale;
    }

    $amountReais = (float)($reservation['amount'] ?? 0);
    $soldCents = (int)round($amountReais * 100);
    if ($soldCents <= 0) {
        throw new InvalidArgumentException('Valor da venda inválido');
    }

    $trip = gcv_sale_first_trip($reservation);
    $spots = max(1, (int)($reservation['qty'] ?? $reservation['people'] ?? $reservation['spots'] ?? $trip['qty'] ?? $trip['people'] ?? 1));
    $excursion = gcv_sale_resolve_excursion($reservation);
    $guide = gcv_sale_resolve_guide($excursion);

    $unitCents = $excursion
        ? (int)($excursion['price_cents'] ?? 0)
        : (int)round($soldCents / $spots);
    if ($unitCents <= 0) {
        $unitCents = (int)round($soldCents / $spots);
    }

    $withTransport = gcv_reservation_has_transport($reservation);
    if ($withTransport && $excursion) {
        $priceT = (int)($excursion['price_transport_cents'] ?? 0);
        if ($priceT > 0) {
            $unitCents = $priceT;
        }
    }

    $businessMode = GcvBusinessMode::normalize(
        $excursion['business_mode'] ?? null,
        GcvBusinessMode::ADMINISTRATIVE
    );
    $createdByOrigin = GcvCreatedBy::normalize(
        $excursion['created_by_origin'] ?? null,
        GcvCreatedBy::ADMIN
    );

    // Snapshot: valores congelados da excursão no momento da venda
    if ($businessMode === GcvBusinessMode::GUIDE_MARKETPLACE) {
        $unitGuide = $withTransport
            ? (int)($excursion['guide_net_transport_cents'] ?? $excursion['guide_net_cents'] ?? 0)
            : (int)($excursion['guide_net_cents'] ?? 0);
        $unitPlatform = max(0, $unitCents - $unitGuide);
        $commissionPct = (float)($excursion['commission_pct_applied'] ?? 0);
        $ruleId = isset($excursion['commission_rule_id']) ? (int)$excursion['commission_rule_id'] : null;
    } else {
        $unitGuide = $withTransport
            ? (int)($excursion['guide_net_transport_cents'] ?? $excursion['guide_payout_planned_cents'] ?? $excursion['guide_net_cents'] ?? 0)
            : (int)($excursion['guide_payout_planned_cents'] ?? $excursion['guide_net_cents'] ?? 0);
        if ($unitGuide <= 0 && $unitCents > 0) {
            // legado: usa comissão percentual se não houver repasse definido
            $commissionPct = (float)($excursion['commission_pct_applied'] ?? setting('platform_commission_pct', '10'));
            $unitPlatform = (int)round($unitCents * ($commissionPct / 100.0));
            $unitGuide = max(0, $unitCents - $unitPlatform);
            $ruleId = isset($excursion['commission_rule_id']) ? (int)$excursion['commission_rule_id'] : null;
        } else {
            $unitPlatform = max(0, $unitCents - $unitGuide);
            $commissionPct = $unitCents > 0 ? round(($unitPlatform / $unitCents) * 100, 3) : 0.0;
            $ruleId = isset($excursion['commission_rule_id']) ? (int)$excursion['commission_rule_id'] : null;
        }
    }

    $guideAmount = $unitGuide * $spots;
    $platformRevenue = max(0, $soldCents - $guideAmount);
    // Se o total cobrado divergir do unit*spots (descontos), ajusta plataforma
    if ($guideAmount > $soldCents) {
        $guideAmount = $soldCents;
        $platformRevenue = 0;
    }

    $startsAt = null;
    $scheduledPayoutAt = null;
    if ($excursion && !empty($excursion['date_iso'])) {
        $time = (string)($excursion['departure_time'] ?? '08:00:00');
        if (strlen($time) === 5) {
            $time .= ':00';
        }
        $startsAt = $excursion['date_iso'] . ' ' . $time;
        if (!function_exists('gcv_payout_compute_scheduled_at')) {
            require_once __DIR__ . '/payout_service.php';
        }
        try {
            $scheduledPayoutAt = gcv_payout_compute_scheduled_at($startsAt);
        } catch (Throwable $e) {
            $scheduledPayoutAt = $excursion['date_iso'] . ' ' . (function_exists('gcv_payout_after_sql_time') ? gcv_payout_after_sql_time() : '16:20:00');
        }
    }

    $previousStatus = is_array($sale) ? strtoupper((string)($sale['sale_status'] ?? '')) : '';

    $paidAt = null;
    $status = strtoupper((string)($reservation['status'] ?? 'PENDING')) === 'PAID'
        ? GcvSaleStatus::PAID
        : GcvSaleStatus::PENDING;
    if ($status === GcvSaleStatus::PAID) {
        $paidAtRaw = (string)($reservation['paid_at'] ?? 'now');
        try {
            $paidAt = (new DateTimeImmutable($paidAtRaw))->setTimezone(new DateTimeZone('America/Sao_Paulo'))->format('Y-m-d H:i:s');
        } catch (Throwable $e) {
            $paidAt = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d H:i:s');
        }
    }

    $salesCols = gcv_marketplace_column_map($pdo, 'gcv_sales') ?: [];
    $hasTransportCol = isset($salesCols['include_transport']);

    $pdo->beginTransaction();
    try {
        if ($sale) {
            if ($hasTransportCol) {
                $upd = $pdo->prepare(
                    'UPDATE gcv_sales SET
                      sale_status=?, paid_at=?, sold_price_cents=?, guide_amount_cents=?, platform_revenue_cents=?,
                      include_transport=?, updated_at=NOW()
                     WHERE id=?'
                );
                $upd->execute([
                    $status,
                    $paidAt,
                    $soldCents,
                    $guideAmount,
                    $platformRevenue,
                    $withTransport ? 1 : 0,
                    (int)$sale['id'],
                ]);
            } else {
                $upd = $pdo->prepare(
                    'UPDATE gcv_sales SET
                      sale_status=?, paid_at=?, sold_price_cents=?, guide_amount_cents=?, platform_revenue_cents=?,
                      updated_at=NOW()
                     WHERE id=?'
                );
                $upd->execute([
                    $status,
                    $paidAt,
                    $soldCents,
                    $guideAmount,
                    $platformRevenue,
                    (int)$sale['id'],
                ]);
            }
            $saleId = (int)$sale['id'];
        } else {
            if ($hasTransportCol) {
                $ins = $pdo->prepare(
                    'INSERT INTO gcv_sales (
                      reservation_id, excursion_id, tourist_user_id, tourist_name, tourist_email, tourist_cpf,
                      guide_user_id, guide_name, guide_cpf, guide_cnpj, city_id, city_name, attraction_id,
                      category_key, excursion_title, spots, sold_price_cents, unit_price_cents,
                      guide_amount_cents, platform_revenue_cents, commission_pct_applied, commission_rule_id,
                      business_mode, created_by_origin, sale_status, payout_status,
                      excursion_starts_at, scheduled_payout_at, paid_at, include_transport, sold_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())'
                );
                $ins->execute([
                    $reservationId,
                    $excursion ? (int)$excursion['id'] : null,
                    null,
                    trim((string)($reservation['name'] ?? $reservation['customer_name'] ?? '')) ?: null,
                    trim((string)($reservation['email'] ?? '')) ?: null,
                    preg_replace('/\D+/', '', (string)($reservation['cpf'] ?? '')) ?: null,
                    $guide['user_id'],
                    $guide['name'],
                    $guide['cpf'],
                    $guide['cnpj'],
                    $excursion ? (int)($excursion['departure_city_id'] ?? 0) ?: null : null,
                    $excursion['departure_city_name'] ?? null,
                    $excursion ? (int)($excursion['attraction_id'] ?? 0) ?: null : null,
                    null,
                    $excursion['attraction_title'] ?? ($reservation['destino'] ?? null),
                    $spots,
                    $soldCents,
                    $unitCents,
                    $guideAmount,
                    $platformRevenue,
                    $commissionPct ?? 0,
                    $ruleId ?? null,
                    $businessMode,
                    $createdByOrigin,
                    $status,
                    GcvPayoutStatus::PENDING,
                    $startsAt,
                    $scheduledPayoutAt,
                    $paidAt,
                    $withTransport ? 1 : 0,
                ]);
            } else {
                $ins = $pdo->prepare(
                    'INSERT INTO gcv_sales (
                      reservation_id, excursion_id, tourist_user_id, tourist_name, tourist_email, tourist_cpf,
                      guide_user_id, guide_name, guide_cpf, guide_cnpj, city_id, city_name, attraction_id,
                      category_key, excursion_title, spots, sold_price_cents, unit_price_cents,
                      guide_amount_cents, platform_revenue_cents, commission_pct_applied, commission_rule_id,
                      business_mode, created_by_origin, sale_status, payout_status,
                      excursion_starts_at, scheduled_payout_at, paid_at, sold_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())'
                );
                $ins->execute([
                    $reservationId,
                    $excursion ? (int)$excursion['id'] : null,
                    null,
                    trim((string)($reservation['name'] ?? $reservation['customer_name'] ?? '')) ?: null,
                    trim((string)($reservation['email'] ?? '')) ?: null,
                    preg_replace('/\D+/', '', (string)($reservation['cpf'] ?? '')) ?: null,
                    $guide['user_id'],
                    $guide['name'],
                    $guide['cpf'],
                    $guide['cnpj'],
                    $excursion ? (int)($excursion['departure_city_id'] ?? 0) ?: null : null,
                    $excursion['departure_city_name'] ?? null,
                    $excursion ? (int)($excursion['attraction_id'] ?? 0) ?: null : null,
                    null,
                    $excursion['attraction_title'] ?? ($reservation['destino'] ?? null),
                    $spots,
                    $soldCents,
                    $unitCents,
                    $guideAmount,
                    $platformRevenue,
                    $commissionPct ?? 0,
                    $ruleId ?? null,
                    $businessMode,
                    $createdByOrigin,
                    $status,
                    GcvPayoutStatus::PENDING,
                    $startsAt,
                    $scheduledPayoutAt,
                    $paidAt,
                ]);
            }
            $saleId = (int)$pdo->lastInsertId();
        }

        $get = $pdo->prepare('SELECT * FROM gcv_sales WHERE id = ?');
        $get->execute([$saleId]);
        $sale = $get->fetch(PDO::FETCH_ASSOC) ?: [];

        $phone = trim((string)($reservation['phone'] ?? $reservation['telefone'] ?? ''));
        if ($phone !== '' && $saleId > 0) {
            try {
                $pdo->prepare('UPDATE gcv_sales SET tourist_phone = ? WHERE id = ?')->execute([$phone, $saleId]);
                $sale['tourist_phone'] = $phone;
        } catch (Throwable $e) {
            error_log('sale tourist_phone: ' . $e->getMessage());
        }
        }

        gcv_sale_upsert_pix_payment($sale, $reservation, $status);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    gcv_audit_log('sale', (string)$saleId, 'capture_from_pix', null, null, null, [
        'reservation_id' => $reservationId,
        'source' => $source,
        'sale_status' => $status,
        'sold_price_cents' => $soldCents,
    ], 'WEBHOOK');

    $becamePaid = $status === GcvSaleStatus::PAID && $previousStatus !== GcvSaleStatus::PAID;
    if ($becamePaid) {
        $excId = $excursion ? (int)($excursion['id'] ?? 0) : 0;
        if ($excId <= 0) {
            $excId = (int)($sale['excursion_id'] ?? 0);
        }
        if ($excId > 0) {
            $justConfirmed = gcv_sale_refresh_booked_people($excId);
            try {
                $exSt = db()->prepare(
                    'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
                     FROM gcv_excursions e
                     LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
                     LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
                     WHERE e.id = ? LIMIT 1'
                );
                $exSt->execute([$excId]);
                $fresh = $exSt->fetch(PDO::FETCH_ASSOC);
                if ($fresh) {
                    $excursion = $fresh;
                }
            } catch (Throwable $e) {
                // usa snapshot anterior
            }
            if (!$justConfirmed) {
                gcv_sale_notify_guide_new_booking($sale, $excursion, $spots);
            }
        } else {
            gcv_sale_notify_guide_new_booking($sale, $excursion, $spots);
        }
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_client_pix_paid($sale, $excursion);
        } catch (Throwable $e) {
            error_log('notify client pix paid: ' . $e->getMessage());
        }
        try {
            gcv_notify_admin_purchase($reservation);
        } catch (Throwable $e) {
            error_log('notify admin purchase: ' . $e->getMessage());
        }
    }

    return $sale;
}

function gcv_sale_refresh_booked_people(int $excursionId): bool
{
    if ($excursionId <= 0) {
        return false;
    }
    $beforeLife = '';
    try {
        $row = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
        $row->execute([$excursionId]);
        $before = $row->fetch(PDO::FETCH_ASSOC) ?: [];
        if ($before) {
            $beforeLife = gcv_resolve_excursion_lifecycle($before);
        }
    } catch (Throwable $e) {
        $before = [];
    }
    try {
        db()->prepare(
            'UPDATE gcv_excursions e
             SET booked_people = LEAST(255, (
               SELECT COALESCE(SUM(s.spots), 0)
               FROM gcv_sales s
               WHERE s.excursion_id = e.id
                 AND s.deleted_at IS NULL
                 AND s.sale_status = \'PAID\'
             ))
             WHERE e.id = ?'
        )->execute([$excursionId]);
    } catch (Throwable $e) {
        error_log('gcv_sale_refresh_booked_people: ' . $e->getMessage());
        return false;
    }
    try {
        $row = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
        $row->execute([$excursionId]);
        $after = $row->fetch(PDO::FETCH_ASSOC) ?: [];
        if ($after && $beforeLife !== 'confirmada' && gcv_resolve_excursion_lifecycle($after) === 'confirmada') {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_confirmed($excursionId);
            return true;
        }
    } catch (Throwable $e) {
        error_log('gcv_sale_refresh_booked_people notify: ' . $e->getMessage());
    }
    return false;
}

/**
 * Cancela venda Pix paga (cliente). Notifica o guia.
 *
 * @return array<string,mixed>
 */
function gcv_sale_cancel_reservation(string $reservationId, string $email, bool $notifyClient = true): array
{
    gcv_marketplace_ensure_schema();
    $reservationId = strtoupper(trim($reservationId));
    $email = strtolower(trim($email));
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM gcv_sales WHERE reservation_id = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([$reservationId]);
    $sale = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$sale) {
        throw new RuntimeException('Reserva não encontrada');
    }
    $storedEmail = strtolower(trim((string)($sale['tourist_email'] ?? '')));
    if ($storedEmail !== '' && $storedEmail !== $email) {
        throw new RuntimeException('E-mail não confere');
    }
    if (($sale['sale_status'] ?? '') === GcvSaleStatus::CANCELLED) {
        return ['ok' => true, 'already' => true, 'sale' => $sale];
    }
    if (($sale['sale_status'] ?? '') !== GcvSaleStatus::PAID) {
        throw new RuntimeException('Só é possível cancelar reserva paga');
    }
    $excId = (int)($sale['excursion_id'] ?? 0);
    $exc = $excId > 0 ? (function () use ($excId) {
        $s = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
        $s->execute([$excId]);
        return $s->fetch(PDO::FETCH_ASSOC) ?: null;
    })() : null;
    $life = $exc ? gcv_resolve_excursion_lifecycle($exc) : 'em_formacao';
    $pdo->prepare(
        "UPDATE gcv_sales SET sale_status = 'CANCELLED', payout_status = 'PAYOUT_BLOCKED' WHERE id = ?"
    )->execute([(int)$sale['id']]);
    $sale['sale_status'] = GcvSaleStatus::CANCELLED;

    require_once dirname(__DIR__) . '/pix_reservation_store.php';
    $res = gcv_pix_read_reservation($reservationId);
    if ($res) {
        $res['status'] = 'CANCELLED';
        $res['cancelled_at'] = gmdate('c');
        gcv_pix_write_reservation($res);
        try {
            require_once dirname(__DIR__) . '/pix_seats_store.php';
            gcv_pix_seats_release_reservation($res);
        } catch (Throwable $e) {
            error_log('cancel seats: ' . $e->getMessage());
        }
    }
    if ($excId > 0) {
        gcv_sale_refresh_booked_people($excId);
        $s = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
        $s->execute([$excId]);
        $exc = $s->fetch(PDO::FETCH_ASSOC) ?: $exc;
    }
    require_once dirname(__DIR__) . '/notify_ops.php';
    gcv_ops_notify_guide_cancelled($sale, $exc, $life, $notifyClient);
    return ['ok' => true, 'lifecycle' => $life, 'sale' => $sale];
}

/**
 * @param array<string,mixed> $sale
 * @param array<string,mixed>|null $excursion
 */
function gcv_sale_notify_guide_new_booking(array $sale, ?array $excursion, int $spots): void
{
    try {
        gcv_ops_notify_guide_new_booking($sale, $excursion, $spots);
    } catch (Throwable $e) {
        error_log('gcv_ops_notify_guide_new_booking: ' . $e->getMessage());
    }
}

/**
 * @param array<string,mixed> $sale
 * @param array<string,mixed> $reservation
 */
function gcv_sale_upsert_pix_payment(array $sale, array $reservation, string $status): void
{
    $reservationId = (string)$sale['reservation_id'];
    $txid = trim((string)($reservation['txid'] ?? '')) ?: null;
    $e2e = trim((string)($reservation['end_to_end_id'] ?? $reservation['endToEndId'] ?? '')) ?: null;
    $amountCents = (int)($sale['sold_price_cents'] ?? 0);
    $paidAt = $sale['paid_at'] ?? null;
    $paidDate = null;
    $paidTime = null;
    if ($paidAt) {
        try {
            $dt = new DateTimeImmutable((string)$paidAt);
            $paidDate = $dt->format('Y-m-d');
            $paidTime = $dt->format('H:i:s');
        } catch (Throwable $e) {
            // ignore
        }
    }

    $pixKey = trim((string)(
        $reservation['pix_key'] ?? $_ENV['SICOOB_PIX_KEY'] ?? $_ENV['PLATFORM_PIX_KEY'] ?? ''
    )) ?: null;

    $existing = db()->prepare('SELECT id FROM gcv_pix_payments WHERE reservation_id = ? LIMIT 1');
    $existing->execute([$reservationId]);
    $row = $existing->fetch(PDO::FETCH_ASSOC);

    $pixStatus = $status === GcvSaleStatus::PAID ? 'PAID' : 'PENDING';
    $payload = json_encode([
        'txid' => $txid,
        'end_to_end_id' => $e2e,
        'reservation' => [
            'reservation_id' => $reservationId,
            'amount' => $reservation['amount'] ?? null,
            'status' => $reservation['status'] ?? null,
        ],
    ], JSON_UNESCAPED_UNICODE);

    if ($row) {
        db()->prepare(
            'UPDATE gcv_pix_payments SET
              sale_id=?, txid=COALESCE(?, txid), end_to_end_id=COALESCE(?, end_to_end_id),
              amount_cents=?, pix_key_used=COALESCE(?, pix_key_used), status=?,
              paid_at=?, paid_date=?, paid_time=?, raw_payload=?, updated_at=NOW()
             WHERE id=?'
        )->execute([
            (int)$sale['id'],
            $txid,
            $e2e,
            $amountCents,
            $pixKey,
            $pixStatus,
            $paidAt,
            $paidDate,
            $paidTime,
            $payload,
            (int)$row['id'],
        ]);
        return;
    }

    db()->prepare(
        'INSERT INTO gcv_pix_payments
         (sale_id, reservation_id, txid, end_to_end_id, amount_cents, pix_key_used, status,
          paid_at, paid_date, paid_time, provider, raw_payload, idempotency_key)
         VALUES (?,?,?,?,?,?,?,?,?,?,\'sicoob\',?,?)'
    )->execute([
        (int)$sale['id'],
        $reservationId,
        $txid,
        $e2e,
        $amountCents,
        $pixKey,
        $pixStatus,
        $paidAt,
        $paidDate,
        $paidTime,
        $payload,
        'pix:' . $reservationId,
    ]);
}

/** @return array<string,mixed>|null */
/**
 * @param array<string,mixed> $reservation
 * @return array<string,mixed>
 */
function gcv_sale_first_trip(array $reservation): array
{
    foreach (['trips', 'packages'] as $key) {
        $list = $reservation[$key] ?? null;
        if (!is_array($list)) {
            continue;
        }
        foreach ($list as $trip) {
            if (is_array($trip)) {
                return $trip;
            }
        }
    }
    return [];
}

function gcv_sale_resolve_excursion(array $reservation): ?array
{
    $pdo = db();
    $trip = gcv_sale_first_trip($reservation);
    $excId = (int)($reservation['excursion_id'] ?? $reservation['cms_excursion_id'] ?? $trip['excursion_id'] ?? 0);
    if ($excId > 0) {
        $stmt = $pdo->prepare(
            'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             WHERE e.id = ? LIMIT 1'
        );
        $stmt->execute([$excId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }
    }

    $cartId = trim((string)($reservation['cart_id'] ?? $reservation['cartId'] ?? $trip['cartId'] ?? $trip['cart_id'] ?? ''));
    $slug = trim((string)($reservation['cart_slug'] ?? ''));
    if ($cartId !== '' || $slug !== '') {
        $needle = $slug !== '' ? $slug : $cartId;
        $stmt = $pdo->prepare(
            'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             WHERE e.deleted_at IS NULL AND (e.cart_slug = ? OR e.id = ?)
             ORDER BY e.id DESC LIMIT 1'
        );
        $maybeId = ctype_digit($needle) ? (int)$needle : 0;
        $stmt->execute([$needle, $maybeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }
    }

    $destino = trim((string)($reservation['destino'] ?? $trip['destino'] ?? ''));
    $date = trim((string)($reservation['date_iso'] ?? $reservation['date'] ?? $trip['dateIso'] ?? $trip['date_iso'] ?? ''));
    $hora = substr(trim((string)($reservation['departure_time'] ?? $trip['hora'] ?? '')), 0, 5);
    $guideName = trim((string)($reservation['guide_name'] ?? $trip['guiaNome'] ?? $trip['guide'] ?? ''));
    if ($destino !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $sql = 'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             WHERE e.date_iso = ?
               AND e.deleted_at IS NULL
             ORDER BY e.id DESC LIMIT 20';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$date]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $destFold = function_exists('mb_strtolower') ? mb_strtolower($destino) : strtolower($destino);
        $guideFold = function_exists('mb_strtolower') ? mb_strtolower($guideName) : strtolower($guideName);
        $best = null;
        $bestScore = -1;
        foreach ($rows as $row) {
            $st = strtolower((string)($row['status'] ?? ''));
            if (in_array($st, ['cancelled', 'rejected'], true)) {
                continue;
            }
            if ($hora !== '' && preg_match('/^\d{2}:\d{2}$/', $hora)) {
                $rowTime = substr((string)($row['departure_time'] ?? ''), 0, 5);
                if ($rowTime !== $hora) {
                    continue;
                }
            }
            $title = function_exists('mb_strtolower')
                ? mb_strtolower((string)($row['attraction_title'] ?? ''))
                : strtolower((string)($row['attraction_title'] ?? ''));
            $notes = function_exists('mb_strtolower')
                ? mb_strtolower((string)($row['notes_pt'] ?? ''))
                : strtolower((string)($row['notes_pt'] ?? ''));
            if ($title === '' || (!str_contains($title, $destFold) && !str_contains($destFold, $title) && !str_contains($notes, $destFold))) {
                continue;
            }
            $score = 1;
            if ($hora !== '' && substr((string)($row['departure_time'] ?? ''), 0, 5) === $hora) {
                $score += 1;
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $row;
            }
        }
        if ($best) {
            return $best;
        }
    }

    return null;
}

/**
 * @param array<string,mixed>|null $excursion
 * @return array{user_id:?int,name:?string,cpf:?string,cnpj:?string}
 */
function gcv_sale_resolve_guide(?array $excursion): array
{
    $empty = ['user_id' => null, 'name' => null, 'cpf' => null, 'cnpj' => null];
    if (!$excursion || empty($excursion['guide_user_id'])) {
        return $empty;
    }
    $uid = (int)$excursion['guide_user_id'];
    $stmt = db()->prepare(
        'SELECT u.id, u.name, g.cpf, g.cnpj, g.full_name, gf.cpf AS fin_cpf, gf.cnpj AS fin_cnpj, gf.legal_name
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         LEFT JOIN gcv_guide_financial gf ON gf.guide_user_id = u.id AND gf.deleted_at IS NULL
         WHERE u.id = ? LIMIT 1'
    );
    $stmt->execute([$uid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return $empty;
    }
    return [
        'user_id' => (int)$row['id'],
        'name' => (string)($row['legal_name'] ?? $row['full_name'] ?? $row['name'] ?? ''),
        'cpf' => preg_replace('/\D+/', '', (string)($row['fin_cpf'] ?? $row['cpf'] ?? '')) ?: null,
        'cnpj' => preg_replace('/\D+/', '', (string)($row['fin_cnpj'] ?? $row['cnpj'] ?? '')) ?: null,
    ];
}
