<?php
declare(strict_types=1);

/**
 * Transferência de reserva quando o passeio original não fecha quórum.
 * Janelas sem conflito: troca abre em transfer_offer_hours (padrão 48 h)
 * e o cancelamento automático só em transfer_cancel_hours (padrão 12 h).
 * Origem: em formação. Destino: somente passeio confirmado do mesmo dia / mesma cidade.
 */
require_once dirname(__DIR__) . '/db.php';
require_once dirname(__DIR__) . '/settings.php';
require_once dirname(__DIR__) . '/excursion_status.php';
require_once dirname(__DIR__) . '/marketplace_schema.php';
require_once __DIR__ . '/constants.php';

function gcv_transfer_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_transfer_offers (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              sale_id BIGINT UNSIGNED NOT NULL,
              from_excursion_id INT UNSIGNED NOT NULL,
              to_excursion_id INT UNSIGNED NOT NULL,
              spots INT UNSIGNED NOT NULL DEFAULT 1,
              original_cents INT UNSIGNED NOT NULL DEFAULT 0,
              target_cents INT UNSIGNED NOT NULL DEFAULT 0,
              delta_cents INT NOT NULL DEFAULT 0,
              status VARCHAR(32) NOT NULL DEFAULT 'offered',
              pix_reservation_id VARCHAR(32) NULL,
              pix_brcode TEXT NULL,
              refund_cents INT UNSIGNED NOT NULL DEFAULT 0,
              notified_at DATETIME NULL,
              accepted_at DATETIME NULL,
              completed_at DATETIME NULL,
              expires_at DATETIME NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_transfer_sale (sale_id, status),
              INDEX idx_transfer_pix (pix_reservation_id),
              INDEX idx_transfer_from (from_excursion_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('gcv_transfer_ensure_schema: ' . $e->getMessage());
    }
    try {
        $cols = db()->query("SHOW COLUMNS FROM gcv_sales LIKE 'transfer_notified_at'")->fetch();
        if (!$cols) {
            db()->exec('ALTER TABLE gcv_sales ADD COLUMN transfer_notified_at DATETIME NULL');
        }
    } catch (Throwable $e) {
        error_log('gcv_sales transfer_notified_at: ' . $e->getMessage());
    }
}

function gcv_transfer_offer_hours(): int
{
    $n = (int)setting('transfer_offer_hours', 48);
    return max(2, min(96, $n));
}

/** Horas antes da saída em que o passeio em formação cancela sozinho (sempre menor que a oferta). */
function gcv_transfer_cancel_hours(): int
{
    $offer = gcv_transfer_offer_hours();
    $n = (int)setting('transfer_cancel_hours', 12);
    $n = max(0, min(72, $n));
    if ($n >= $offer) {
        $n = max(0, $offer - 1);
    }
    return $n;
}

function gcv_transfer_in_offer_window(?float $hours): bool
{
    if ($hours === null) {
        return false;
    }
    return $hours <= gcv_transfer_offer_hours() && $hours > gcv_transfer_cancel_hours();
}

function gcv_transfer_load_excursion(int $id): ?array
{
    if ($id <= 0) {
        return null;
    }
    $st = db()->prepare(
        "SELECT e.*, a.title_pt AS attraction_title, a.title_en AS attraction_title_en, a.title_es AS attraction_title_es,
                c.name AS departure_city_name, g.full_name AS guide_full_name, g.nickname AS guide_nickname, u.name AS guide_user_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.id = ? AND e.deleted_at IS NULL
         LIMIT 1"
    );
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_transfer_unit_cents(array $exc, bool $withTransport): int
{
    if ($withTransport) {
        $t = (int)($exc['price_transport_cents'] ?? 0);
        if ($t > 0) {
            return $t;
        }
    }
    return max(0, (int)($exc['price_cents'] ?? 0));
}

function gcv_transfer_remaining_seats(array $exc): int
{
    $max = max(1, (int)($exc['max_people'] ?? 12));
    $booked = max(0, (int)($exc['booked_people'] ?? 0));
    return max(0, $max - $booked);
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_transfer_find_targets(array $from, int $spots): array
{
    $date = (string)($from['date_iso'] ?? '');
    $cityId = (int)($from['departure_city_id'] ?? 0);
    $fromId = (int)($from['id'] ?? 0);
    if ($date === '' || $cityId <= 0 || $fromId <= 0 || $spots < 1) {
        return [];
    }
    $st = db()->prepare(
        "SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name,
                g.full_name AS guide_full_name, g.nickname AS guide_nickname, u.name AS guide_user_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.deleted_at IS NULL
           AND e.status IN ('published','soldout')
           AND e.date_iso = ?
           AND e.departure_city_id = ?
           AND e.id <> ?
         ORDER BY e.departure_time ASC, e.id ASC"
    );
    $st->execute([$date, $cityId, $fromId]);
    $out = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        if (gcv_transfer_remaining_seats($row) < $spots) {
            continue;
        }
        $life = gcv_resolve_excursion_lifecycle($row);
        if ($life !== 'confirmada') {
            continue;
        }
        $row['lifecycle'] = $life;
        $out[] = $row;
    }
    return $out;
}

function gcv_transfer_hours_to_start(array $exc, ?DateTimeImmutable $now = null): ?float
{
    $date = (string)($exc['date_iso'] ?? '');
    if ($date === '') {
        return null;
    }
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = $now ?: new DateTimeImmutable('now', $tz);
    $time = (string)($exc['departure_time'] ?? '08:00:00');
    if (strlen($time) === 5) {
        $time .= ':00';
    }
    try {
        $start = new DateTimeImmutable($date . ' ' . $time, $tz);
    } catch (Throwable $e) {
        return null;
    }
    return ($start->getTimestamp() - $now->getTimestamp()) / 3600;
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_transfer_offers_for_sale(int $saleId, bool $openOnly = true): array
{
    gcv_transfer_ensure_schema();
    $sql = 'SELECT o.*, e.date_iso, e.departure_time, e.attraction_id,
                   a.title_pt AS to_title, c.name AS to_city,
                   COALESCE(NULLIF(g.full_name,\'\'), NULLIF(g.nickname,\'\'), u.name) AS to_guide
            FROM gcv_transfer_offers o
            INNER JOIN gcv_excursions e ON e.id = o.to_excursion_id
            LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
            LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
            LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
            LEFT JOIN gcv_users u ON u.id = e.guide_user_id
            WHERE o.sale_id = ?';
    if ($openOnly) {
        $sql .= " AND o.status IN ('offered','awaiting_payment')";
    }
    $sql .= ' ORDER BY o.delta_cents ASC, o.id ASC';
    $st = db()->prepare($sql);
    $st->execute([$saleId]);
    return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function gcv_transfer_create_offers_for_sale(array $sale, array $from): int
{
    gcv_transfer_ensure_schema();
    $saleId = (int)($sale['id'] ?? 0);
    $spots = max(1, (int)($sale['spots'] ?? 1));
    if ($saleId <= 0) {
        return 0;
    }
    if (gcv_resolve_excursion_lifecycle($from) !== 'em_formacao') {
        db()->prepare(
            "UPDATE gcv_transfer_offers SET status = 'expired', updated_at = NOW()
             WHERE sale_id = ? AND status = 'offered'"
        )->execute([$saleId]);
        return 0;
    }
    $withT = !empty($sale['include_transport']);
    $original = (int)($sale['sold_price_cents'] ?? 0);
    $targets = gcv_transfer_find_targets($from, $spots);
    $targetIds = [];
    foreach ($targets as $to) {
        $targetIds[(int)$to['id']] = $to;
    }
    $existing = gcv_transfer_offers_for_sale($saleId, true);
    $keep = [];
    foreach ($existing as $o) {
        $toId = (int)($o['to_excursion_id'] ?? 0);
        $st = (string)($o['status'] ?? '');
        if ($st === 'awaiting_payment') {
            $keep[$toId] = true;
            continue;
        }
        if (!isset($targetIds[$toId])) {
            db()->prepare(
                "UPDATE gcv_transfer_offers SET status = 'expired', updated_at = NOW() WHERE id = ? AND status = 'offered'"
            )->execute([(int)$o['id']]);
            continue;
        }
        $keep[$toId] = true;
    }
    $hours = gcv_transfer_hours_to_start($from);
    $untilCancel = max(0.5, (float)($hours ?? 1) - gcv_transfer_cancel_hours());
    $expires = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))
        ->modify('+' . max(1, (int)ceil($untilCancel)) . ' hours')
        ->format('Y-m-d H:i:s');
    $n = count($keep);
    $ins = db()->prepare(
        'INSERT INTO gcv_transfer_offers
            (sale_id, from_excursion_id, to_excursion_id, spots, original_cents, target_cents, delta_cents, status, expires_at)
         VALUES (?,?,?,?,?,?,?,?,?)'
    );
    foreach ($targets as $to) {
        $toId = (int)$to['id'];
        if (isset($keep[$toId])) {
            continue;
        }
        $unit = gcv_transfer_unit_cents($to, $withT);
        $target = $unit * $spots;
        $delta = $target - $original;
        $ins->execute([
            $saleId,
            (int)$from['id'],
            $toId,
            $spots,
            $original,
            $target,
            $delta,
            'offered',
            $expires,
        ]);
        $n++;
    }
    return $n;
}

function gcv_transfer_scan_window(?DateTimeImmutable $now = null): array
{
    gcv_marketplace_ensure_schema();
    gcv_transfer_ensure_schema();
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = $now ?: new DateTimeImmutable('now', $tz);
    $offerHours = gcv_transfer_offer_hours();
    $cancelHours = gcv_transfer_cancel_hours();
    $offered = 0;
    $notified = 0;
    $refunded = 0;

    $lookDays = max(2, (int)ceil($offerHours / 24) + 1);
    $stmt = db()->prepare(
        "SELECT e.id FROM gcv_excursions e
         WHERE e.deleted_at IS NULL
           AND e.status IN ('published','soldout')
           AND e.date_iso >= CURDATE()
           AND e.date_iso <= DATE_ADD(CURDATE(), INTERVAL ? DAY)"
    );
    $stmt->execute([$lookDays]);
    $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    foreach ($ids as $excId) {
        $exc = gcv_transfer_load_excursion($excId);
        if (!$exc) {
            continue;
        }
        $life = gcv_resolve_excursion_lifecycle($exc);
        $hours = gcv_transfer_hours_to_start($exc, $now);
        if ($hours === null) {
            continue;
        }
        $salesSt = db()->prepare(
            "SELECT * FROM gcv_sales
             WHERE excursion_id = ? AND deleted_at IS NULL AND sale_status = 'PAID'"
        );
        $salesSt->execute([$excId]);
        $sales = $salesSt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if ($life === 'em_formacao' && gcv_transfer_in_offer_window($hours)) {
            foreach ($sales as $sale) {
                $created = gcv_transfer_create_offers_for_sale($sale, $exc);
                $offered += $created;
                if (empty($sale['transfer_notified_at'])) {
                    try {
                        gcv_transfer_notify_client($sale, $exc, gcv_transfer_offers_for_sale((int)$sale['id'], true));
                        db()->prepare('UPDATE gcv_sales SET transfer_notified_at = NOW() WHERE id = ? AND transfer_notified_at IS NULL')
                            ->execute([(int)$sale['id']]);
                        $notified++;
                    } catch (Throwable $e) {
                        error_log('transfer notify: ' . $e->getMessage());
                    }
                }
            }
        }

        if ($life === 'em_formacao' && $hours <= $cancelHours) {
            db()->prepare(
                "UPDATE gcv_transfer_offers SET status = 'expired', updated_at = NOW()
                 WHERE from_excursion_id = ? AND status = 'offered'"
            )->execute([$excId]);
            foreach ($sales as $sale) {
                if (gcv_transfer_auto_refund_sale($sale, $exc)) {
                    $refunded++;
                }
            }
        }
    }
    return ['offered' => $offered, 'notified' => $notified, 'refunded' => $refunded];
}

function gcv_transfer_notify_client(array $sale, array $from, array $offers): void
{
    require_once dirname(__DIR__) . '/notify_ops.php';
    $loc = function_exists('gcv_ops_sale_locale') ? gcv_ops_sale_locale($sale) : 'pt';
    $host = function_exists('gcv_ops_site_host') ? gcv_ops_site_host() : 'https://www.guiachapadaveadeiros.com';
    $link = $host . '/dashboard/#reservas';
    $title = trim((string)($from['attraction_title'] ?? $sale['excursion_title'] ?? 'Passeio'));
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $cancelH = gcv_transfer_cancel_hours();
    $lines = [];
    foreach ($offers as $o) {
        $delta = (int)($o['delta_cents'] ?? 0);
        $name = trim((string)($o['to_title'] ?? 'Passeio'));
        if ($delta > 0) {
            $extra = ' (+' . (function_exists('gcv_ops_brl') ? gcv_ops_brl($delta) : ('R$ ' . number_format($delta / 100, 2, ',', '.'))) . ')';
        } elseif ($delta < 0) {
            $extra = ' (ressarcimento ' . (function_exists('gcv_ops_brl') ? gcv_ops_brl(abs($delta)) : '') . ')';
        } else {
            $extra = ' (mesmo valor)';
        }
        $lines[] = '• ' . $name . $extra;
    }
    if ($loc === 'en') {
        if ($lines) {
            $text = "⚠️ Your tour is still forming and may not go out.\n\n"
                . 'Tour: ' . $title . "\n"
                . 'Code: ' . $code . "\n\n"
                . "You can switch to a confirmed departure the same day, same city:\n" . implode("\n", $lines) . "\n\n"
                . "Or cancel with a 100% refund. If you do nothing, the refund is automatic {$cancelH} hours before departure.\n\nOpen your bookings:\n" . $link;
        } else {
            $text = "⚠️ Your tour is still forming and may not go out.\n\n"
                . 'Tour: ' . $title . "\n"
                . 'Code: ' . $code . "\n\n"
                . "There is no confirmed tour the same day to switch to. You can cancel with a 100% refund. If you do nothing, the refund is automatic {$cancelH} hours before departure.\n\nOpen your bookings:\n" . $link;
        }
        $subject = 'Switch or refund your booking — Guia Chapada Veadeiros';
    } elseif ($loc === 'es') {
        if ($lines) {
            $text = "⚠️ Tu paseo aún está en formación y puede no salir.\n\n"
                . 'Paseo: ' . $title . "\n"
                . 'Código: ' . $code . "\n\n"
                . "Puedes cambiar a una salida confirmada el mismo día, misma ciudad:\n" . implode("\n", $lines) . "\n\n"
                . "O cancelar con reembolso del 100%. Si no haces nada, el reembolso es automático {$cancelH} horas antes de la salida.\n\nAbre tus reservas:\n" . $link;
        } else {
            $text = "⚠️ Tu paseo aún está en formación y puede no salir.\n\n"
                . 'Paseo: ' . $title . "\n"
                . 'Código: ' . $code . "\n\n"
                . "No hay otro paseo confirmado el mismo día para cambiar. Puedes cancelar con reembolso del 100%. Si no haces nada, el reembolso es automático {$cancelH} horas antes de la salida.\n\nAbre tus reservas:\n" . $link;
        }
        $subject = 'Cambia o reembolsa tu reserva — Guia Chapada Veadeiros';
    } else {
        if ($lines) {
            $text = "⚠️ Seu passeio ainda está em formação e pode não sair.\n\n"
                . 'Passeio: ' . $title . "\n"
                . 'Código: ' . $code . "\n\n"
                . "Você pode trocar para um passeio já confirmado no mesmo dia, mesma cidade:\n" . implode("\n", $lines) . "\n\n"
                . "Ou cancelar com ressarcimento de 100%. Se nada for feito, o reembolso integral é automático {$cancelH} horas antes da saída.\n\nAbra suas reservas:\n" . $link;
        } else {
            $text = "⚠️ Seu passeio ainda está em formação e pode não sair.\n\n"
                . 'Passeio: ' . $title . "\n"
                . 'Código: ' . $code . "\n\n"
                . "Não há outro passeio confirmado neste dia para troca. Você pode cancelar com ressarcimento de 100%. Se nada for feito, o reembolso integral é automático {$cancelH} horas antes da saída.\n\nAbra suas reservas:\n" . $link;
        }
        $subject = 'Troque ou cancele sua reserva — Guia Chapada Veadeiros';
    }
    gcv_ops_wa_client($sale, $text, ['kind' => 'transfer_offer']);
    $email = trim((string)($sale['tourist_email'] ?? ''));
    if ($email !== '') {
        gcv_ops_mail_plain($email, $subject, $text);
    }
}

function gcv_transfer_auto_refund_sale(array $sale, ?array $exc = null): bool
{
    $saleId = (int)($sale['id'] ?? 0);
    if ($saleId <= 0 || strtoupper((string)($sale['sale_status'] ?? '')) !== 'PAID') {
        return false;
    }
    $open = gcv_transfer_offers_for_sale($saleId, true);
    foreach ($open as $o) {
        if (($o['status'] ?? '') === 'awaiting_payment') {
            return false;
        }
    }
    try {
        require_once __DIR__ . '/sale_service.php';
        $email = strtolower(trim((string)($sale['tourist_email'] ?? '')));
        $code = (string)($sale['reservation_id'] ?? '');
        if ($code !== '' && $email !== '') {
            gcv_sale_cancel_reservation($code, $email, false);
        } else {
            db()->prepare(
                "UPDATE gcv_sales SET sale_status = 'REFUNDED', payout_status = 'PAYOUT_BLOCKED' WHERE id = ? AND sale_status = 'PAID'"
            )->execute([$saleId]);
            $excId = (int)($sale['excursion_id'] ?? ($exc['id'] ?? 0));
            if ($excId > 0) {
                gcv_sale_refresh_booked_people($excId);
            }
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_cancelled($sale, $exc, 'em_formacao', false);
        }
    } catch (Throwable $e) {
        error_log('transfer auto refund: ' . $e->getMessage());
        return false;
    }
    db()->prepare(
        "UPDATE gcv_transfer_offers SET status = 'expired', refund_cents = original_cents, updated_at = NOW()
         WHERE sale_id = ? AND status IN ('offered','awaiting_payment')"
    )->execute([$saleId]);
    try {
        require_once dirname(__DIR__) . '/notify_ops.php';
        $title = trim((string)($sale['excursion_title'] ?? 'Passeio'));
        $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
        $text = "💰 Reserva cancelada automaticamente (quórum não fechou).\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Código: ' . $code . "\n"
            . 'Ressarcimento: 100% do valor pago, de volta pelo PIX original.';
        gcv_ops_wa_client($sale, $text, ['kind' => 'transfer_auto_refund']);
        $email = trim((string)($sale['tourist_email'] ?? ''));
        if ($email !== '') {
            gcv_ops_mail_plain($email, 'Ressarcimento 100% — Guia Chapada Veadeiros', $text);
        }
    } catch (Throwable $e) {
        error_log('transfer auto refund notify: ' . $e->getMessage());
    }
    return true;
}

function gcv_transfer_client_owns_sale(array $user, array $sale): bool
{
    $uid = (int)($user['id'] ?? 0);
    $email = strtolower(trim((string)($user['email'] ?? '')));
    if ($uid > 0 && (int)($sale['tourist_user_id'] ?? 0) === $uid) {
        return true;
    }
    $saleEmail = strtolower(trim((string)($sale['tourist_email'] ?? '')));
    return $email !== '' && $saleEmail !== '' && $saleEmail === $email;
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_transfer_list_client_sales(array $user): array
{
    gcv_marketplace_ensure_schema();
    gcv_transfer_ensure_schema();
    $uid = (int)($user['id'] ?? 0);
    $email = strtolower(trim((string)($user['email'] ?? '')));
    $st = db()->prepare(
        "SELECT s.*, e.date_iso, e.departure_time, e.quorum, e.booked_people, e.max_people, e.status AS excursion_status,
                e.departure_city_id, e.attraction_id, e.meeting_point,
                a.title_pt AS attraction_title, c.name AS departure_city_name,
                COALESCE(NULLIF(g.full_name,''), NULLIF(g.nickname,''), u.name, s.guide_name) AS guide_display
         FROM gcv_sales s
         LEFT JOIN gcv_excursions e ON e.id = s.excursion_id
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_guides g ON g.user_id = s.guide_user_id
         LEFT JOIN gcv_users u ON u.id = s.guide_user_id
         WHERE s.deleted_at IS NULL
           AND (
                (s.tourist_user_id IS NOT NULL AND s.tourist_user_id = ?)
                OR (s.tourist_email IS NOT NULL AND LOWER(s.tourist_email) = ?)
           )
         ORDER BY COALESCE(e.date_iso, s.sold_at) DESC, s.id DESC"
    );
    $st->execute([$uid, $email]);
    $rows = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $s) {
        $exc = [
            'status' => (string)($s['excursion_status'] ?? 'published'),
            'date_iso' => (string)($s['date_iso'] ?? ''),
            'booked_people' => (int)($s['booked_people'] ?? 0),
            'quorum' => (int)($s['quorum'] ?? 0),
            'max_people' => (int)($s['max_people'] ?? 0),
        ];
        $life = gcv_resolve_excursion_lifecycle($exc);
        if (strtoupper((string)($s['sale_status'] ?? '')) === 'CANCELLED') {
            $life = 'cancelada';
        }
        if (strtoupper((string)($s['sale_status'] ?? '')) === 'REFUNDED') {
            $life = 'cancelada';
        }
        $s['lifecycle'] = $life;
        $s['lifecycle_label'] = gcv_excursion_lifecycle_label($life);
        $s['tour_title'] = (string)($s['attraction_title'] ?? $s['excursion_title'] ?? 'Passeio');
        $offers = gcv_transfer_offers_for_sale((int)$s['id'], true);
        foreach ($offers as &$o) {
            $o['delta_label'] = ((int)$o['delta_cents'] > 0 ? '+' : ((int)$o['delta_cents'] < 0 ? '−' : ''))
                . 'R$ ' . number_format(abs((int)$o['delta_cents']) / 100, 2, ',', '.');
        }
        unset($o);
        $excId = (int)($s['excursion_id'] ?? 0);
        $hoursLeft = $excId > 0 ? gcv_transfer_hours_to_start([
            'date_iso' => (string)($s['date_iso'] ?? ''),
            'departure_time' => (string)($s['departure_time'] ?? ''),
        ]) : null;
        $s['hours_to_start'] = $hoursLeft;
        $s['transfer_offers'] = $offers;
        $inOffer = gcv_transfer_in_offer_window($hoursLeft);
        $s['can_transfer'] = $life === 'em_formacao' && strtoupper((string)$s['sale_status']) === 'PAID' && $offers !== [] && $inOffer;
        $s['can_refund_full'] = $life === 'em_formacao' && strtoupper((string)$s['sale_status']) === 'PAID';
        $rows[] = gcv_transfer_public_sale($s);
    }
    return $rows;
}

/**
 * @param array<string,mixed> $s
 * @return array<string,mixed>
 */
function gcv_transfer_public_sale(array $s): array
{
    $offers = [];
    foreach ($s['transfer_offers'] ?? [] as $o) {
        $offers[] = [
            'id' => (int)($o['id'] ?? 0),
            'to_title' => (string)($o['to_title'] ?? 'Passeio'),
            'to_city' => (string)($o['to_city'] ?? ''),
            'to_guide' => (string)($o['to_guide'] ?? ''),
            'departure_time' => substr((string)($o['departure_time'] ?? ''), 0, 5),
            'delta_cents' => (int)($o['delta_cents'] ?? 0),
            'delta_label' => (string)($o['delta_label'] ?? ''),
            'target_cents' => (int)($o['target_cents'] ?? 0),
            'original_cents' => (int)($o['original_cents'] ?? 0),
            'status' => (string)($o['status'] ?? ''),
        ];
    }
    return [
        'id' => (int)($s['id'] ?? 0),
        'reservation_id' => (string)($s['reservation_id'] ?? ''),
        'tour_title' => (string)($s['tour_title'] ?? 'Passeio'),
        'date_iso' => (string)($s['date_iso'] ?? ''),
        'departure_time' => substr((string)($s['departure_time'] ?? ''), 0, 5),
        'departure_city_name' => (string)($s['departure_city_name'] ?? $s['city_name'] ?? ''),
        'guide_name' => (string)($s['guide_display'] ?? $s['guide_name'] ?? ''),
        'spots' => (int)($s['spots'] ?? 1),
        'sold_price_cents' => (int)($s['sold_price_cents'] ?? 0),
        'sale_status' => (string)($s['sale_status'] ?? ''),
        'lifecycle' => (string)($s['lifecycle'] ?? ''),
        'lifecycle_label' => (string)($s['lifecycle_label'] ?? ''),
        'can_transfer' => !empty($s['can_transfer']),
        'can_refund_full' => !empty($s['can_refund_full']),
        'transfer_offers' => $offers,
    ];
}

function gcv_transfer_load_offer(int $offerId): ?array
{
    gcv_transfer_ensure_schema();
    $st = db()->prepare('SELECT * FROM gcv_transfer_offers WHERE id = ? LIMIT 1');
    $st->execute([$offerId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_transfer_new_pix_code(): string
{
    require_once dirname(__DIR__) . '/pix_reservation_store.php';
    for ($i = 0; $i < 12; $i++) {
        $code = 'GCV-' . strtoupper(bin2hex(random_bytes(3)));
        if (!gcv_pix_read_reservation($code)) {
            return $code;
        }
    }
    return 'GCV-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
}

/**
 * @return array<string,mixed>
 */
function gcv_transfer_accept_offer(int $offerId, array $user): array
{
    $offer = gcv_transfer_load_offer($offerId);
    if (!$offer || !in_array((string)$offer['status'], ['offered', 'awaiting_payment'], true)) {
        throw new RuntimeException('Oferta indisponível.');
    }
    $sale = db()->prepare('SELECT * FROM gcv_sales WHERE id = ? LIMIT 1');
    $sale->execute([(int)$offer['sale_id']]);
    $sale = $sale->fetch(PDO::FETCH_ASSOC);
    if (!$sale || !gcv_transfer_client_owns_sale($user, $sale)) {
        throw new RuntimeException('Reserva não encontrada.');
    }
    if (strtoupper((string)$sale['sale_status']) !== 'PAID') {
        throw new RuntimeException('Só é possível transferir reserva paga.');
    }
    $from = gcv_transfer_load_excursion((int)$offer['from_excursion_id']);
    $hoursLeft = $from ? gcv_transfer_hours_to_start($from) : null;
    if (!$from || gcv_resolve_excursion_lifecycle($from) !== 'em_formacao') {
        throw new RuntimeException('Só é possível trocar enquanto o passeio original está em formação.');
    }
    if (!gcv_transfer_in_offer_window($hoursLeft)) {
        throw new RuntimeException('O prazo para trocar já encerrou. A reserva será ressarcida automaticamente se o grupo não fechar.');
    }
    $to = gcv_transfer_load_excursion((int)$offer['to_excursion_id']);
    if (!$to) {
        throw new RuntimeException('Passeio de destino indisponível.');
    }
    if (gcv_resolve_excursion_lifecycle($to) !== 'confirmada') {
        throw new RuntimeException('A troca só pode ser feita para um passeio já confirmado.');
    }
    $spots = max(1, (int)$offer['spots']);
    if (gcv_transfer_remaining_seats($to) < $spots) {
        throw new RuntimeException('Esse passeio não tem mais vagas suficientes.');
    }
    $delta = (int)$offer['delta_cents'];
    if ($delta <= 0) {
        gcv_transfer_complete($offer, $sale, $to, 0);
        return ['ok' => true, 'status' => 'completed', 'needs_payment' => false];
    }
    return gcv_transfer_create_balance_pix($offer, $sale, $to);
}

/**
 * @return array<string,mixed>
 */
function gcv_transfer_create_balance_pix(array $offer, array $sale, array $to): array
{
    require_once dirname(__DIR__) . '/pix_reservation_store.php';
    require_once dirname(__DIR__) . '/sicoob_api.php';
    $delta = (int)$offer['delta_cents'];
    $code = trim((string)($offer['pix_reservation_id'] ?? ''));
    if ($code !== '' && !empty($offer['pix_brcode'])) {
        $existing = gcv_pix_read_reservation($code);
        if ($existing && gcv_pix_effective_status($existing) === 'PENDING') {
            return [
                'ok' => true,
                'status' => 'awaiting_payment',
                'needs_payment' => true,
                'pix' => [
                    'reservation_id' => $code,
                    'brcode' => (string)$offer['pix_brcode'],
                    'amount_cents' => $delta,
                ],
            ];
        }
    }
    $code = gcv_transfer_new_pix_code();
    $amount = round($delta / 100, 2);
    $cob = gcv_sicoob_create_cob($code, $amount, 1800, $code . ' saldo transferencia');
    $brcode = (string)($cob['brcode'] ?? '');
    if (!$cob['ok'] || $brcode === '') {
        throw new RuntimeException('Não foi possível gerar o PIX da diferença. Tente de novo em instantes.');
    }
    $payload = [
        'reservation_id' => $code,
        'kind' => 'transfer',
        'transfer_offer_id' => (int)$offer['id'],
        'origin_reservation_id' => (string)($sale['reservation_id'] ?? ''),
        'status' => 'PENDING',
        'amount' => $amount,
        'brcode' => $brcode,
        'txid' => (string)($cob['txid'] ?? ''),
        'email' => (string)($sale['tourist_email'] ?? ''),
        'name' => (string)($sale['tourist_name'] ?? ''),
        'phone' => (string)($sale['tourist_phone'] ?? ''),
        'created_at' => gmdate('c'),
        'expires_at' => gmdate('c', time() + 1800),
    ];
    gcv_pix_write_reservation($payload);
    db()->prepare(
        "UPDATE gcv_transfer_offers SET status = 'awaiting_payment', pix_reservation_id = ?, pix_brcode = ?, accepted_at = NOW() WHERE id = ?"
    )->execute([$code, $brcode, (int)$offer['id']]);
    return [
        'ok' => true,
        'status' => 'awaiting_payment',
        'needs_payment' => true,
        'pix' => [
            'reservation_id' => $code,
            'brcode' => $brcode,
            'amount_cents' => $delta,
        ],
    ];
}

function gcv_transfer_on_balance_paid(array $reservation): void
{
    gcv_transfer_ensure_schema();
    $offerId = (int)($reservation['transfer_offer_id'] ?? 0);
    $code = strtoupper(trim((string)($reservation['reservation_id'] ?? '')));
    $offer = null;
    if ($offerId > 0) {
        $offer = gcv_transfer_load_offer($offerId);
    }
    if (!$offer && $code !== '') {
        $st = db()->prepare('SELECT * FROM gcv_transfer_offers WHERE pix_reservation_id = ? LIMIT 1');
        $st->execute([$code]);
        $offer = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    if (!$offer) {
        throw new RuntimeException('Oferta de transferência não encontrada para o PIX.');
    }
    $sale = db()->prepare('SELECT * FROM gcv_sales WHERE id = ? LIMIT 1');
    $sale->execute([(int)$offer['sale_id']]);
    $sale = $sale->fetch(PDO::FETCH_ASSOC);
    $to = gcv_transfer_load_excursion((int)$offer['to_excursion_id']);
    if (!$sale || !$to) {
        throw new RuntimeException('Dados da transferência incompletos.');
    }
    if (strtoupper((string)($sale['sale_status'] ?? '')) !== 'PAID') {
        throw new RuntimeException('A reserva original já foi cancelada ou ressarcida.');
    }
    gcv_transfer_complete($offer, $sale, $to, (int)$offer['delta_cents']);
}

function gcv_transfer_complete(array $offer, array $sale, array $to, int $extraPaidCents): void
{
    require_once __DIR__ . '/sale_service.php';
    $saleId = (int)$sale['id'];
    $fromId = (int)$offer['from_excursion_id'];
    $toId = (int)$to['id'];
    $spots = max(1, (int)$offer['spots']);
    $targetCents = (int)$offer['target_cents'];
    $original = (int)$offer['original_cents'];
    $refund = max(0, $original - $targetCents);
    $withT = !empty($sale['include_transport']);
    $unit = gcv_transfer_unit_cents($to, $withT);
    $unitGuide = $withT
        ? (int)($to['guide_net_transport_cents'] ?? $to['guide_net_cents'] ?? 0)
        : (int)($to['guide_net_cents'] ?? $to['guide_payout_planned_cents'] ?? 0);
    if ($unitGuide <= 0 && $unit > 0) {
        $pct = (float)setting('platform_commission_pct', '10');
        $unitPlatform = (int)round($unit * ($pct / 100.0));
        $unitGuide = max(0, $unit - $unitPlatform);
    }
    $guideAmount = $unitGuide * $spots;
    if ($guideAmount > $targetCents) {
        $guideAmount = $targetCents;
    }
    $platform = max(0, $targetCents - $guideAmount);
    $title = trim((string)($to['attraction_title'] ?? $to['attraction_title_pt'] ?? 'Passeio'));
    $guideName = trim((string)($to['guide_full_name'] ?? $to['guide_nickname'] ?? $to['guide_user_name'] ?? ''));
    $startsAt = null;
    $time = (string)($to['departure_time'] ?? '08:00:00');
    if (strlen($time) === 5) {
        $time .= ':00';
    }
    if (!empty($to['date_iso'])) {
        $startsAt = $to['date_iso'] . ' ' . $time;
    }

    db()->prepare(
        "UPDATE gcv_sales SET
            excursion_id = ?,
            guide_user_id = ?,
            guide_name = ?,
            city_id = ?,
            city_name = ?,
            attraction_id = ?,
            excursion_title = ?,
            sold_price_cents = ?,
            unit_price_cents = ?,
            guide_amount_cents = ?,
            platform_revenue_cents = ?,
            excursion_starts_at = ?,
            payout_status = 'PAYOUT_PENDING'
         WHERE id = ?"
    )->execute([
        $toId,
        (int)($to['guide_user_id'] ?? 0) ?: null,
        $guideName !== '' ? $guideName : null,
        (int)($to['departure_city_id'] ?? 0) ?: null,
        (string)($to['departure_city_name'] ?? '') ?: null,
        (int)($to['attraction_id'] ?? 0) ?: null,
        $title !== '' ? $title : null,
        $targetCents,
        $unit,
        $guideAmount,
        $platform,
        $startsAt,
        $saleId,
    ]);

    db()->prepare(
        "UPDATE gcv_transfer_offers SET status = 'completed', completed_at = NOW(), refund_cents = ?, accepted_at = COALESCE(accepted_at, NOW()) WHERE id = ?"
    )->execute([$refund, (int)$offer['id']]);
    db()->prepare(
        "UPDATE gcv_transfer_offers SET status = 'expired' WHERE sale_id = ? AND id <> ? AND status IN ('offered','awaiting_payment')"
    )->execute([$saleId, (int)$offer['id']]);

    if ($fromId > 0) {
        gcv_sale_refresh_booked_people($fromId);
    }
    gcv_sale_refresh_booked_people($toId);

    try {
        require_once dirname(__DIR__) . '/pix_reservation_store.php';
        require_once dirname(__DIR__) . '/pix_seats_store.php';
        $origCode = (string)($sale['reservation_id'] ?? '');
        $res = $origCode !== '' ? gcv_pix_read_reservation($origCode) : null;
        if ($res) {
            gcv_pix_seats_release_reservation($res);
            $res['transferred_to_excursion_id'] = $toId;
            $res['transferred_at'] = gmdate('c');
            if (!empty($to['cart_slug'])) {
                $res['trips'] = [[
                    'cartId' => (string)$to['cart_slug'],
                    'qty' => $spots,
                    'date' => (string)($to['date_iso'] ?? ''),
                ]];
            }
            gcv_pix_write_reservation($res);
            try {
                db()->prepare('DELETE FROM gcv_pix_carousel_seat_applied WHERE reservation_id = ?')->execute([$origCode]);
            } catch (Throwable $e) {
                // ignore
            }
            gcv_pix_seats_apply_reservation($res);
        }
    } catch (Throwable $e) {
        error_log('transfer seats: ' . $e->getMessage());
    }

    $fresh = db()->prepare('SELECT * FROM gcv_sales WHERE id = ? LIMIT 1');
    $fresh->execute([$saleId]);
    $saleAfter = $fresh->fetch(PDO::FETCH_ASSOC) ?: $sale;
    $from = gcv_transfer_load_excursion($fromId);

    try {
        require_once dirname(__DIR__) . '/notify_ops.php';
        gcv_transfer_notify_completed($saleAfter, $from, $to, $refund, $extraPaidCents);
        $fromGuide = (int)((is_array($from) ? ($from['guide_user_id'] ?? 0) : 0) ?: ($sale['guide_user_id'] ?? 0));
        if ($fromId > 0 && $fromGuide > 0) {
            $whenFrom = $from
                ? trim(gcv_ops_date_br((string)($from['date_iso'] ?? '')) . ' às ' . substr((string)($from['departure_time'] ?? ''), 0, 5))
                : '';
            $fromTitle = trim((string)($from['attraction_title'] ?? 'Passeio'));
            gcv_ops_wa_guide(
                $fromGuide,
                "📉 Cliente saiu do seu grupo (trocou de passeio).\n\n"
                . 'Passeio: ' . $fromTitle . "\n"
                . ($whenFrom !== '' ? 'Quando: ' . $whenFrom . "\n" : '')
                . 'Cliente: ' . trim((string)($sale['tourist_name'] ?? 'Cliente')) . "\n"
                . 'Pessoas: ' . $spots . "\n\n"
                . gcv_ops_group_update_text($fromId, $from)
            );
        }
        gcv_ops_notify_guide_new_booking($saleAfter, $to, $spots);
        $phone = gcv_ops_client_phone($saleAfter);
        $code = strtoupper(trim((string)($saleAfter['reservation_id'] ?? '')));
        $png = function_exists('gcv_ops_voucher_png') ? gcv_ops_voucher_png($saleAfter, $to, $code !== '' ? $code : 'GCV') : '';
        if ($phone !== '' && $png !== '' && function_exists('gcv_whatsapp_send_image')) {
            gcv_whatsapp_send_image($phone, 'QR atualizado ' . $code, $png);
        }
    } catch (Throwable $e) {
        error_log('transfer complete notify: ' . $e->getMessage());
    }
}

function gcv_transfer_notify_completed(array $sale, ?array $from, array $to, int $refundCents, int $extraPaidCents): void
{
    $loc = function_exists('gcv_ops_sale_locale') ? gcv_ops_sale_locale($sale) : 'pt';
    $old = trim((string)($from['attraction_title'] ?? 'Passeio anterior'));
    $new = trim((string)($to['attraction_title'] ?? $sale['excursion_title'] ?? 'Novo passeio'));
    $when = trim(gcv_ops_date_br((string)($to['date_iso'] ?? '')) . ' às ' . substr((string)($to['departure_time'] ?? ''), 0, 5));
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $money = static function (int $c) {
        return function_exists('gcv_ops_brl') ? gcv_ops_brl($c) : ('R$ ' . number_format($c / 100, 2, ',', '.'));
    };
    $extra = '';
    if ($refundCents > 0) {
        $extra = $loc === 'en'
            ? ("\nPartial refund: " . $money($refundCents))
            : ($loc === 'es' ? ("\nReembolso parcial: " . $money($refundCents)) : ("\nRessarcimento parcial: " . $money($refundCents)));
    } elseif ($extraPaidCents > 0) {
        $extra = $loc === 'en'
            ? ("\nBalance paid: " . $money($extraPaidCents))
            : ($loc === 'es' ? ("\nSaldo pagado: " . $money($extraPaidCents)) : ("\nSaldo pago: " . $money($extraPaidCents)));
    }
    if ($loc === 'en') {
        $text = "🔁 Booking transferred.\n\nFrom: {$old}\nTo: {$new}\nWhen: {$when}\nCode: {$code}{$extra}";
    } elseif ($loc === 'es') {
        $text = "🔁 Reserva transferida.\n\nDe: {$old}\nPara: {$new}\nCuándo: {$when}\nCódigo: {$code}{$extra}";
    } else {
        $text = "🔁 Reserva transferida.\n\nDe: {$old}\nPara: {$new}\nQuando: {$when}\nCódigo: {$code}{$extra}";
    }
    gcv_ops_wa_client($sale, $text, ['kind' => 'transfer_done']);
    $email = trim((string)($sale['tourist_email'] ?? ''));
    if ($email !== '') {
        gcv_ops_mail_plain($email, 'Reserva transferida — Guia Chapada Veadeiros', $text);
    }
}

function gcv_transfer_refund_sale(int $saleId, array $user): array
{
    $st = db()->prepare('SELECT * FROM gcv_sales WHERE id = ? LIMIT 1');
    $st->execute([$saleId]);
    $sale = $st->fetch(PDO::FETCH_ASSOC);
    if (!$sale || !gcv_transfer_client_owns_sale($user, $sale)) {
        throw new RuntimeException('Reserva não encontrada.');
    }
    $excId = (int)($sale['excursion_id'] ?? 0);
    $exc = $excId > 0 ? gcv_transfer_load_excursion($excId) : null;
    $life = $exc ? gcv_resolve_excursion_lifecycle($exc) : 'em_formacao';
    if ($life !== 'em_formacao') {
        throw new RuntimeException('Ressarcimento integral só vale enquanto o passeio está em formação.');
    }
    require_once __DIR__ . '/sale_service.php';
    $email = strtolower(trim((string)($sale['tourist_email'] ?? $user['email'] ?? '')));
    $code = (string)($sale['reservation_id'] ?? '');
    gcv_sale_cancel_reservation($code, $email, false);
    db()->prepare(
        "UPDATE gcv_transfer_offers SET status = 'declined', refund_cents = original_cents WHERE sale_id = ? AND status IN ('offered','awaiting_payment')"
    )->execute([$saleId]);
    try {
        require_once dirname(__DIR__) . '/notify_ops.php';
        $text = "💰 Cancelamento com ressarcimento 100%.\n\nCódigo: " . strtoupper($code) . "\nO valor volta pelo PIX original.";
        gcv_ops_wa_client($sale, $text, ['kind' => 'transfer_refund']);
        if ($email !== '') {
            gcv_ops_mail_plain($email, 'Ressarcimento 100% — Guia Chapada Veadeiros', $text);
        }
    } catch (Throwable $e) {
        error_log('transfer refund notify: ' . $e->getMessage());
    }
    return ['ok' => true, 'status' => 'refunded'];
}
