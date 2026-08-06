<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../settings.php';
require_once __DIR__ . '/constants.php';
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
        return $sale;
    }

    $amountReais = (float)($reservation['amount'] ?? 0);
    $soldCents = (int)round($amountReais * 100);
    if ($soldCents <= 0) {
        throw new InvalidArgumentException('Valor da venda inválido');
    }

    $spots = max(1, (int)($reservation['qty'] ?? $reservation['people'] ?? $reservation['spots'] ?? 1));
    $excursion = gcv_sale_resolve_excursion($reservation);
    $guide = gcv_sale_resolve_guide($excursion);

    $unitCents = $excursion
        ? (int)($excursion['price_cents'] ?? 0)
        : (int)round($soldCents / $spots);
    if ($unitCents <= 0) {
        $unitCents = (int)round($soldCents / $spots);
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
        $unitGuide = (int)($excursion['guide_net_cents'] ?? 0);
        $unitPlatform = max(0, $unitCents - $unitGuide);
        $commissionPct = (float)($excursion['commission_pct_applied'] ?? 0);
        $ruleId = isset($excursion['commission_rule_id']) ? (int)$excursion['commission_rule_id'] : null;
    } else {
        $unitGuide = (int)($excursion['guide_payout_planned_cents'] ?? $excursion['guide_net_cents'] ?? 0);
        if ($unitGuide <= 0 && $unitCents > 0) {
            // legado: usa comissão percentual se não houver repasse definido
            $commissionPct = (float)($excursion['commission_pct_applied'] ?? setting('platform_commission_pct', '16'));
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
        $delayHours = (int)setting('payout_delay_hours', '6');
        if ($delayHours < 0) {
            $delayHours = 6;
        }
        try {
            $dt = new DateTimeImmutable($startsAt, new DateTimeZone('America/Sao_Paulo'));
            $scheduledPayoutAt = $dt->modify('+' . $delayHours . ' hours')->format('Y-m-d H:i:s');
        } catch (Throwable $e) {
            $scheduledPayoutAt = null;
        }
    }

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

    $pdo->beginTransaction();
    try {
        if ($sale) {
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
            $saleId = (int)$sale['id'];
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
            $saleId = (int)$pdo->lastInsertId();
        }

        $get = $pdo->prepare('SELECT * FROM gcv_sales WHERE id = ?');
        $get->execute([$saleId]);
        $sale = $get->fetch(PDO::FETCH_ASSOC) ?: [];

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

    return $sale;
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
function gcv_sale_resolve_excursion(array $reservation): ?array
{
    $pdo = db();
    $excId = (int)($reservation['excursion_id'] ?? $reservation['cms_excursion_id'] ?? 0);
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

    $cartId = trim((string)($reservation['cart_id'] ?? $reservation['cartId'] ?? ''));
    $slug = trim((string)($reservation['cart_slug'] ?? ''));
    if ($cartId !== '' || $slug !== '') {
        $needle = $slug !== '' ? $slug : $cartId;
        $stmt = $pdo->prepare(
            'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             WHERE e.cart_slug = ? OR e.id = ?
             ORDER BY e.id DESC LIMIT 1'
        );
        $maybeId = ctype_digit($needle) ? (int)$needle : 0;
        $stmt->execute([$needle, $maybeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }
    }

    // Fallback: destino + data
    $destino = trim((string)($reservation['destino'] ?? ''));
    $date = trim((string)($reservation['date_iso'] ?? $reservation['date'] ?? ''));
    if ($destino !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $stmt = $pdo->prepare(
            "SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             WHERE e.date_iso = ? AND e.status IN ('published','soldout')
               AND (a.title_pt LIKE ? OR e.notes_pt LIKE ?)
             ORDER BY e.id DESC LIMIT 1"
        );
        $like = '%' . $destino . '%';
        $stmt->execute([$date, $like, $like]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
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
