<?php

declare(strict_types=1);

/**
 * Cartão com pré-autorização: só cobra quando o passeio confirma.
 *
 * Estados da reserva (storage/pix_reservations/{id}.json → status):
 *   CARD_SAVED  cartão salvo na plataforma (passeio longe); a reserva no cartão é feita na janela
 *   AUTHORIZED  valor reservado no cartão (não cobrado); a vaga conta no quórum
 *   PAID        capturado (cobrado) — passeio confirmado
 *   RELEASED    reserva no cartão liberada — passeio não confirmou / cancelado
 *
 * Janelas (a reserva no cartão expira): Stripe 7 dias, Mercado Pago 5 dias.
 *   PAY_STRIPE_AUTH_DAYS=6, PAY_MP_AUTH_DAYS=4  → antes disso, só cartão salvo.
 * Confirmação de cada passeio (gcv_booking_trips):
 *   CONFIRMED = passeio com quórum (lifecycle "confirmada") E guia confirmou a reserva
 *               (passeio sem excursão/quórum, ex. privativo: basta o guia/admin confirmar)
 *   CANCELLED = excursão cancelada OU chegou a PAY_DECISION_HOURS (12h) antes sem confirmar
 * Quando todos os passeios da reserva estão decididos → captura a parte confirmada e libera o resto.
 */

require_once __DIR__ . '/../db.php';
require_once dirname(__DIR__, 2) . '/db.php'; // gcv_load_config
require_once __DIR__ . '/../pix_reservation_store.php';
require_once __DIR__ . '/ledger.php';

function gcv_auth_env_int(string $key, int $default): int
{
    $v = $_ENV[$key] ?? getenv($key);
    return is_string($v) && ctype_digit(trim($v)) ? (int) trim($v) : $default;
}

/** Dias antes do passeio em que a reserva no cartão é feita. */
function gcv_auth_window_days(string $gateway): int
{
    return $gateway === 'stripe' ? max(1, min(6, gcv_auth_env_int('PAY_STRIPE_AUTH_DAYS', 6)))
        : max(1, min(4, gcv_auth_env_int('PAY_MP_AUTH_DAYS', 4)));
}

/** Validade da reserva no cartão (horas), com folga. Stripe 7d, MP 5d. */
function gcv_auth_validity_hours(string $gateway): int
{
    return $gateway === 'stripe' ? 156 : 108; // 6,5 dias / 4,5 dias
}

function gcv_auth_decision_hours(): int
{
    return max(1, gcv_auth_env_int('PAY_DECISION_HOURS', 12));
}

/** Prazo para o cliente confirmar o cartão quando precisa (link CVV / banco pediu). */
function gcv_auth_customer_deadline_hours(): int
{
    return max(13, gcv_auth_env_int('PAY_CARD_CONFIRM_DEADLINE_HOURS', 48));
}

/** Só testes locais (PAY_FAKE_GATEWAYS=1): plataforma "fake" que aprova tudo sem chamar API. */
function gcv_auth_is_fake(string $gateway): bool
{
    return $gateway === 'fake' && (string) ($_ENV['PAY_FAKE_GATEWAYS'] ?? getenv('PAY_FAKE_GATEWAYS') ?: '') === '1';
}

function gcv_auth_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
}

function gcv_auth_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    gcv_ledger_ensure_schema();
    // Bancos já criados: status novos no registro de transações e na venda.
    try {
        $col = db()->query(
            "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gcv_payment_transactions' AND COLUMN_NAME = 'status'"
        )->fetchColumn();
        if (is_string($col) && !str_contains($col, 'AUTHORIZED')) {
            db()->exec("ALTER TABLE gcv_payment_transactions MODIFY status ENUM('PENDING','CARD_SAVED','AUTHORIZED','PAID','RELEASED','REFUNDED','PARTIALLY_REFUNDED','CHARGEBACK','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING'");
        }
        $col = db()->query(
            "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gcv_sales' AND COLUMN_NAME = 'sale_status'"
        )->fetchColumn();
        if (is_string($col) && !str_contains($col, 'AUTHORIZED')) {
            db()->exec("ALTER TABLE gcv_sales MODIFY sale_status ENUM('PENDING','AUTHORIZED','PAID','CANCELLED','REFUNDED','DISPUTED') NOT NULL DEFAULT 'PENDING'");
        }
    } catch (Throwable $e) {
        error_log('auth schema: ' . $e->getMessage());
    }
}

/**
 * Data/hora de saída de um passeio do carrinho (America/Sao_Paulo) ou null.
 *
 * @param array<string,mixed> $trip
 */
function gcv_auth_trip_starts_at(array $trip, ?array $excursion = null): ?string
{
    $date = '';
    $time = '';
    if ($excursion && !empty($excursion['date_iso'])) {
        $date = (string) $excursion['date_iso'];
        $time = (string) ($excursion['departure_time'] ?? '');
    }
    if ($date === '') {
        $date = substr(trim((string) ($trip['dateIso'] ?? $trip['dateISO'] ?? '')), 0, 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) && preg_match('/(20\d{2}-\d{2}-\d{2})/', (string) ($trip['cartId'] ?? ''), $m)) {
            $date = $m[1];
        }
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return null;
    }
    if ($time === '') {
        $time = (string) ($trip['hora'] ?? '');
    }
    $time = preg_replace('/[^0-9:]/', '', str_replace('h', ':', strtolower($time))) ?? '';
    if (!preg_match('/^\d{1,2}:\d{2}/', $time)) {
        $time = '08:00';
    }
    [$h, $i] = array_map('intval', explode(':', $time));
    return sprintf('%s %02d:%02d:00', $date, min(23, $h), min(59, $i));
}

/** @return array<string,mixed>|null */
function gcv_auth_trip_excursion(array $trip): ?array
{
    try {
        require_once __DIR__ . '/../marketplace/sale_service.php';
        return gcv_sale_resolve_excursion(['trips' => [$trip]]);
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Cria/atualiza as linhas de passeio da reserva (idempotente).
 *
 * @param array<string,mixed> $rec
 */
function gcv_auth_register_trips(array $rec, string $kind): void
{
    gcv_auth_ensure_schema();
    $rid = (string) ($rec['reservation_id'] ?? '');
    $trips = array_values(array_filter(is_array($rec['trips'] ?? null) ? $rec['trips'] : [], 'is_array'));
    if ($rid === '') {
        return;
    }
    if (!$trips) {
        $trips = [[]];
    }
    $baseTotal = (int) ($rec['amount_cents'] ?? 0);
    $raw = array_map(static fn ($t) => max(0, (int) round(((float) ($t['valorUnit'] ?? 0)) * 100) * max(1, (int) ($t['qty'] ?? 1))), $trips);
    $sum = array_sum($raw);
    // Divide o valor base entre os passeios (proporcional; o último fecha a conta).
    $shares = [];
    $running = 0;
    foreach ($trips as $i => $_) {
        if ($i === count($trips) - 1) {
            $shares[$i] = max(0, $baseTotal - $running);
        } else {
            $shares[$i] = $sum > 0 ? (int) round($baseTotal * $raw[$i] / $sum) : (int) floor($baseTotal / count($trips));
            $running += $shares[$i];
        }
    }
    $stmt = db()->prepare(
        'INSERT INTO gcv_booking_trips
           (reservation_id, trip_index, cart_id, title, excursion_id, guide_user_id, starts_at, people, base_cents, payment_kind)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE cart_id = VALUES(cart_id), title = VALUES(title),
           excursion_id = COALESCE(VALUES(excursion_id), excursion_id),
           guide_user_id = COALESCE(VALUES(guide_user_id), guide_user_id),
           starts_at = COALESCE(VALUES(starts_at), starts_at), people = VALUES(people),
           base_cents = VALUES(base_cents), payment_kind = VALUES(payment_kind)'
    );
    foreach ($trips as $i => $trip) {
        $exc = $trip ? gcv_auth_trip_excursion($trip) : null;
        $title = trim((string) ($trip['destino'] ?? $exc['attraction_title'] ?? $exc['title_pt'] ?? ''));
        $stmt->execute([
            $rid, $i,
            substr((string) ($trip['cartId'] ?? $trip['cart_id'] ?? ''), 0, 160) ?: null,
            $title !== '' ? substr($title, 0, 255) : null,
            $exc ? (int) $exc['id'] : null,
            $exc && !empty($exc['guide_user_id']) ? (int) $exc['guide_user_id'] : null,
            gcv_auth_trip_starts_at($trip, $exc),
            max(1, min(255, (int) ($trip['qty'] ?? $trip['pessoas'] ?? 1))),
            $shares[$i],
            $kind,
        ]);
    }
}

/** @return list<array<string,mixed>> */
function gcv_auth_trip_rows(string $reservationId): array
{
    gcv_auth_ensure_schema();
    $st = db()->prepare('SELECT * FROM gcv_booking_trips WHERE reservation_id = ? ORDER BY trip_index');
    $st->execute([$reservationId]);
    return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/** Saída mais próxima entre os passeios da reserva (ou null). */
function gcv_auth_earliest_start(array $rec): ?string
{
    $min = null;
    foreach (is_array($rec['trips'] ?? null) ? $rec['trips'] : [] as $t) {
        if (!is_array($t)) {
            continue;
        }
        $s = gcv_auth_trip_starts_at($t, gcv_auth_trip_excursion($t));
        if ($s !== null && ($min === null || $s < $min)) {
            $min = $s;
        }
    }
    return $min;
}

/** true = passeio dentro da janela: já dá para reservar no cartão. */
function gcv_auth_can_authorize_now(array $rec, string $gateway): bool
{
    $start = gcv_auth_earliest_start($rec);
    if ($start === null) {
        return true;
    }
    $limit = gcv_auth_now()->modify('+' . gcv_auth_window_days($gateway) . ' days')->format('Y-m-d H:i:s');
    return $start <= $limit;
}

/**
 * Reserva garantida no cartão (AUTHORIZED) ou cartão salvo (CARD_SAVED).
 * Conta a vaga, cria a venda (AUTHORIZED, sem repasse) e registra os passeios.
 *
 * @param array<string,mixed> $info  auth: gateway, auth_id, amount_minor, currency, installments
 *                                   saved: gateway, customer_id, payment_method_id/card_id, …
 * @return array<string,mixed>|null reserva atualizada
 */
function gcv_auth_mark_reserved(string $reservationId, string $state, array $info): ?array
{
    gcv_auth_ensure_schema();
    $rec = gcv_pix_read_reservation($reservationId);
    if (!$rec || !in_array($state, ['AUTHORIZED', 'CARD_SAVED'], true)) {
        return null;
    }
    $prev = strtoupper((string) ($rec['status'] ?? ''));
    if ($prev === 'PAID' || $prev === 'RELEASED') {
        return $rec;
    }
    $now = gcv_auth_now();
    $rec['status'] = $state;
    $rec['reserved_at'] = $rec['reserved_at'] ?? gmdate('c');
    $start = gcv_auth_earliest_start($rec);
    // Não expira como o Pix: vale até a saída.
    $rec['expires_at'] = $start !== null
        ? (new DateTimeImmutable($start, new DateTimeZone('America/Sao_Paulo')))->format('c')
        : gmdate('c', time() + 30 * 86400);

    $gateway = (string) ($info['gateway'] ?? $rec['gateway'] ?? '');
    if ($state === 'AUTHORIZED') {
        $rec['card_auth'] = [
            'gateway' => $gateway,
            'id' => (string) ($info['auth_id'] ?? ''),
            'amount_minor' => (int) ($info['amount_minor'] ?? $rec['charged_minor'] ?? 0),
            'currency' => strtoupper((string) ($info['currency'] ?? $rec['charged_currency'] ?? 'BRL')),
            'installments' => max(1, (int) ($info['installments'] ?? 1)),
            'authorized_at' => $now->format('Y-m-d H:i:s'),
            'expires_at' => $now->modify('+' . gcv_auth_validity_hours($gateway) . ' hours')->format('Y-m-d H:i:s'),
        ];
        unset($rec['card_action']);
    }
    if (!empty($info['saved'])) {
        $rec['card_saved'] = array_merge(is_array($rec['card_saved'] ?? null) ? $rec['card_saved'] : [], $info['saved'], ['gateway' => $gateway]);
    }
    if (!gcv_pix_write_reservation($rec)) {
        return null;
    }

    $firstTime = !in_array($prev, ['AUTHORIZED', 'CARD_SAVED'], true);
    if ($firstTime) {
        try {
            require_once __DIR__ . '/../pix_seats_store.php';
            gcv_pix_seats_apply_reservation($rec);
        } catch (Throwable $e) {
            error_log('auth seats: ' . $e->getMessage());
        }
    }
    gcv_auth_register_trips($rec, 'card');
    try {
        require_once __DIR__ . '/../marketplace/sale_service.php';
        gcv_sale_capture_from_pix_reservation($rec, $gateway ?: 'card');
    } catch (Throwable $e) {
        error_log('auth sale capture: ' . $e->getMessage());
    }
    gcv_ledger_link_sale($reservationId);
    if ($firstTime) {
        gcv_auth_email_customer($rec, 'reserved');
    }
    return $rec;
}

/**
 * Decide cada passeio da reserva.
 *
 * @return array{trips:list<array<string,mixed>>, undecided:int, confirmed_cents:int, cancelled_cents:int}
 */
function gcv_auth_evaluate(string $reservationId): array
{
    $rows = gcv_auth_trip_rows($reservationId);
    $nowStr = gcv_auth_now()->format('Y-m-d H:i:s');
    $cut = gcv_auth_now()->modify('+' . gcv_auth_decision_hours() . ' hours')->format('Y-m-d H:i:s');
    $out = ['trips' => [], 'undecided' => 0, 'confirmed_cents' => 0, 'cancelled_cents' => 0];
    foreach ($rows as $r) {
        $decision = (string) $r['decision'];
        if (in_array($decision, ['UNDECIDED', 'CONFIRMED'], true)) {
            $life = null;
            $exc = null;
            if (!empty($r['excursion_id'])) {
                $st = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
                $st->execute([(int) $r['excursion_id']]);
                $exc = $st->fetch(PDO::FETCH_ASSOC);
                if ($exc) {
                    require_once __DIR__ . '/../excursion_status.php';
                    $life = gcv_resolve_excursion_lifecycle($exc);
                }
            }
            $guideOk = !empty($r['guide_confirmed_at']);
            if (!$guideOk && $exc && gcv_excursion_is_guide_submitted($exc)
                && in_array((string)($exc['status'] ?? ''), ['published', 'soldout'], true)) {
                // Saída que o guia já lançou: ele já aceitou guiar. Não pede de novo, por cliente.
                $guideOk = true;
                db()->prepare(
                    'UPDATE gcv_booking_trips SET guide_confirmed_at = NOW(), guide_confirmed_by = ? WHERE id = ? AND guide_confirmed_at IS NULL'
                )->execute([(int)($exc['guide_user_id'] ?? 0), (int)$r['id']]);
                $r['guide_confirmed_at'] = $nowStr;
            }
            $quorumOk = $life === null || in_array($life, ['confirmada', 'concluida'], true);
            if ($life === 'cancelada') {
                $decision = 'CANCELLED';
            } elseif ($guideOk && $quorumOk) {
                $decision = 'CONFIRMED';
            } elseif (!empty($r['starts_at']) && (string) $r['starts_at'] <= $cut) {
                $decision = 'CANCELLED'; // não confirmou a tempo
            } else {
                $decision = 'UNDECIDED';
            }
            if ($decision !== $r['decision']) {
                db()->prepare('UPDATE gcv_booking_trips SET decision = ?, decided_at = ? WHERE id = ?')
                    ->execute([$decision, $decision === 'UNDECIDED' ? null : $nowStr, (int) $r['id']]);
                $r['decision'] = $decision;
            }
        }
        if ($decision === 'UNDECIDED') {
            $out['undecided']++;
        } elseif ($decision === 'CONFIRMED') {
            $out['confirmed_cents'] += (int) $r['base_cents'];
        } elseif ($decision === 'CANCELLED') {
            $out['cancelled_cents'] += (int) $r['base_cents'];
        }
        $out['trips'][] = $r;
    }
    return $out;
}

/** Valor a cobrar na moeda do cartão, proporcional à parte confirmada do valor base. */
function gcv_auth_capture_minor(array $rec, int $confirmedBaseCents): int
{
    $base = max(1, (int) ($rec['amount_cents'] ?? 1));
    $auth = (int) ($rec['card_auth']['amount_minor'] ?? $rec['charged_minor'] ?? 0);
    if ($confirmedBaseCents >= $base) {
        return $auth;
    }
    return (int) floor($auth * $confirmedBaseCents / $base);
}

/**
 * Processa uma reserva com cartão: captura, libera, reserva na janela ou pede ação do cliente.
 *
 * @return string o que aconteceu (para log/cron)
 */
function gcv_auth_process_reservation(string $reservationId): string
{
    $rec = gcv_pix_read_reservation($reservationId);
    if (!$rec) {
        return 'missing';
    }
    $status = strtoupper((string) ($rec['status'] ?? ''));
    if (!in_array($status, ['AUTHORIZED', 'CARD_SAVED'], true)) {
        return 'skip';
    }
    $gateway = (string) ($rec['gateway'] ?? $rec['card_auth']['gateway'] ?? $rec['card_saved']['gateway'] ?? '');
    $ev = gcv_auth_evaluate($reservationId);
    $nowStr = gcv_auth_now()->format('Y-m-d H:i:s');

    // 1) Todos decididos
    if ($ev['undecided'] === 0) {
        if ($ev['confirmed_cents'] <= 0) {
            gcv_auth_release($rec, 'not_confirmed');
            return 'released';
        }
        if ($status === 'CARD_SAVED') {
            // Confirmou antes da janela (ou o cliente não deixou reservar): reserva agora e captura em seguida.
            $r = gcv_auth_try_authorize_saved($rec);
            return 'authorize_for_capture:' . $r;
        }
        return gcv_auth_capture($rec, $ev) ? 'captured' : 'capture_failed';
    }

    // 2) Ainda há passeio sem decisão
    if ($status === 'AUTHORIZED') {
        $exp = (string) ($rec['card_auth']['expires_at'] ?? '');
        if ($exp !== '' && $exp <= gcv_auth_now()->modify('+12 hours')->format('Y-m-d H:i:s')) {
            // Reserva no cartão vai vencer: cobra o que já confirmou e volta a "cartão salvo" para o resto.
            if ($ev['confirmed_cents'] > 0) {
                gcv_auth_capture($rec, $ev, true);
                return 'partial_capture_before_expiry';
            }
            gcv_auth_void_gateway($rec);
            $rec = gcv_pix_read_reservation($reservationId) ?: $rec;
            $rec['status'] = 'CARD_SAVED';
            unset($rec['card_auth']);
            gcv_pix_write_reservation($rec);
            gcv_ledger_upsert(['reservation_id' => $reservationId, 'gateway' => $gateway, 'status' => 'CARD_SAVED']);
            return 'auth_renew_needed';
        }
        return 'waiting';
    }

    // CARD_SAVED: chegou a janela?
    if (gcv_auth_can_authorize_now($rec, $gateway)) {
        $deadline = gcv_auth_customer_deadline_passed($rec);
        if ($deadline) {
            gcv_auth_release($rec, 'card_not_confirmed');
            return 'released_no_card_confirmation';
        }
        return 'authorize:' . gcv_auth_try_authorize_saved($rec);
    }
    return 'waiting_window';
}

/** Prazo do cliente para confirmar o cartão já passou? */
function gcv_auth_customer_deadline_passed(array $rec): bool
{
    $start = gcv_auth_earliest_start($rec);
    if ($start === null) {
        return false;
    }
    $deadline = (new DateTimeImmutable($start, new DateTimeZone('America/Sao_Paulo')))
        ->modify('-' . gcv_auth_customer_deadline_hours() . ' hours')->format('Y-m-d H:i:s');
    return gcv_auth_now()->format('Y-m-d H:i:s') >= $deadline && !empty($rec['card_action']['sent_at']);
}

/** Tenta reservar no cartão salvo (Stripe automático; MP pede o CVV por link). */
function gcv_auth_try_authorize_saved(array $rec): string
{
    $gateway = (string) ($rec['gateway'] ?? $rec['card_saved']['gateway'] ?? '');
    if (gcv_auth_is_fake($gateway)) {
        gcv_auth_mark_reserved((string) $rec['reservation_id'], 'AUTHORIZED', ['gateway' => 'fake', 'auth_id' => 'fake_' . $rec['reservation_id']]);
        return 'authorized';
    }
    if ($gateway === 'stripe') {
        require_once __DIR__ . '/stripe_auth.php';
        return gcv_stripe_auth_off_session($rec);
    }
    if ($gateway === 'mercadopago') {
        return gcv_auth_request_customer_action($rec, 'mp_cvv');
    }
    return 'unknown_gateway';
}

/**
 * Pede ao cliente para confirmar o cartão (link assinado, uma vez a cada 24h).
 */
function gcv_auth_request_customer_action(array $rec, string $reason): string
{
    $last = (string) ($rec['card_action']['sent_at'] ?? '');
    if ($last !== '' && strtotime($last) > time() - 86400) {
        return 'action_pending';
    }
    $rec['card_action'] = [
        'reason' => $reason,
        'sent_at' => gmdate('c'),
        'count' => (int) ($rec['card_action']['count'] ?? 0) + 1,
    ];
    gcv_pix_write_reservation($rec);
    gcv_auth_email_customer($rec, 'action');
    return 'action_requested';
}

/** Link assinado para a página de confirmação do cartão. */
function gcv_auth_action_url(array $rec): string
{
    $rid = (string) $rec['reservation_id'];
    $app = rtrim((string) ($_ENV['APP_URL'] ?? getenv('APP_URL') ?: 'https://www.guiachapadaveadeiros.com'), '/');
    $loc = (string) ($rec['locale'] ?? 'pt');
    $prefix = $loc === 'en' ? '/en' : ($loc === 'es' ? '/es' : '');
    return $app . $prefix . '/confirmar-cartao.html?r=' . rawurlencode($rid) . '&k=' . gcv_auth_action_token($rid);
}

function gcv_auth_action_token(string $reservationId): string
{
    $secret = (string) ($_ENV['APP_SECRET'] ?? getenv('APP_SECRET') ?: '');
    if ($secret === '') {
        $secret = (string) (gcv_load_config()['pix_webhook_secret'] ?? 'gcv');
    }
    return substr(hash_hmac('sha256', 'card-action|' . $reservationId, $secret), 0, 32);
}

function gcv_auth_valid_action_token(string $reservationId, string $token): bool
{
    return $token !== '' && hash_equals(gcv_auth_action_token($reservationId), $token);
}

/**
 * Captura (cobra) a parte confirmada. $partial = reserva vai vencer e ainda há passeio pendente.
 */
function gcv_auth_capture(array $rec, array $ev, bool $partial = false): bool
{
    $rid = (string) $rec['reservation_id'];
    $gateway = (string) ($rec['card_auth']['gateway'] ?? $rec['gateway'] ?? '');
    $authId = (string) ($rec['card_auth']['id'] ?? '');
    $minor = gcv_auth_capture_minor($rec, (int) $ev['confirmed_cents']);
    if ($authId === '' || $minor <= 0) {
        return false;
    }
    if (gcv_auth_is_fake($gateway)) {
        $ok = true;
    } elseif ($gateway === 'stripe') {
        require_once __DIR__ . '/stripe_auth.php';
        $ok = gcv_stripe_auth_capture($authId, $minor);
    } else {
        require_once __DIR__ . '/mercadopago_api.php';
        $ok = gcv_mp_capture($authId, $minor);
    }
    if (!$ok) {
        gcv_ledger_alert_admin('Falha ao cobrar cartão — ' . $rid, '<p>Não foi possível capturar a reserva no cartão da reserva <strong>' . htmlspecialchars($rid, ENT_QUOTES, 'UTF-8') . '</strong>. Verifique na plataforma (' . htmlspecialchars($gateway, ENT_QUOTES, 'UTF-8') . ').</p>');
        return false;
    }

    // Passeios confirmados viram CAPTURED; cancelados (e, na captura parcial, os ainda sem
    // decisão) viram RELEASED com as vagas devolvidas.
    $releasedTrips = [];
    $orphanTitles = [];
    foreach ($ev['trips'] as $t) {
        if ($t['decision'] === 'CONFIRMED') {
            db()->prepare("UPDATE gcv_booking_trips SET decision = 'CAPTURED' WHERE id = ?")->execute([(int) $t['id']]);
        } elseif ($t['decision'] === 'CANCELLED' || ($partial && $t['decision'] === 'UNDECIDED')) {
            db()->prepare("UPDATE gcv_booking_trips SET decision = 'RELEASED', decided_at = NOW() WHERE id = ?")->execute([(int) $t['id']]);
            $releasedTrips[] = (int) $t['trip_index'];
            if ($t['decision'] === 'UNDECIDED') {
                $orphanTitles[] = trim((string) ($t['title'] ?? '') . ' ' . (string) ($t['starts_at'] ?? ''));
            }
        }
    }
    gcv_auth_release_seats($rec, $releasedTrips);
    if ($orphanTitles) {
        // Raro: carrinho de vários dias em que a reserva no cartão venceu antes de decidir todos.
        gcv_ledger_alert_admin(
            'Reserva ' . $rid . ': passeio sem decisão liberado',
            '<p>A reserva no cartão de <strong>' . htmlspecialchars($rid, ENT_QUOTES, 'UTF-8') . '</strong> ia vencer. Cobramos os passeios já confirmados e liberamos estes, que ainda não tinham confirmado: '
            . htmlspecialchars(implode('; ', $orphanTitles), ENT_QUOTES, 'UTF-8') . '. Combine com o cliente uma nova cobrança se o passeio acontecer.</p>'
        );
    }

    $rec = gcv_pix_read_reservation($rid) ?: $rec;
    $rec['captured_minor'] = (int) ($rec['captured_minor'] ?? 0) + $minor;
    $rec['amount_cents'] = (int) $ev['confirmed_cents'];
    $rec['amount'] = round($ev['confirmed_cents'] / 100, 2);
    $rec['charged_label'] = gcv_checkout_label_for($rec, $minor);
    unset($rec['card_auth']);
    gcv_pix_write_reservation($rec);

    // Venda passa a PAID → libera o repasse ao guia no dia do passeio.
    $marked = gcv_pix_mark_paid($rid, $gateway);

    // Registro de transações com a taxa real.
    if (gcv_auth_is_fake($gateway)) {
        gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => 'manual', 'method' => 'card_br', 'status' => 'PAID', 'gross_cents' => $minor, 'charge_minor' => $minor]);
    } elseif ($gateway === 'stripe') {
        require_once __DIR__ . '/stripe_ledger.php';
        gcv_stripe_ledger_from_intent($marked ?: $rec, $authId);
    } else {
        $p = gcv_mp_get_payment($authId);
        if ($p) {
            gcv_mp_apply_payment($p);
        }
    }
    gcv_auth_email_customer($marked ?: $rec, 'captured');
    return true;
}

function gcv_checkout_label_for(array $rec, int $minor): string
{
    require_once __DIR__ . '/checkout_common.php';
    $inst = (int) ($rec['installments'] ?? $rec['card_auth']['installments'] ?? 1);
    return gcv_checkout_charged_label((string) ($rec['charged_currency'] ?? 'BRL'), $minor, $inst);
}

/** Cancela a reserva no cartão na plataforma (sem cobrar). */
function gcv_auth_void_gateway(array $rec): bool
{
    $authId = (string) ($rec['card_auth']['id'] ?? '');
    $gateway = (string) ($rec['card_auth']['gateway'] ?? $rec['gateway'] ?? '');
    if ($authId === '' || gcv_auth_is_fake($gateway)) {
        return true;
    }
    if ($gateway === 'stripe') {
        require_once __DIR__ . '/stripe_auth.php';
        return gcv_stripe_auth_cancel($authId);
    }
    require_once __DIR__ . '/mercadopago_api.php';
    return gcv_mp_cancel($authId);
}

/** Passeio não confirmou: libera o cartão, devolve as vagas, cancela a venda e avisa. */
function gcv_auth_release(array $rec, string $reason): void
{
    $rid = (string) $rec['reservation_id'];
    gcv_auth_void_gateway($rec);
    $rec = gcv_pix_read_reservation($rid) ?: $rec;
    $rec['status'] = 'RELEASED';
    $rec['released_at'] = gmdate('c');
    $rec['release_reason'] = $reason;
    unset($rec['card_auth']);
    gcv_pix_write_reservation($rec);
    db()->prepare("UPDATE gcv_booking_trips SET decision = 'RELEASED', decided_at = COALESCE(decided_at, NOW()) WHERE reservation_id = ? AND decision <> 'CAPTURED'")
        ->execute([$rid]);
    gcv_auth_release_seats($rec, null);
    try {
        db()->prepare("UPDATE gcv_sales SET sale_status = 'CANCELLED', payout_status = 'PAYOUT_BLOCKED' WHERE reservation_id = ? AND deleted_at IS NULL AND sale_status IN ('AUTHORIZED','PENDING')")
            ->execute([$rid]);
        $exc = db()->prepare('SELECT excursion_id FROM gcv_sales WHERE reservation_id = ? LIMIT 1');
        $exc->execute([$rid]);
        $excId = (int) $exc->fetchColumn();
        if ($excId > 0) {
            require_once __DIR__ . '/../marketplace/sale_service.php';
            gcv_sale_refresh_booked_people($excId);
        }
    } catch (Throwable $e) {
        error_log('auth release sale: ' . $e->getMessage());
    }
    $gw = (string) ($rec['gateway'] ?? '');
    if (in_array($gw, ['mercadopago', 'stripe'], true)) {
        gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => $gw, 'status' => 'RELEASED']);
    }
    gcv_auth_email_customer($rec, 'released');
}

/**
 * Devolve vagas: $tripIndexes = null → todos os passeios; senão só os índices dados.
 *
 * @param list<int>|null $tripIndexes
 */
function gcv_auth_release_seats(array $rec, ?array $tripIndexes): void
{
    if ($tripIndexes !== null && !$tripIndexes) {
        return;
    }
    $trips = is_array($rec['trips'] ?? null) ? $rec['trips'] : [];
    if ($tripIndexes !== null) {
        $trips = array_values(array_intersect_key($trips, array_flip($tripIndexes)));
    }
    if (!$trips) {
        return;
    }
    try {
        require_once __DIR__ . '/../pix_seats_store.php';
        $copy = $rec;
        $copy['trips'] = $trips;
        gcv_pix_seats_release_reservation($copy);
        // Liberação parcial: a função acima apaga a marca "vagas aplicadas" da reserva inteira;
        // repõe a marca para os passeios que continuam (sem somar vagas de novo).
        $total = count(is_array($rec['trips'] ?? null) ? $rec['trips'] : []);
        if ($tripIndexes !== null && count($tripIndexes) < $total) {
            $rid = gcv_pix_seats_safe_reservation_id((string) $rec['reservation_id']);
            $pdo = gcv_pix_seats_db();
            if ($pdo) {
                $pdo->prepare('INSERT IGNORE INTO gcv_pix_carousel_seat_applied (reservation_id) VALUES (?)')->execute([$rid]);
            } else {
                $store = gcv_pix_seats_read_json();
                $store['applied'][$rid] = true;
                gcv_pix_seats_write_json($store);
            }
        }
    } catch (Throwable $e) {
        error_log('auth release seats: ' . $e->getMessage());
    }
}

/** Todas as reservas com cartão em andamento (para o cron). @return list<string> */
function gcv_auth_open_reservations(int $limit = 100): array
{
    gcv_auth_ensure_schema();
    $st = db()->prepare(
        "SELECT reservation_id FROM gcv_payment_transactions
         WHERE gateway IN ('mercadopago','stripe') AND status IN ('AUTHORIZED','CARD_SAVED')
         ORDER BY updated_at ASC LIMIT " . max(1, min(500, $limit))
    );
    $st->execute();
    return array_values(array_unique($st->fetchAll(PDO::FETCH_COLUMN) ?: []));
}

/**
 * Alerta o admin (uma vez) quando falta pouco e o guia não confirmou passeio com quórum.
 */
function gcv_auth_guide_alerts(): int
{
    gcv_auth_ensure_schema();
    $hours = max(gcv_auth_decision_hours() + 1, gcv_auth_env_int('PAY_GUIDE_ALERT_HOURS', 24));
    $limit = gcv_auth_now()->modify("+{$hours} hours")->format('Y-m-d H:i:s');
    $rows = db()->prepare(
        "SELECT t.*, u.name AS guide_name FROM gcv_booking_trips t
         LEFT JOIN gcv_users u ON u.id = t.guide_user_id
         WHERE t.payment_kind = 'card' AND t.decision = 'UNDECIDED' AND t.guide_confirmed_at IS NULL
           AND t.guide_alerted_at IS NULL AND t.starts_at IS NOT NULL AND t.starts_at <= ? AND t.starts_at > NOW()
         LIMIT 50"
    );
    $rows->execute([$limit]);
    $n = 0;
    foreach ($rows->fetchAll(PDO::FETCH_ASSOC) ?: [] as $t) {
        gcv_ledger_alert_admin(
            'Guia ainda não confirmou — ' . $t['reservation_id'],
            '<p>A reserva <strong>' . htmlspecialchars((string) $t['reservation_id'], ENT_QUOTES, 'UTF-8') . '</strong> ('
            . htmlspecialchars((string) ($t['title'] ?? ''), ENT_QUOTES, 'UTF-8') . ', saída ' . htmlspecialchars((string) $t['starts_at'], ENT_QUOTES, 'UTF-8')
            . ') foi paga com cartão e o guia ' . htmlspecialchars((string) ($t['guide_name'] ?? ''), ENT_QUOTES, 'UTF-8')
            . ' ainda não confirmou.</p><p>Sem confirmação até ' . gcv_auth_decision_hours()
            . 'h antes da saída, o cartão é liberado e nada é cobrado. O guia confirma na Agenda. Você pode confirmar pelo painel (Financeiro → Reservas para confirmar).</p>'
        );
        db()->prepare('UPDATE gcv_booking_trips SET guide_alerted_at = NOW() WHERE id = ?')->execute([(int) $t['id']]);
        $n++;
    }
    return $n;
}

/**
 * Guia (ou admin) confirma um passeio de uma reserva.
 *
 * @param array<string,mixed> $user usuário logado (id, role)
 */
function gcv_auth_guide_confirm(int $tripId, array $user, bool $isAdmin = false): array
{
    gcv_auth_ensure_schema();
    $st = db()->prepare('SELECT * FROM gcv_booking_trips WHERE id = ? LIMIT 1');
    $st->execute([$tripId]);
    $t = $st->fetch(PDO::FETCH_ASSOC);
    if (!$t) {
        return ['ok' => false, 'error' => 'Reserva não encontrada'];
    }
    if (!$isAdmin && (int) ($t['guide_user_id'] ?? 0) !== (int) ($user['id'] ?? -1)) {
        return ['ok' => false, 'error' => 'Esta reserva não é sua'];
    }
    if (!in_array($t['decision'], ['UNDECIDED', 'CONFIRMED'], true)) {
        return ['ok' => false, 'error' => 'Reserva já encerrada'];
    }
    if (empty($t['guide_confirmed_at'])) {
        db()->prepare('UPDATE gcv_booking_trips SET guide_confirmed_at = NOW(), guide_confirmed_by = ? WHERE id = ?')
            ->execute([(int) ($user['id'] ?? 0), $tripId]);
    }
    // Pode já dar para cobrar.
    $result = $t['payment_kind'] === 'card' ? gcv_auth_process_reservation((string) $t['reservation_id']) : 'pix';
    return ['ok' => true, 'result' => $result];
}

/**
 * Passeios em aberto de uma saída que o guia ainda não aceitou guiar.
 *
 * @param array<string,mixed> $user
 * @return list<array<string,mixed>>
 */
function gcv_auth_open_guide_trips(int $excursionId, array $user, bool $isAdmin): array
{
    gcv_auth_ensure_schema();
    $sql = "SELECT * FROM gcv_booking_trips
            WHERE excursion_id = ?
              AND decision IN ('UNDECIDED','CONFIRMED')
              AND guide_confirmed_at IS NULL";
    $params = [$excursionId];
    if (!$isAdmin) {
        $sql .= ' AND guide_user_id = ?';
        $params[] = (int)($user['id'] ?? 0);
    }
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/**
 * O guia aceita guiar a saída inteira (compra do site que ainda não era excursão lançada).
 *
 * @param array<string,mixed> $user
 */
function gcv_auth_guide_confirm_excursion(int $excursionId, array $user, bool $isAdmin = false): array
{
    $trips = gcv_auth_open_guide_trips($excursionId, $user, $isAdmin);
    if (!$trips) {
        return ['ok' => false, 'error' => 'Este passeio não está aguardando a sua confirmação'];
    }
    $results = [];
    foreach ($trips as $t) {
        $one = gcv_auth_guide_confirm((int)$t['id'], $user, $isAdmin);
        if (empty($one['ok'])) {
            return $one;
        }
        $results[] = $one['result'] ?? '';
    }
    return ['ok' => true, 'result' => implode(',', $results), 'trips' => count($trips)];
}

/**
 * O guia recusa guiar a saída. Libera o cartão e tira o passeio da agenda.
 *
 * @param array<string,mixed> $user
 */
function gcv_auth_guide_decline_excursion(int $excursionId, array $user, bool $isAdmin = false): array
{
    gcv_auth_ensure_schema();
    $st = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
    $st->execute([$excursionId]);
    $exc = $st->fetch(PDO::FETCH_ASSOC);
    if (!$exc) {
        return ['ok' => false, 'error' => 'Passeio não encontrado'];
    }
    if (!$isAdmin && (int)($exc['guide_user_id'] ?? 0) !== (int)($user['id'] ?? -1)) {
        return ['ok' => false, 'error' => 'Este passeio não é seu'];
    }
    require_once __DIR__ . '/../excursion_status.php';
    if (gcv_excursion_is_guide_submitted($exc) && in_array((string)($exc['status'] ?? ''), ['published', 'soldout'], true)) {
        return ['ok' => false, 'error' => 'Este passeio já foi lançado por você'];
    }
    $trips = gcv_auth_open_guide_trips($excursionId, $user, $isAdmin);
    if (!$trips) {
        return ['ok' => false, 'error' => 'Este passeio não está aguardando a sua confirmação'];
    }
    $ids = array_map(static fn ($t) => (int)$t['id'], $trips);
    $place = implode(',', array_fill(0, count($ids), '?'));
    db()->prepare(
        "UPDATE gcv_booking_trips SET decision = 'CANCELLED', decided_at = NOW() WHERE id IN ($place)"
    )->execute($ids);
    $seen = [];
    foreach ($trips as $t) {
        $rid = (string)($t['reservation_id'] ?? '');
        if ($rid === '' || isset($seen[$rid]) || ($t['payment_kind'] ?? '') !== 'card') {
            continue;
        }
        $seen[$rid] = true;
        gcv_auth_process_reservation($rid);
    }
    if (!$isAdmin) {
        db()->prepare("UPDATE gcv_excursions SET status = 'cancelled' WHERE id = ? AND guide_user_id = ?")
            ->execute([$excursionId, (int)($user['id'] ?? 0)]);
    } else {
        db()->prepare("UPDATE gcv_excursions SET status = 'cancelled' WHERE id = ?")->execute([$excursionId]);
    }
    return ['ok' => true, 'result' => 'declined', 'trips' => count($trips)];
}

/**
 * E-mails ao cliente: reserved | action | captured | released.
 */
function gcv_auth_email_customer(array $rec, string $kind): void
{
    $to = trim((string) ($rec['email'] ?? ''));
    if ($to === '') {
        return;
    }
    $loc = in_array($rec['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $rec['locale'] : 'pt';
    $rid = htmlspecialchars((string) $rec['reservation_id'], ENT_QUOTES, 'UTF-8');
    $amount = htmlspecialchars((string) ($rec['charged_label'] ?? ''), ENT_QUOTES, 'UTF-8');
    $T = [
        'reserved' => [
            'pt' => ['Vaga reservada — ' . $rid, '<p>Sua vaga na reserva <strong>' . $rid . '</strong> está garantida.</p><p><strong>Nada foi cobrado ainda.</strong> O valor (' . $amount . ') fica reservado no seu cartão e só é cobrado quando o passeio for confirmado (grupo mínimo atingido e guia confirmado). Se o passeio não confirmar, a reserva no cartão é liberada automaticamente e você não paga nada.</p>'],
            'en' => ['Spot reserved — ' . $rid, '<p>Your spot for booking <strong>' . $rid . '</strong> is secured.</p><p><strong>You have not been charged yet.</strong> The amount (' . $amount . ') is held on your card and only charged once the tour is confirmed (minimum group reached and guide confirmed). If the tour is not confirmed, the hold is released automatically and you pay nothing.</p>'],
            'es' => ['Cupo reservado — ' . $rid, '<p>Tu cupo en la reserva <strong>' . $rid . '</strong> está garantizado.</p><p><strong>Todavía no se cobró nada.</strong> El monto (' . $amount . ') queda reservado en tu tarjeta y solo se cobra cuando el paseo se confirme (grupo mínimo y guía confirmado). Si no se confirma, la reserva se libera automáticamente y no pagas nada.</p>'],
        ],
        'action' => [
            'pt' => ['Confirme seu cartão — ' . $rid, '<p>Seu passeio (reserva <strong>' . $rid . '</strong>) está chegando. Para manter a vaga, confirme o cartão salvo (leva 10 segundos):</p><p><a href="{{url}}">Confirmar meu cartão</a></p><p>Ainda não será cobrado: o valor só é cobrado quando o passeio confirmar. Sem essa confirmação até ' . gcv_auth_customer_deadline_hours() . 'h antes da saída, a vaga é liberada.</p>'],
            'en' => ['Confirm your card — ' . $rid, '<p>Your tour (booking <strong>' . $rid . '</strong>) is coming up. To keep your spot, confirm your saved card (takes 10 seconds):</p><p><a href="{{url}}">Confirm my card</a></p><p>You will not be charged yet: the charge only happens once the tour is confirmed. Without this confirmation ' . gcv_auth_customer_deadline_hours() . 'h before departure, the spot is released.</p>'],
            'es' => ['Confirma tu tarjeta — ' . $rid, '<p>Tu paseo (reserva <strong>' . $rid . '</strong>) se acerca. Para mantener el cupo, confirma la tarjeta guardada (10 segundos):</p><p><a href="{{url}}">Confirmar mi tarjeta</a></p><p>Aún no se cobrará: el cobro solo ocurre cuando el paseo se confirme. Sin esta confirmación ' . gcv_auth_customer_deadline_hours() . 'h antes de la salida, el cupo se libera.</p>'],
        ],
        'captured' => [
            'pt' => ['Passeio confirmado — ' . $rid, '<p>Boa notícia: o passeio da reserva <strong>' . $rid . '</strong> está <strong>confirmado</strong>! Cobramos ' . $amount . ' no seu cartão. Nos vemos na Chapada!</p><p>Política: após a confirmação não há reembolso em caso de desistência.</p>'],
            'en' => ['Tour confirmed — ' . $rid, '<p>Good news: the tour for booking <strong>' . $rid . '</strong> is <strong>confirmed</strong>! We charged ' . $amount . ' to your card. See you in Chapada!</p><p>Policy: after confirmation there is no refund for cancellations.</p>'],
            'es' => ['Paseo confirmado — ' . $rid, '<p>¡Buenas noticias! El paseo de la reserva <strong>' . $rid . '</strong> está <strong>confirmado</strong>. Cobramos ' . $amount . ' en tu tarjeta. ¡Nos vemos en la Chapada!</p><p>Política: tras la confirmación no hay reembolso por desistimiento.</p>'],
        ],
        'released' => [
            'pt' => ['Passeio não confirmado — nada foi cobrado', '<p>O passeio da reserva <strong>' . $rid . '</strong> não confirmou a tempo. <strong>Nada foi cobrado</strong> e a reserva no seu cartão foi liberada (pode levar alguns dias para o banco atualizar o limite).</p><p>Quer outra data? Fale com a gente pelo WhatsApp.</p>'],
            'en' => ['Tour not confirmed — you were not charged', '<p>The tour for booking <strong>' . $rid . '</strong> was not confirmed in time. <strong>You were not charged</strong> and the hold on your card was released (your bank may take a few days to update your limit).</p><p>Want another date? Message us on WhatsApp.</p>'],
            'es' => ['Paseo no confirmado — no se cobró nada', '<p>El paseo de la reserva <strong>' . $rid . '</strong> no se confirmó a tiempo. <strong>No se cobró nada</strong> y la reserva en tu tarjeta fue liberada (el banco puede tardar unos días en actualizar tu límite).</p><p>¿Otra fecha? Escríbenos por WhatsApp.</p>'],
        ],
    ];
    if (!isset($T[$kind][$loc])) {
        return;
    }
    [$subject, $html] = $T[$kind][$loc];
    $html = str_replace('{{url}}', htmlspecialchars(gcv_auth_action_url($rec), ENT_QUOTES, 'UTF-8'), $html);
    try {
        require_once __DIR__ . '/../mailer.php';
        if (empty($GLOBALS['gcvMailerReady'])) {
            $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
            if (is_readable($autoload)) {
                require_once $autoload;
                $GLOBALS['gcvMailerReady'] = true;
            }
        }
        send_mail($to, html_entity_decode($subject, ENT_QUOTES, 'UTF-8'), $html, (string) ($rec['name'] ?? ''));
    } catch (Throwable $e) {
        error_log('auth email ' . $kind . ': ' . $e->getMessage());
    }
}
