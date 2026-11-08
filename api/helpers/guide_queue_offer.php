<?php
declare(strict_types=1);

/**
 * O guia cancela a própria guiagem sem cancelar o passeio dos clientes.
 * A vaga volta para os 3 primeiros da fila, com o mesmo aceite e os mesmos
 * avisos de uma compra nova. Quem aceita vai para o fim da fila.
 * O cliente só é avisado quando a troca fecha. O passeio só é cancelado
 * se não houver guia disponível.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/guide_substitution.php';

function gcv_guiagem_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_guide_queue_offers (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              excursion_id INT UNSIGNED NOT NULL,
              guide_user_id INT UNSIGNED NOT NULL,
              status VARCHAR(16) NOT NULL DEFAULT 'pending',
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              decided_at DATETIME NULL,
              INDEX idx_qoffer_exc (excursion_id, status),
              INDEX idx_qoffer_guide (guide_user_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('gcv_guiagem_ensure_schema: ' . $e->getMessage());
    }
    gcv_guiagem_ensure_priority_columns();
}

function gcv_guiagem_column_exists(string $column): bool
{
    if (!preg_match('/^[a-z_]+$/', $column)) {
        return false;
    }
    try {
        db()->query('SELECT `' . $column . '` FROM gcv_guide_queue_offers LIMIT 0');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/** Colunas da prioridade de 24 h (Diego). A tabela antiga só tinha a fila. */
function gcv_guiagem_ensure_priority_columns(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    try {
        if (!gcv_guiagem_column_exists('kind')) {
            db()->exec(
                "ALTER TABLE gcv_guide_queue_offers
                 ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'queue' AFTER status"
            );
        }
        if (!gcv_guiagem_column_exists('expires_at')) {
            db()->exec(
                'ALTER TABLE gcv_guide_queue_offers ADD COLUMN expires_at DATETIME NULL AFTER decided_at'
            );
        }
        if (!gcv_guiagem_column_exists('accept_token')) {
            db()->exec(
                'ALTER TABLE gcv_guide_queue_offers ADD COLUMN accept_token VARCHAR(64) NULL AFTER expires_at'
            );
        }
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_excursion_guide_seats (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              excursion_id INT UNSIGNED NOT NULL,
              guide_user_id INT UNSIGNED NOT NULL,
              accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_exc_guide_seat (excursion_id, guide_user_id),
              INDEX idx_seat_exc (excursion_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $done = true;
    } catch (Throwable $e) {
        error_log('gcv_guiagem_ensure_priority_columns: ' . $e->getMessage());
    }
}

function gcv_guiagem_top_count(): int
{
    return 3;
}

/** Guias com veículo necessários: 1 sem translado; com translado, 1 a cada 4 clientes. */
function gcv_guiagem_guides_needed(array $tour): int
{
    $inCars = (int)($tour['booked_people_transport'] ?? 0);
    if ($inCars < 1 && !empty($tour['include_transport'])) {
        require_once __DIR__ . '/excursion_status.php';
        $inCars = gcv_excursion_occupied_people($tour);
    }
    if ($inCars < 1) {
        return 1;
    }
    return max(1, (int)ceil($inCars / 4));
}

/** @return list<int> */
function gcv_guiagem_seat_ids(int $excursionId): array
{
    if ($excursionId <= 0) {
        return [];
    }
    gcv_guiagem_ensure_schema();
    try {
        $st = db()->prepare(
            'SELECT guide_user_id FROM gcv_excursion_guide_seats WHERE excursion_id = ? ORDER BY id ASC'
        );
        $st->execute([$excursionId]);
        return array_values(array_unique(array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: [])));
    } catch (Throwable $e) {
        error_log('gcv_guiagem_seat_ids: ' . $e->getMessage());
        return [];
    }
}

/**
 * Guias que já contam nesta saída: quem aceitou a vaga e, na saída lançada pelo próprio guia, ele mesmo.
 *
 * @param array<string,mixed> $tour
 * @return list<int>
 */
function gcv_guiagem_filled_ids(array $tour): array
{
    $id = (int)($tour['id'] ?? 0);
    $ids = gcv_guiagem_seat_ids($id);
    $owner = (int)($tour['guide_user_id'] ?? 0);
    if ($owner > 0 && !in_array($owner, $ids, true)) {
        require_once __DIR__ . '/excursion_status.php';
        if (gcv_excursion_is_guide_submitted($tour)) {
            $ids[] = $owner;
        }
    }
    return array_values(array_unique(array_filter($ids, static fn ($v) => $v > 0)));
}

/** @param array<string,mixed> $tour */
function gcv_guiagem_staffing_ready(array $tour): bool
{
    return count(gcv_guiagem_filled_ids($tour)) >= gcv_guiagem_guides_needed($tour);
}

/** Abre o próximo convite do TOP 3 quando ainda falta guia e ninguém está com a vaga na mão. */
function gcv_guiagem_ensure_invites(array $tour): void
{
    static $done = [];
    $id = (int)($tour['id'] ?? 0);
    if ($id <= 0 || isset($done[$id]) || gcv_guiagem_staffing_ready($tour)) {
        return;
    }
    $done[$id] = true;
    if (gcv_guiagem_pending_guide_ids($id)) {
        return;
    }
    if (!in_array((string)($tour['status'] ?? ''), ['published', 'soldout'], true)) {
        return;
    }
    $picked = gcv_guiagem_open_top($tour, 0);
    if (!$picked) {
        return;
    }
    gcv_guiagem_notify_new_purchase($id, array_map(static fn ($g) => (int)($g['id'] ?? 0), $picked));
}

function gcv_guiagem_new_token(): string
{
    return bin2hex(random_bytes(16));
}

function gcv_guiagem_offer_url(string $token): string
{
    return 'https://www.guiachapadaveadeiros.com/api/guides/accept-offer.php?t=' . rawurlencode($token);
}

function gcv_guiagem_ensure_offer_token(int $excursionId, int $guideId): string
{
    gcv_guiagem_ensure_schema();
    $st = db()->prepare(
        "SELECT id, accept_token FROM gcv_guide_queue_offers
         WHERE excursion_id = ? AND guide_user_id = ? AND status = 'pending'
         ORDER BY id DESC LIMIT 1"
    );
    $st->execute([$excursionId, $guideId]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    if (!$row) {
        return '';
    }
    $token = trim((string)($row['accept_token'] ?? ''));
    if ($token === '') {
        $token = gcv_guiagem_new_token();
        db()->prepare('UPDATE gcv_guide_queue_offers SET accept_token = ? WHERE id = ?')->execute([$token, (int)$row['id']]);
    }
    return $token;
}

/**
 * Admin destaca um guia: não associa na hora. O guia confirma no link do WhatsApp.
 *
 * @return array{ok:bool,error?:string,token?:string}
 */
function gcv_guiagem_designate(int $excursionId, int $guideId): array
{
    gcv_guiagem_ensure_schema();
    if ($excursionId <= 0 || $guideId <= 0) {
        return ['ok' => false, 'error' => 'Guia inválido'];
    }
    $tour = gcv_substitution_load_excursion($excursionId);
    if (!$tour) {
        return ['ok' => false, 'error' => 'Passeio não encontrado'];
    }
    $guideOk = db()->prepare(
        "SELECT u.id FROM gcv_users u INNER JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ? AND u.status = 'active' LIMIT 1"
    );
    $guideOk->execute([$guideId]);
    if (!$guideOk->fetchColumn()) {
        return ['ok' => false, 'error' => 'Guia inválido'];
    }
    if (in_array($guideId, gcv_guiagem_filled_ids($tour), true)) {
        return ['ok' => true];
    }
    if (gcv_guiagem_staffing_ready($tour)) {
        return ['ok' => false, 'error' => 'Esta saída já tem os guias necessários'];
    }
    $token = gcv_guiagem_ensure_offer_token($excursionId, $guideId);
    if ($token === '') {
        $token = gcv_guiagem_new_token();
        db()->prepare(
            "INSERT INTO gcv_guide_queue_offers (excursion_id, guide_user_id, status, kind, accept_token)
             VALUES (?, ?, 'pending', 'admin', ?)"
        )->execute([$excursionId, $guideId, $token]);
    }
    gcv_guiagem_notify_new_purchase($excursionId, [$guideId]);
    return ['ok' => true, 'token' => $token];
}

function gcv_guiagem_notify_seat_accepted(int $guideId, array $tour, int $stillNeed): void
{
    try {
        require_once __DIR__ . '/notify_ops.php';
        $title = trim((string)($tour['attraction_title'] ?? ''));
        if ($title === '') {
            $title = 'o passeio';
        }
        $when = trim(
            (function_exists('gcv_ops_date_br') ? gcv_ops_date_br((string)($tour['date_iso'] ?? '')) : (string)($tour['date_iso'] ?? ''))
            . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5)
        );
        $text = "Guiagem confirmada.\n\nVocê aceitou " . $title . ".\n"
            . ($when !== '' ? 'Quando: ' . $when . "\n" : '');
        if ($stillNeed > 0) {
            $text .= 'Ainda falta ' . $stillNeed . ' guia(s) com veículo. A cobrança dos clientes espera todos.';
        } else {
            $text .= 'Sua vaga nesta saída está confirmada.';
        }
        gcv_ops_wa_guide($guideId, $text, ['kind' => 'guide_accepted', 'excursion_id' => (int)($tour['id'] ?? 0)]);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_seat_accepted: ' . $e->getMessage());
    }
}

/** @return list<int> */
function gcv_guiagem_pending_guide_ids(int $excursionId): array
{
    if ($excursionId <= 0) {
        return [];
    }
    gcv_guiagem_ensure_schema();
    try {
        $st = db()->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND status = 'pending'
             ORDER BY id ASC"
        );
        $st->execute([$excursionId]);
        return array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_pending_guide_ids: ' . $e->getMessage());
        return [];
    }
}

function gcv_guiagem_pending_for(int $excursionId, int $guideId): bool
{
    if ($excursionId <= 0 || $guideId <= 0) {
        return false;
    }
    return in_array($guideId, gcv_guiagem_pending_guide_ids($excursionId), true);
}

/** @return array<int,true> */
function gcv_guiagem_skip_ids(int $excursionId): array
{
    gcv_guiagem_ensure_schema();
    $skip = [];
    try {
        $st = db()->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND status IN ('declined','released','accepted','expired')"
        );
        $st->execute([$excursionId]);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) ?: [] as $id) {
            $skip[(int)$id] = true;
        }
        foreach (gcv_guiagem_seat_ids($excursionId) as $id) {
            $skip[$id] = true;
        }
        $owner = db()->prepare('SELECT guide_user_id FROM gcv_excursions WHERE id = ? LIMIT 1');
        $owner->execute([$excursionId]);
        $ownerId = (int)($owner->fetchColumn() ?: 0);
        if ($ownerId > 0) {
            $skip[$ownerId] = true;
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_skip_ids: ' . $e->getMessage());
    }
    return $skip;
}

function gcv_guiagem_priority_min_cents(): int
{
    return 50000;
}

function gcv_guiagem_priority_ensure_setting(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        $pdo = db();
        $st = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $st->execute(['guia_especial_ativa']);
        if (!$st->fetchColumn()) {
            $pdo->prepare(
                'INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)'
            )->execute([
                'guia_especial_ativa',
                '1',
                'Guia especial: prioridade acima de R$ 500 ou em outro idioma',
                'integer',
            ]);
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_priority_ensure_setting: ' . $e->getMessage());
    }
}

/** Ligada por padrão. Só desliga quando o admin grava 0. */
function gcv_guiagem_priority_enabled(): bool
{
    gcv_guiagem_priority_ensure_setting();
    try {
        $st = db()->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $st->execute(['guia_especial_ativa']);
        $v = $st->fetchColumn();
        if ($v === false || $v === null || $v === '') {
            return true;
        }
        return !in_array(strtolower(trim((string)$v)), ['0', 'false', 'off', 'nao', 'não'], true);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_priority_enabled: ' . $e->getMessage());
        return true;
    }
}

function gcv_guiagem_priority_hours(): int
{
    return 24;
}

/** Guia que recebe a prioridade. E-mail ou nome completo. */
function gcv_guiagem_priority_guide_id(): int
{
    static $id = null;
    if ($id !== null) {
        return $id;
    }
    $id = 0;
    try {
        $st = db()->query(
            "SELECT u.id
             FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.status = 'active'
               AND (
                 LOWER(TRIM(u.email)) = 'diegonavi82@gmail.com'
                 OR LOWER(TRIM(COALESCE(g.full_name, ''))) = 'diego navi marques carvalho'
               )
             ORDER BY CASE WHEN LOWER(TRIM(u.email)) = 'diegonavi82@gmail.com' THEN 0 ELSE 1 END, u.id ASC
             LIMIT 1"
        );
        $id = (int)($st->fetchColumn() ?: 0);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_priority_guide_id: ' . $e->getMessage());
    }
    return $id;
}

function gcv_guiagem_trip_other_language(array $trip): bool
{
    $lang = strtolower(trim((string)($trip['guiaIdioma'] ?? $trip['idiomaGuia'] ?? '')));
    if ($lang !== '' && $lang !== 'pt') {
        return true;
    }
    $extra = (int)($trip['bilingueExtraCents'] ?? $trip['bilingue_extra_cents'] ?? 0);
    if ($extra > 0) {
        return true;
    }
    $cart = (string)($trip['cartId'] ?? $trip['cart_id'] ?? $trip['id'] ?? '');
    return (bool)preg_match('/-bi-(?!pt)([a-z]{2})$/', $cart);
}

/** @param array<string,mixed> $tour */
function gcv_guiagem_trip_matches_tour(array $trip, array $tour): bool
{
    $want = (int)($tour['id'] ?? 0);
    $got = (int)($trip['excursion_id'] ?? $trip['cms_excursion_id'] ?? 0);
    if ($want > 0 && $got > 0 && $got !== $want) {
        return false;
    }
    $date = substr(trim((string)($trip['dateIso'] ?? $trip['date_iso'] ?? $trip['dateISO'] ?? '')), 0, 10);
    $tourDate = (string)($tour['date_iso'] ?? '');
    if ($date !== '' && $tourDate !== '' && $date !== $tourDate) {
        return false;
    }
    return true;
}

function gcv_guiagem_amount_cents(int $excursionId): int
{
    if ($excursionId <= 0) {
        return 0;
    }
    try {
        $st = db()->prepare(
            "SELECT COALESCE(SUM(guide_amount_cents), 0)
             FROM gcv_sales
             WHERE excursion_id = ?
               AND deleted_at IS NULL
               AND sale_status IN ('PAID', 'AUTHORIZED')"
        );
        $st->execute([$excursionId]);
        return max(0, (int)$st->fetchColumn());
    } catch (Throwable $e) {
        error_log('gcv_guiagem_amount_cents: ' . $e->getMessage());
        return 0;
    }
}

/** @param array<string,mixed> $tour */
function gcv_guiagem_has_other_language(array $tour): bool
{
    $excursionId = (int)($tour['id'] ?? 0);
    if ($excursionId <= 0) {
        return false;
    }
    try {
        $st = db()->prepare(
            "SELECT reservation_id
             FROM gcv_sales
             WHERE excursion_id = ?
               AND deleted_at IS NULL
               AND sale_status IN ('PAID', 'AUTHORIZED')"
        );
        $st->execute([$excursionId]);
        $ids = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
    } catch (Throwable $e) {
        error_log('gcv_guiagem_has_other_language: ' . $e->getMessage());
        return false;
    }
    if (!$ids) {
        return false;
    }
    if (!function_exists('gcv_pix_read_reservation')) {
        require_once __DIR__ . '/pix_reservation_store.php';
    }
    foreach ($ids as $rid) {
        $res = gcv_pix_read_reservation((string)$rid);
        if (!is_array($res)) {
            continue;
        }
        foreach ((array)($res['trips'] ?? []) as $trip) {
            if (!is_array($trip) || !gcv_guiagem_trip_matches_tour($trip, $tour)) {
                continue;
            }
            if (gcv_guiagem_trip_other_language($trip)) {
                return true;
            }
        }
    }
    return false;
}

/** Acima de R$ 500 para o guia, ou cliente em outro idioma. */
function gcv_guiagem_qualifies_priority(array $tour): bool
{
    $id = (int)($tour['id'] ?? 0);
    if ($id <= 0) {
        return false;
    }
    if (gcv_guiagem_amount_cents($id) > gcv_guiagem_priority_min_cents()) {
        return true;
    }
    return gcv_guiagem_has_other_language($tour);
}

function gcv_guiagem_priority_holds_day(int $guideId, string $dateIso, int $exceptId): bool
{
    if ($guideId <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateIso)) {
        return false;
    }
    gcv_guiagem_ensure_schema();
    if (!gcv_guiagem_column_exists('kind')) {
        return false;
    }
    try {
        $st = db()->prepare(
            "SELECT o.id
             FROM gcv_guide_queue_offers o
             INNER JOIN gcv_excursions e ON e.id = o.excursion_id
             WHERE o.guide_user_id = ?
               AND o.status = 'pending'
               AND o.kind = 'priority'
               AND e.date_iso = ?
               AND e.id <> ?
               AND e.deleted_at IS NULL
             LIMIT 1"
        );
        $st->execute([$guideId, $dateIso, $exceptId]);
        return (bool)$st->fetchColumn();
    } catch (Throwable $e) {
        error_log('gcv_guiagem_priority_holds_day: ' . $e->getMessage());
        return false;
    }
}

/** Dia já tomado: saída dele, ou prioridade esperando aceite. */
function gcv_guiagem_day_busy(int $guideId, string $dateIso, int $exceptId): bool
{
    if ($guideId <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateIso)) {
        return false;
    }
    try {
        $st = db()->prepare(
            "SELECT id FROM gcv_excursions
             WHERE guide_user_id = ?
               AND date_iso = ?
               AND id <> ?
               AND deleted_at IS NULL
               AND status NOT IN ('cancelled', 'rejected')
             LIMIT 1"
        );
        $st->execute([$guideId, $dateIso, $exceptId]);
        if ($st->fetchColumn()) {
            return true;
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_day_busy: ' . $e->getMessage());
        return true;
    }
    return gcv_guiagem_priority_holds_day($guideId, $dateIso, $exceptId);
}

/**
 * Prazo exclusivo. 24 h, mas nunca depois da saída.
 * Com menos de 1 h até a saída, não segura a venda.
 *
 * @param array<string,mixed> $tour
 */
function gcv_guiagem_priority_expires_at(array $tour): ?string
{
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = new DateTimeImmutable('now', $tz);
    $expires = $now->modify('+' . gcv_guiagem_priority_hours() . ' hours');
    if (!function_exists('gcv_ops_starts_at')) {
        require_once __DIR__ . '/notify_ops.php';
    }
    $start = gcv_ops_starts_at($tour);
    if ($start instanceof DateTimeImmutable) {
        if ($start <= $now->modify('+1 hour')) {
            return null;
        }
        if ($start < $expires) {
            $expires = $start;
        }
    }
    return $expires->format('Y-m-d H:i:s');
}

function gcv_guiagem_priority_note(string $expiresAt): string
{
    $when = $expiresAt;
    try {
        $tz = new DateTimeZone('America/Sao_Paulo');
        $end = new DateTimeImmutable($expiresAt, $tz);
        $when = $end->format('d/m/Y') . ' às ' . $end->format('H:i');
    } catch (Throwable $e) {
        $when = $expiresAt;
    }
    return 'Esta guiagem foi priorizada para você: o valor do guia passa de R$ 500 ou o cliente pediu outro idioma. '
        . 'Aceite ou recuse na Agenda até ' . $when . '. '
        . 'Esse dia fica ocupado enquanto você decide. '
        . 'Se recusar ou o prazo acabar, a venda segue para a fila.';
}

/**
 * Oferece só ao Diego, por 24 h, e ocupa o dia na agenda.
 * Lista vazia: ele está ocupado, já respondeu, ou não dá tempo. Aí vale a fila normal.
 *
 * @param array<string,mixed> $tour
 * @return list<array<string,mixed>>
 */
function gcv_guiagem_offer_priority(array $tour, int $exceptId): array
{
    gcv_guiagem_ensure_schema();
    if (!gcv_guiagem_priority_enabled()) {
        return [];
    }
    $tourId = (int)($tour['id'] ?? 0);
    $diego = gcv_guiagem_priority_guide_id();
    if ($tourId <= 0 || $diego <= 0 || $diego === $exceptId) {
        return [];
    }
    if (!gcv_guiagem_qualifies_priority($tour)) {
        return [];
    }
    $skip = gcv_guiagem_skip_ids($tourId);
    if (isset($skip[$diego])) {
        return [];
    }
    $date = (string)($tour['date_iso'] ?? '');
    if (gcv_guiagem_day_busy($diego, $date, $tourId)) {
        return [];
    }
    $expires = gcv_guiagem_priority_expires_at($tour);
    if ($expires === null) {
        return [];
    }
    $pdo = db();
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $pdo->prepare('SELECT id FROM gcv_users WHERE id = ? FOR UPDATE')->execute([$diego]);
        if (gcv_guiagem_day_busy($diego, $date, $tourId) || gcv_guiagem_pending_guide_ids($tourId)) {
            if ($own && $pdo->inTransaction()) {
                $pdo->commit();
            }
            return [];
        }
        $pdo->prepare(
            "INSERT INTO gcv_guide_queue_offers (excursion_id, guide_user_id, status, kind, expires_at)
             VALUES (?, ?, 'pending', 'priority', ?)"
        )->execute([$tourId, $diego, $expires]);
        if ($own && $pdo->inTransaction()) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_guiagem_offer_priority: ' . $e->getMessage());
        return [];
    }
    return [['id' => $diego, 'priority' => true]];
}

/**
 * Prioridade do Diego, se couber. Senão, os 3 primeiros da fila.
 *
 * @param array<string,mixed> $tour
 * @return list<array<string,mixed>>
 */
function gcv_guiagem_open_next(array $tour, int $exceptId): array
{
    $tourId = (int)($tour['id'] ?? 0);
    if ($tourId <= 0 || (int)($tour['guide_user_id'] ?? 0) > 0) {
        return [];
    }
    if (gcv_guiagem_pending_guide_ids($tourId)) {
        return [];
    }
    $priority = gcv_guiagem_offer_priority($tour, $exceptId);
    if ($priority) {
        return $priority;
    }
    return gcv_guiagem_open_top($tour, $exceptId);
}

/**
 * Venda paga ou autorizada, ainda sem guia.
 * Só segura para o Diego quando a guiagem qualifica e o dia está livre.
 */
function gcv_guiagem_after_unassigned_sale(int $excursionId): void
{
    if ($excursionId <= 0) {
        return;
    }
    gcv_guiagem_expire_priority();
    $tour = gcv_substitution_load_excursion($excursionId);
    if (!$tour || (int)($tour['guide_user_id'] ?? 0) > 0) {
        return;
    }
    if (gcv_guiagem_pending_guide_ids($excursionId)) {
        return;
    }
    if (!gcv_guiagem_qualifies_priority($tour)) {
        return;
    }
    $picked = gcv_guiagem_open_next($tour, 0);
    if (!$picked) {
        return;
    }
    gcv_guiagem_notify_new_purchase($excursionId, array_map(static fn ($g) => (int)($g['id'] ?? 0), $picked));
}

/**
 * Encerra ofertas prioritárias pendentes e manda a saída para a fila normal.
 * $expiresBy null encerra todas. Com data, só as que já passaram do prazo.
 */
function gcv_guiagem_close_priority_offers(?string $expiresBy): int
{
    gcv_guiagem_ensure_schema();
    if (!gcv_guiagem_column_exists('expires_at') || !gcv_guiagem_column_exists('kind')) {
        return 0;
    }
    $where = "status = 'pending' AND kind = 'priority'";
    $params = [];
    if ($expiresBy !== null) {
        $where .= ' AND expires_at IS NOT NULL AND expires_at <= ?';
        $params[] = $expiresBy;
    }
    try {
        $st = db()->prepare(
            'SELECT DISTINCT excursion_id FROM gcv_guide_queue_offers WHERE ' . $where
        );
        $st->execute($params);
        $ids = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_close_priority_offers: ' . $e->getMessage());
        return 0;
    }
    $n = 0;
    foreach ($ids as $excursionId) {
        if ($excursionId <= 0) {
            continue;
        }
        try {
            $upd = db()->prepare(
                "UPDATE gcv_guide_queue_offers
                 SET status = 'expired', decided_at = NOW()
                 WHERE excursion_id = ? AND " . $where
            );
            $upd->execute(array_merge([$excursionId], $params));
        } catch (Throwable $e) {
            error_log('gcv_guiagem_close_priority_offers update: ' . $e->getMessage());
            continue;
        }
        $tour = gcv_substitution_load_excursion($excursionId);
        if (!$tour || (int)($tour['guide_user_id'] ?? 0) > 0 || gcv_guiagem_pending_guide_ids($excursionId)) {
            $n++;
            continue;
        }
        $picked = gcv_guiagem_open_top($tour, 0);
        if ($picked) {
            gcv_guiagem_notify_new_purchase($excursionId, array_map(static fn ($g) => (int)($g['id'] ?? 0), $picked));
        } elseif (gcv_guiagem_mark_cancelled($excursionId)) {
            gcv_guiagem_finish_no_guide($excursionId);
        }
        $n++;
    }
    return $n;
}

/** 24 h sem resposta: tira da agenda e abre a fila normal. */
function gcv_guiagem_expire_priority(?DateTimeImmutable $now = null): int
{
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = $now ? $now->setTimezone($tz) : new DateTimeImmutable('now', $tz);
    return gcv_guiagem_close_priority_offers($now->format('Y-m-d H:i:s'));
}

/** Admin desligou a regra: tira da agenda o que ainda espera aceite. */
function gcv_guiagem_drop_priority_holds(): int
{
    return gcv_guiagem_close_priority_offers(null);
}

/**
 * @param array<string,mixed> $tour
 * @return list<array<string,mixed>>
 */
function gcv_guiagem_open_top(array $tour, int $exceptId): array
{
    gcv_guiagem_ensure_schema();
    $tourId = (int)($tour['id'] ?? 0);
    if ($tourId <= 0) {
        return [];
    }
    $skip = gcv_guiagem_skip_ids($tourId);
    if ($exceptId > 0) {
        $skip[$exceptId] = true;
    }
    $picked = [];
    foreach (gcv_substitution_queue() as $g) {
        $id = (int)($g['id'] ?? 0);
        if ($id <= 0 || isset($skip[$id])) {
            continue;
        }
        if (gcv_substitution_busy($id, $tour)) {
            continue;
        }
        $picked[] = $g;
        if (count($picked) >= gcv_guiagem_top_count()) {
            break;
        }
    }
    if (!$picked) {
        return [];
    }
    $ins = db()->prepare(
        "INSERT INTO gcv_guide_queue_offers (excursion_id, guide_user_id, status) VALUES (?, ?, 'pending')"
    );
    foreach ($picked as $g) {
        $ins->execute([$tourId, (int)$g['id']]);
    }
    return $picked;
}

/**
 * @param array<string,mixed> $user
 * @return array<string,mixed>
 */
function gcv_guiagem_release(int $excursionId, array $user, bool $isAdmin = false): array
{
    gcv_guiagem_ensure_schema();
    gcv_substitution_ensure_schema();
    $me = (int)($user['id'] ?? 0);
    $tour = gcv_substitution_load_excursion($excursionId);
    if (!$tour) {
        return ['ok' => false, 'error' => 'Passeio não encontrado', 'status' => 404];
    }
    $owner = (int)($tour['guide_user_id'] ?? 0);
    if ($owner <= 0) {
        return ['ok' => false, 'error' => 'Esta guiagem já está sem guia', 'status' => 409];
    }
    if (!$isAdmin && $owner !== $me) {
        return ['ok' => false, 'error' => 'Este passeio não é seu', 'status' => 404];
    }
    $status = (string)($tour['status'] ?? '');
    if (!in_array($status, ['published', 'soldout'], true)) {
        return ['ok' => false, 'error' => 'Só dá para cancelar uma guiagem que está no ar', 'status' => 409];
    }
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    if ((string)($tour['date_iso'] ?? '') < $today) {
        return ['ok' => false, 'error' => 'Esta guiagem já passou', 'status' => 409];
    }

    $cancelNow = false;
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $lock = $pdo->prepare('SELECT guide_user_id FROM gcv_excursions WHERE id = ? FOR UPDATE');
        $lock->execute([$excursionId]);
        $lockedOwner = (int)($lock->fetchColumn() ?: 0);
        if ($lockedOwner !== $owner) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Esta guiagem já mudou de guia', 'status' => 409];
        }
        $pdo->prepare(
            'UPDATE gcv_excursions SET guide_user_id = NULL, updated_by = ? WHERE id = ? AND guide_user_id = ?'
        )->execute([$me > 0 ? $me : $owner, $excursionId, $owner]);
        $pdo->prepare(
            "UPDATE gcv_booking_trips
             SET guide_user_id = NULL, guide_confirmed_at = NULL, guide_confirmed_by = NULL,
                 decision = 'UNDECIDED', decided_at = NULL
             WHERE excursion_id = ? AND decision IN ('UNDECIDED','CONFIRMED')"
        )->execute([$excursionId]);
        $pdo->prepare(
            "UPDATE gcv_booking_trips SET guide_user_id = NULL WHERE excursion_id = ? AND decision = 'CAPTURED'"
        )->execute([$excursionId]);
        try {
            $pdo->prepare(
                "UPDATE gcv_sales
                 SET guide_user_id = NULL, guide_name = NULL, guide_cpf = NULL, guide_cnpj = NULL, updated_at = NOW()
                 WHERE excursion_id = ? AND guide_user_id = ? AND deleted_at IS NULL
                   AND payout_status <> 'PAYOUT_PAID'
                   AND sale_status IN ('PENDING','AUTHORIZED','PAID')"
            )->execute([$excursionId, $owner]);
        } catch (Throwable $e) {
            error_log('gcv_guiagem_release sales: ' . $e->getMessage());
        }
        $pdo->prepare(
            "UPDATE gcv_guide_substitutions
             SET status = 'cancelled', decided_at = NOW()
             WHERE excursion_id = ? AND status = 'pending'"
        )->execute([$excursionId]);
        $pdo->prepare('DELETE FROM gcv_guide_queue_offers WHERE excursion_id = ?')->execute([$excursionId]);
        $pdo->prepare(
            "INSERT INTO gcv_guide_queue_offers (excursion_id, guide_user_id, status) VALUES (?, ?, 'released')"
        )->execute([$excursionId, $owner]);
        $pdo->prepare(
            'DELETE FROM gcv_excursion_guide_seats WHERE excursion_id = ? AND guide_user_id = ?'
        )->execute([$excursionId, $owner]);
        $posicao = gcv_substitution_move_to_end($owner);
        $tour['guide_user_id'] = null;
        $picked = gcv_guiagem_open_next($tour, $owner);
        if (!$picked && count(gcv_guiagem_seat_ids($excursionId)) < 1) {
            $cancelNow = gcv_guiagem_mark_cancelled($excursionId);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $cancelNow = false;
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_guiagem_release: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível cancelar a guiagem', 'status' => 500];
    }

    $ids = array_map(static fn ($g) => (int)$g['id'], $picked);
    if ($cancelNow) {
        gcv_guiagem_finish_no_guide($excursionId);
        $message = 'Guiagem cancelada. Você foi para o fim da fila (' . $posicao . 'º). Não havia outro guia disponível, então o passeio foi cancelado.';
    } elseif ($ids) {
        gcv_guiagem_notify_new_purchase($excursionId, $ids);
        gcv_guiagem_notify_agency_released($tour, $owner, count($ids));
        $message = 'Guiagem cancelada. Você foi para o fim da fila (' . $posicao . 'º). Os guias do topo foram avisados e podem aceitar, como em uma compra nova. Os clientes só são avisados quando outro guia assumir.';
    } else {
        $message = 'Guiagem cancelada. Você foi para o fim da fila (' . $posicao . 'º). A vaga segue aberta até 24 horas antes do passeio.';
    }
    return ['ok' => true, 'message' => $message, 'offered' => count($ids), 'posicao' => $posicao, 'tour_cancelled' => $cancelNow];
}

/**
 * @param array<string,mixed> $user
 * @return array<string,mixed>
 */
function gcv_guiagem_accept(int $excursionId, array $user): array
{
    gcv_guiagem_ensure_schema();
    $me = (int)($user['id'] ?? 0);
    if ($me <= 0 || !gcv_guiagem_pending_for($excursionId, $me)) {
        return ['ok' => false, 'error' => 'Esta vaga não está aguardando você', 'status' => 404];
    }
    $tour = gcv_substitution_load_excursion($excursionId);
    if (!$tour) {
        return ['ok' => false, 'error' => 'Passeio não encontrado', 'status' => 404];
    }
    if (!in_array((string)($tour['status'] ?? ''), ['published', 'soldout'], true)) {
        return ['ok' => false, 'error' => 'Este passeio não está aberto para guiagem', 'status' => 409];
    }
    if (gcv_guiagem_day_busy($me, (string)($tour['date_iso'] ?? ''), $excursionId) || gcv_substitution_busy($me, $tour)) {
        return ['ok' => false, 'error' => 'Você já tem uma saída neste dia', 'status' => 409];
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $offer = $pdo->prepare(
            "SELECT id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND guide_user_id = ? AND status = 'pending'
             LIMIT 1 FOR UPDATE"
        );
        $offer->execute([$excursionId, $me]);
        $offerId = (int)($offer->fetchColumn() ?: 0);
        if ($offerId <= 0) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Esta vaga não está aguardando você', 'status' => 404];
        }
        $needed = gcv_guiagem_guides_needed($tour);
        $lockTour = $pdo->prepare('SELECT guide_user_id FROM gcv_excursions WHERE id = ? FOR UPDATE');
        $lockTour->execute([$excursionId]);
        $ownerNow = (int)($lockTour->fetchColumn() ?: 0);
        $seatSt = $pdo->prepare('SELECT guide_user_id FROM gcv_excursion_guide_seats WHERE excursion_id = ? FOR UPDATE');
        $seatSt->execute([$excursionId]);
        $seated = array_map('intval', $seatSt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        if ($ownerNow > 0 && !in_array($ownerNow, $seated, true)) {
            require_once __DIR__ . '/excursion_status.php';
            if (gcv_excursion_is_guide_submitted($tour)) {
                $seated[] = $ownerNow;
            }
        }
        if (in_array($me, $seated, true) || count($seated) >= $needed) {
            $pdo->prepare(
                "UPDATE gcv_guide_queue_offers SET status = 'declined', decided_at = NOW() WHERE id = ?"
            )->execute([$offerId]);
            $pdo->commit();
            return ['ok' => false, 'error' => 'Outro guia aceitou esta vaga antes', 'status' => 409];
        }
        $pdo->prepare(
            'INSERT INTO gcv_excursion_guide_seats (excursion_id, guide_user_id) VALUES (?, ?)'
        )->execute([$excursionId, $me]);
        if ($ownerNow <= 0) {
            $pdo->prepare(
                "UPDATE gcv_excursions SET guide_user_id = ?, updated_by = ?
                 WHERE id = ? AND (guide_user_id IS NULL OR guide_user_id = 0)
                   AND status IN ('published','soldout')"
            )->execute([$me, $me, $excursionId]);
        }
        $othersSt = $pdo->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND status = 'pending' AND guide_user_id <> ?"
        );
        $othersSt->execute([$excursionId, $me]);
        $others = array_map('intval', $othersSt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        if ($ownerNow <= 0) {
            $pdo->prepare(
                "UPDATE gcv_booking_trips SET guide_user_id = ?
                 WHERE excursion_id = ? AND decision IN ('UNDECIDED','CONFIRMED','CAPTURED')
                   AND (guide_user_id IS NULL OR guide_user_id = 0)"
            )->execute([$me, $excursionId]);
        }
        $pdo->prepare(
            "UPDATE gcv_guide_queue_offers SET status = 'accepted', decided_at = NOW() WHERE id = ?"
        )->execute([$offerId]);
        $pdo->prepare(
            "UPDATE gcv_guide_queue_offers SET status = 'declined', decided_at = NOW()
             WHERE excursion_id = ? AND status = 'pending'"
        )->execute([$excursionId]);
        $posicao = gcv_substitution_move_to_end($me);
        if ($ownerNow <= 0) {
            $tour['guide_user_id'] = $me;
        }
        try {
            if ($ownerNow <= 0) {
                require_once __DIR__ . '/marketplace/sale_service.php';
                $guide = gcv_sale_resolve_guide($tour);
                $name = trim((string)($guide['name'] ?? ''));
                $pdo->prepare(
                    "UPDATE gcv_sales
                     SET guide_user_id = ?, guide_name = ?, guide_cpf = ?, guide_cnpj = ?, updated_at = NOW()
                     WHERE excursion_id = ? AND deleted_at IS NULL
                       AND payout_status <> 'PAYOUT_PAID'
                       AND sale_status IN ('PENDING','AUTHORIZED','PAID')
                       AND (guide_user_id IS NULL OR guide_user_id = 0)"
                )->execute([
                    $me,
                    $name !== '' ? $name : null,
                    ($guide['cpf'] ?? '') !== '' ? $guide['cpf'] : null,
                    ($guide['cnpj'] ?? '') !== '' ? $guide['cnpj'] : null,
                    $excursionId,
                ]);
            }
        } catch (Throwable $e) {
            error_log('gcv_guiagem_accept sales: ' . $e->getMessage());
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_guiagem_accept: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível aceitar a guiagem', 'status' => 500];
    }

    $fresh = gcv_substitution_load_excursion($excursionId) ?: $tour;
    $still = max(0, gcv_guiagem_guides_needed($fresh) - count(gcv_guiagem_filled_ids($fresh)));
    gcv_guiagem_notify_seat_accepted($me, $fresh, $still);
    if ($still > 0) {
        gcv_guiagem_ensure_invites($fresh);
    } else {
        try {
            require_once __DIR__ . '/payments/authorization.php';
            $trips = db()->prepare(
                "SELECT id FROM gcv_booking_trips WHERE excursion_id = ? AND decision IN ('UNDECIDED','CONFIRMED')"
            );
            $trips->execute([$excursionId]);
            foreach ($trips->fetchAll(PDO::FETCH_COLUMN) ?: [] as $tripId) {
                gcv_auth_guide_confirm((int)$tripId, $user, true);
            }
        } catch (Throwable $e) {
            error_log('gcv_guiagem_accept confirm: ' . $e->getMessage());
        }
    }

    gcv_guiagem_notify_taken($excursionId, $others);
    gcv_guiagem_notify_clients_swapped($excursionId);

    $title = (string)($tour['attraction_title'] ?? 'o passeio');
    return [
        'ok' => true,
        'result' => 'accepted',
        'posicao' => $posicao,
        'message' => 'Você assumiu ' . $title . ' e foi para o fim da fila (' . $posicao . 'º).',
    ];
}

/** @return array<string,mixed> */
function gcv_guiagem_decline(int $excursionId, int $guideId): array
{
    gcv_guiagem_ensure_schema();
    if (!gcv_guiagem_pending_for($excursionId, $guideId)) {
        return ['ok' => false, 'error' => 'Esta vaga não está aguardando você', 'status' => 404];
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            "UPDATE gcv_guide_queue_offers
             SET status = 'declined', decided_at = NOW()
             WHERE excursion_id = ? AND guide_user_id = ? AND status = 'pending'"
        )->execute([$excursionId, $guideId]);
        $left = $pdo->prepare(
            "SELECT COUNT(*) FROM gcv_guide_queue_offers WHERE excursion_id = ? AND status = 'pending'"
        );
        $left->execute([$excursionId]);
        $pending = (int)$left->fetchColumn();
        $picked = [];
        $cancelNow = false;
        if ($pending < 1) {
            $tour = gcv_substitution_load_excursion($excursionId);
            if ($tour && !gcv_guiagem_staffing_ready($tour)) {
                $picked = gcv_guiagem_open_top($tour, $guideId);
                if (!$picked && count(gcv_guiagem_filled_ids($tour)) < 1) {
                    $cancelNow = gcv_guiagem_mark_cancelled($excursionId);
                }
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $cancelNow = false;
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_guiagem_decline: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível recusar', 'status' => 500];
    }

    if ($cancelNow) {
        gcv_guiagem_finish_no_guide($excursionId);
    } elseif ($picked) {
        gcv_guiagem_notify_new_purchase($excursionId, array_map(static fn ($g) => (int)$g['id'], $picked));
    }
    return [
        'ok' => true,
        'result' => 'declined',
        'message' => 'Você recusou esta guiagem. Sua posição na fila não mudou.',
    ];
}

/**
 * @param list<array<string,mixed>> $rows
 * @return list<array<string,mixed>>
 */
function gcv_guiagem_attach(array $rows, int $userId): array
{
    if ($userId <= 0) {
        return $rows;
    }
    gcv_guiagem_ensure_schema();
    $have = [];
    foreach ($rows as $row) {
        $have[(int)($row['id'] ?? 0)] = true;
    }
    try {
        $st = db()->prepare(
            "SELECT excursion_id, kind, expires_at FROM gcv_guide_queue_offers
             WHERE guide_user_id = ? AND status = 'pending'
             ORDER BY id ASC"
        );
        $st->execute([$userId]);
        $offers = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return $rows;
    }
    if (!$offers) {
        return $rows;
    }
    require_once __DIR__ . '/guide_agenda.php';
    $incoming = [];
    foreach ($offers as $offer) {
        $id = (int)($offer['excursion_id'] ?? 0);
        if ($id <= 0 || isset($have[$id])) {
            continue;
        }
        $tour = gcv_substitution_load_excursion($id);
        if (!$tour || !function_exists('gcv_map_excursion_row')) {
            continue;
        }
        if ((int)($tour['guide_user_id'] ?? 0) > 0) {
            continue;
        }
        $mapped = gcv_map_excursion_row($tour);
        $mapped['clients'] = [];
        $mapped['clients_count'] = 0;
        $mapped['awaiting_guide'] = true;
        $mapped['guide_launched'] = false;
        $mapped['can_substitute'] = false;
        $mapped['can_cancel'] = false;
        $mapped['queue_offer'] = true;
        $priority = (string)($offer['kind'] ?? '') === 'priority' && !empty($offer['expires_at']);
        $mapped['priority_offer'] = $priority;
        if ($priority) {
            try {
                $mapped['confirm_deadline'] = (new DateTimeImmutable(
                    (string)$offer['expires_at'],
                    new DateTimeZone('America/Sao_Paulo')
                ))->format('c');
            } catch (Throwable $e) {
                $mapped['confirm_deadline'] = gcv_guide_confirm_deadline($mapped);
            }
            $mapped['decision_hours'] = gcv_guiagem_priority_hours();
        } else {
            $mapped['confirm_deadline'] = gcv_guide_confirm_deadline($mapped);
            $mapped['decision_hours'] = gcv_guide_decision_hours();
        }
        $incoming[] = $mapped;
        $have[$id] = true;
    }
    return array_merge($incoming, $rows);
}

/** @param list<int> $guideIds */
function gcv_guiagem_notify_new_purchase(int $excursionId, array $guideIds): void
{
    $guideIds = array_values(array_filter(array_map('intval', $guideIds), static fn ($id) => $id > 0));
    if ($excursionId <= 0 || !$guideIds) {
        return;
    }
    try {
        require_once __DIR__ . '/notify_ops.php';
        $exc = gcv_ops_load_excursion($excursionId);
        if (!$exc) {
            return;
        }
        $st = db()->prepare(
            "SELECT * FROM gcv_sales
             WHERE excursion_id = ? AND deleted_at IS NULL
               AND sale_status IN ('PAID','AUTHORIZED','PENDING')
             ORDER BY id ASC"
        );
        $st->execute([$excursionId]);
        $sales = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (!$sales) {
            $sales = [[
                'id' => 0,
                'excursion_id' => $excursionId,
                'excursion_title' => gcv_ops_excursion_title($exc),
                'tourist_name' => '',
                'tourist_email' => '',
                'tourist_phone' => '',
                'spots' => max(1, (int)($exc['booked_people'] ?? 1)),
                'sold_price_cents' => 0,
                'reservation_id' => '',
            ]];
        }
        foreach ($guideIds as $gid) {
            $excCopy = $exc;
            $excCopy['guide_user_id'] = $gid;
            $note = '';
            try {
                $kind = db()->prepare(
                    "SELECT expires_at FROM gcv_guide_queue_offers
                     WHERE excursion_id = ? AND guide_user_id = ? AND status = 'pending' AND kind = 'priority'
                     LIMIT 1"
                );
                $kind->execute([$excursionId, $gid]);
                $exp = $kind->fetchColumn();
                if (is_string($exp) && $exp !== '') {
                    $note = gcv_guiagem_priority_note($exp);
                }
            } catch (Throwable $e) {
                $note = '';
            }
            $first = true;
            $token = gcv_guiagem_ensure_offer_token($excursionId, $gid);
            $linkNote = $token !== '' ? ("Clique aqui para confirmar:\n" . gcv_guiagem_offer_url($token)) : '';
            $guideNote = trim($note . ($linkNote !== '' ? "\n\n" . $linkNote : ''));
            foreach ($sales as $sale) {
                $copy = $sale;
                $copy['guide_user_id'] = $gid;
                gcv_ops_notify_guide_new_booking(
                    $copy,
                    $excCopy,
                    max(1, (int)($copy['spots'] ?? 1)),
                    false,
                    $first ? $guideNote : ''
                );
                $first = false;
            }
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_new_purchase: ' . $e->getMessage());
    }
}

function gcv_guiagem_notify_agency_exhausted(int $excursionId): void
{
    try {
        require_once __DIR__ . '/notify_ops.php';
        $exc = gcv_ops_load_excursion($excursionId);
        if (!$exc) {
            return;
        }
        $title = gcv_ops_excursion_title($exc);
        $when = trim(gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
        gcv_ops_wa_agency(
            "Nenhum guia aceitou a guiagem.\n\n"
            . 'Passeio: ' . $title . "\n"
            . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
            . 'A vaga continua aberta até o prazo de confirmação.'
        );
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_agency_exhausted: ' . $e->getMessage());
    }
}

function gcv_guiagem_notify_agency_released(array $tour, int $guideId, int $offered): void
{
    try {
        require_once __DIR__ . '/notify_ops.php';
        $guide = gcv_ops_guide_contact($guideId);
        $title = trim((string)($tour['attraction_title'] ?? ''));
        if ($title === '') {
            $title = 'Passeio';
        }
        $when = trim(gcv_ops_date_br((string)($tour['date_iso'] ?? '')) . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5));
        $text = 'O guia ' . (string)($guide['name'] ?? 'Guia') . " cancelou a guiagem.\n\n"
            . 'Passeio: ' . $title . "\n"
            . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
            . 'A vaga foi oferecida a ' . $offered . ' guia(s) do topo da fila, como uma compra nova.';
        gcv_ops_wa_agency($text);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_agency_released: ' . $e->getMessage());
    }
}

/** @param list<int> $guideIds */
function gcv_guiagem_notify_taken(int $excursionId, array $guideIds): void
{
    $guideIds = array_values(array_filter(array_map('intval', $guideIds), static fn ($id) => $id > 0));
    if (!$guideIds) {
        return;
    }
    try {
        require_once __DIR__ . '/notify_ops.php';
        $exc = gcv_ops_load_excursion($excursionId);
        if (!$exc) {
            return;
        }
        foreach ($guideIds as $gid) {
            gcv_ops_notify_guide_opportunity_taken($gid, $exc);
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_taken: ' . $e->getMessage());
    }
}

/** Avisa os clientes só depois que o guia novo já está na saída. */
function gcv_guiagem_notify_clients_swapped(int $excursionId, int $previousGuideId = 0): void
{
    try {
        require_once __DIR__ . '/notify_ops.php';
        $exc = gcv_ops_load_excursion($excursionId);
        if (!$exc || (int)($exc['guide_user_id'] ?? 0) <= 0) {
            return;
        }
        if ($previousGuideId <= 0) {
            gcv_guiagem_ensure_schema();
            $prev = db()->prepare(
                "SELECT guide_user_id FROM gcv_guide_queue_offers
                 WHERE excursion_id = ? AND status = 'released'
                 ORDER BY id DESC LIMIT 1"
            );
            $prev->execute([$excursionId]);
            $previousGuideId = (int)($prev->fetchColumn() ?: 0);
        }
        $st = db()->prepare(
            "SELECT * FROM gcv_sales
             WHERE excursion_id = ? AND deleted_at IS NULL
               AND sale_status IN ('PAID','AUTHORIZED','PENDING')"
        );
        $st->execute([$excursionId]);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $sale) {
            gcv_ops_notify_client_guide_changed($sale, $exc);
        }
        if ($previousGuideId > 0) {
            gcv_ops_notify_outgoing_guide_replaced($previousGuideId, $exc);
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_clients_swapped: ' . $e->getMessage());
    }
}

function gcv_guiagem_mark_cancelled(int $excursionId): bool
{
    if ($excursionId <= 0) {
        return false;
    }
    try {
        $st = db()->prepare(
            "UPDATE gcv_excursions
             SET status = 'cancelled'
             WHERE id = ?
               AND deleted_at IS NULL
               AND status IN ('published','soldout')
               AND (guide_user_id IS NULL OR guide_user_id = 0)"
        );
        $st->execute([$excursionId]);
        return $st->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('gcv_guiagem_mark_cancelled: ' . $e->getMessage());
        return false;
    }
}

/**
 * Passeio sem guia: estorna o que foi pago, libera cartão ainda não cobrado
 * e avisa cliente e guias. O motivo para o cliente é a falta de guia.
 */
function gcv_guiagem_finish_no_guide(int $excursionId): void
{
    try {
        require_once __DIR__ . '/notify_ops.php';
        require_once __DIR__ . '/payments/pix_refund.php';
        require_once __DIR__ . '/payments/authorization.php';
        $exc = gcv_ops_load_excursion($excursionId);
        if (!$exc || (string)($exc['status'] ?? '') !== 'cancelled') {
            return;
        }
        if ((int)($exc['guide_user_id'] ?? 0) > 0) {
            return;
        }
        gcv_guiagem_ensure_schema();
        $offerSt = db()->prepare('SELECT guide_user_id, status FROM gcv_guide_queue_offers WHERE excursion_id = ?');
        $offerSt->execute([$excursionId]);
        $guideIds = [];
        foreach ($offerSt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $guideIds[] = (int)($row['guide_user_id'] ?? 0);
        }
        db()->prepare(
            "UPDATE gcv_guide_queue_offers
             SET status = 'declined', decided_at = NOW()
             WHERE excursion_id = ? AND status = 'pending'"
        )->execute([$excursionId]);

        $salesSt = db()->prepare(
            "SELECT * FROM gcv_sales
             WHERE excursion_id = ? AND deleted_at IS NULL
               AND sale_status IN ('PAID','AUTHORIZED','PENDING')"
        );
        $salesSt->execute([$excursionId]);
        $sales = $salesSt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $notes = [];
        foreach ($sales as $sale) {
            try {
                $money = gcv_guiagem_settle_sale($excursionId, $sale);
            } catch (Throwable $e) {
                error_log('gcv_guiagem_finish_no_guide sale: ' . $e->getMessage());
                $money = 'refund_pending';
            }
            gcv_ops_notify_client_no_guide($sale, $exc, $money);
            $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
            $labels = [
                'pix_refunded' => 'Pix estornado',
                'pix_pending' => 'estorno do Pix em andamento',
                'card_clear' => 'cartão liberado, nada cobrado',
                'card_refunded' => 'cartão estornado',
                'card_pending' => 'estorno do cartão em andamento',
                'refund_pending' => 'estorno em andamento',
                'none' => 'nada cobrado',
            ];
            $notes[] = ($code !== '' ? $code : ('venda ' . (int)($sale['id'] ?? 0))) . ': ' . ($labels[$money] ?? $money);
        }
        try {
            db()->prepare(
                "UPDATE gcv_booking_trips
                 SET decision = 'CANCELLED', decided_at = NOW()
                 WHERE excursion_id = ? AND decision NOT IN ('CANCELLED','RELEASED')"
            )->execute([$excursionId]);
        } catch (Throwable $e) {
            error_log('gcv_guiagem_finish_no_guide trips: ' . $e->getMessage());
        }
        gcv_ops_notify_guides_no_guide($exc, $guideIds);
        $title = gcv_ops_excursion_title($exc);
        $when = trim(gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
        $agency = "Passeio cancelado porque não há guias disponíveis.\n\n"
            . 'Passeio: ' . $title . "\n"
            . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
            . 'Clientes avisados: ' . count($sales) . "\n"
            . ($notes ? implode("\n", $notes) : 'Sem reservas abertas.');
        gcv_ops_wa_agency($agency);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_finish_no_guide: ' . $e->getMessage());
    }
}

/** @param array<string,mixed> $sale */
function gcv_guiagem_settle_sale(int $excursionId, array $sale): string
{
    $saleId = (int)($sale['id'] ?? 0);
    $rid = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $status = strtoupper((string)($sale['sale_status'] ?? ''));
    $rec = null;
    if ($rid !== '' && function_exists('gcv_pix_read_reservation')) {
        $rec = gcv_pix_read_reservation($rid);
    }
    $rows = [];
    if ($rid !== '' && function_exists('gcv_auth_trip_rows')) {
        try {
            $rows = gcv_auth_trip_rows($rid);
        } catch (Throwable $e) {
            $rows = [];
        }
    }
    $indexes = [];
    $others = 0;
    $kind = '';
    foreach ($rows as $row) {
        $dec = strtoupper((string)($row['decision'] ?? ''));
        $same = (int)($row['excursion_id'] ?? 0) === $excursionId;
        if ($same) {
            $indexes[] = (int)($row['trip_index'] ?? 0);
            if ($kind === '') {
                $kind = strtolower((string)($row['payment_kind'] ?? ''));
            }
        } elseif (!in_array($dec, ['CANCELLED', 'RELEASED'], true)) {
            $others++;
        }
    }
    $gw = '';
    if (is_array($rec)) {
        $cardGw = is_array($rec['card_auth'] ?? null) ? (string)($rec['card_auth']['gateway'] ?? '') : '';
        $gw = strtolower((string)($rec['gateway'] ?? $cardGw));
    }
    if ($kind === '' && in_array($gw, ['stripe', 'mercadopago'], true)) {
        $kind = 'card';
    }
    if ($kind === '') {
        $kind = 'pix';
    }

    if ($status === 'PAID' && $kind === 'pix' && $rid !== '') {
        $trips = is_array($rec) && is_array($rec['trips'] ?? null) ? $rec['trips'] : [];
        $tripCount = count(array_filter($trips, 'is_array'));
        if (!$indexes && $tripCount > 1) {
            if ($others === 0) {
                gcv_guiagem_block_guide_pay($saleId, true);
            }
            return 'pix_pending';
        }
        try {
            $result = gcv_pix_refund_reservation(
                $rid,
                (string)($sale['tourist_email'] ?? ''),
                $indexes ?: null,
                false,
                false,
                true
            );
            $cents = (int)($result['refunded_cents'] ?? 0);
            if ($cents > 0 || (!empty($result['already']) && !empty($result['full']))) {
                return 'pix_refunded';
            }
        } catch (Throwable $e) {
            error_log('gcv_guiagem_settle_sale pix ' . $rid . ': ' . $e->getMessage());
        }
        if ($others === 0) {
            gcv_guiagem_block_guide_pay($saleId, true);
        }
        return 'pix_pending';
    }

    if ($kind === 'card' && is_array($rec)) {
        $authId = trim((string)($rec['card_auth']['id'] ?? ''));
        if ($status === 'PAID') {
            if ($others > 0 || $authId === '') {
                if ($others === 0) {
                    gcv_guiagem_block_guide_pay($saleId, true);
                }
                return 'card_pending';
            }
            $ok = false;
            if ($gw === 'stripe') {
                require_once __DIR__ . '/payments/stripe_auth.php';
                $ok = gcv_stripe_auth_refund($authId);
            } elseif ($gw === 'mercadopago' || $gw === '') {
                require_once __DIR__ . '/payments/mercadopago_api.php';
                $ok = gcv_mp_refund($authId);
            }
            if ($ok) {
                gcv_guiagem_mark_sale_refunded($saleId);
                return 'card_refunded';
            }
            gcv_guiagem_block_guide_pay($saleId, true);
            return 'card_pending';
        }
        if ($others === 0) {
            gcv_auth_release($rec, 'no_guides', false);
            return 'card_clear';
        }
        return 'card_pending';
    }

    if (in_array($status, ['PENDING', 'AUTHORIZED'], true) && $others === 0) {
        gcv_guiagem_mark_sale_refunded($saleId, 'CANCELLED');
        return 'none';
    }
    if ($others === 0) {
        gcv_guiagem_block_guide_pay($saleId, true);
    }
    return 'none';
}

function gcv_guiagem_block_guide_pay(int $saleId, bool $zeroPlatform): void
{
    if ($saleId <= 0) {
        return;
    }
    try {
        if ($zeroPlatform) {
            db()->prepare(
                "UPDATE gcv_sales
                 SET payout_status = 'PAYOUT_BLOCKED', guide_amount_cents = 0,
                     platform_revenue_cents = 0, updated_at = NOW()
                 WHERE id = ? AND payout_status <> 'PAYOUT_PAID'"
            )->execute([$saleId]);
            return;
        }
        db()->prepare(
            "UPDATE gcv_sales
             SET payout_status = 'PAYOUT_BLOCKED', guide_amount_cents = 0, updated_at = NOW()
             WHERE id = ? AND payout_status <> 'PAYOUT_PAID'"
        )->execute([$saleId]);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_block_guide_pay: ' . $e->getMessage());
    }
}

function gcv_guiagem_mark_sale_refunded(int $saleId, string $status = 'REFUNDED'): void
{
    if ($saleId <= 0) {
        return;
    }
    if (!in_array($status, ['REFUNDED', 'CANCELLED'], true)) {
        $status = 'REFUNDED';
    }
    try {
        db()->prepare(
            "UPDATE gcv_sales
             SET sale_status = ?, payout_status = 'PAYOUT_BLOCKED',
                 guide_amount_cents = 0, platform_revenue_cents = 0, updated_at = NOW()
             WHERE id = ? AND payout_status <> 'PAYOUT_PAID'
               AND sale_status IN ('PENDING','AUTHORIZED','PAID')"
        )->execute([$status, $saleId]);
    } catch (Throwable $e) {
        error_log('gcv_guiagem_mark_sale_refunded: ' . $e->getMessage());
    }
}

/** Faltando 2 horas, sem substituto, o passeio cai. Não mexe em saída que nunca teve guia. */
function gcv_guiagem_scan_no_substitute(DateTimeImmutable $now): int
{
    gcv_guiagem_ensure_schema();
    try {
        $st = db()->query(
            "SELECT DISTINCT e.id
             FROM gcv_excursions e
             INNER JOIN gcv_guide_queue_offers o ON o.excursion_id = e.id AND o.status = 'released'
             WHERE e.deleted_at IS NULL
               AND e.status IN ('published','soldout')
               AND (e.guide_user_id IS NULL OR e.guide_user_id = 0)"
        );
        $ids = $st ? array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []) : [];
    } catch (Throwable $e) {
        error_log('gcv_guiagem_scan_no_substitute: ' . $e->getMessage());
        return 0;
    }
    require_once __DIR__ . '/notify_ops.php';
    $n = 0;
    foreach ($ids as $id) {
        if ($id <= 0) {
            continue;
        }
        $exc = gcv_ops_load_excursion($id);
        if (!$exc) {
            continue;
        }
        $start = gcv_ops_starts_at($exc);
        if (!$start) {
            continue;
        }
        $hours = ($start->getTimestamp() - $now->getTimestamp()) / 3600;
        if ($hours > 2 || $hours < -6) {
            continue;
        }
        if (!gcv_guiagem_mark_cancelled($id)) {
            continue;
        }
        gcv_guiagem_finish_no_guide($id);
        $n++;
    }
    return $n;
}
