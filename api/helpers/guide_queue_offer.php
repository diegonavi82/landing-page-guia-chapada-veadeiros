<?php
declare(strict_types=1);

/**
 * O guia cancela a própria guiagem sem cancelar o passeio dos clientes.
 * A vaga volta para os 3 primeiros da fila, com o mesmo aceite e os mesmos
 * avisos de uma compra nova. Quem aceita vai para o fim da fila.
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
}

function gcv_guiagem_top_count(): int
{
    return 3;
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
             WHERE excursion_id = ? AND status IN ('declined','released','accepted')"
        );
        $st->execute([$excursionId]);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) ?: [] as $id) {
            $skip[(int)$id] = true;
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_skip_ids: ' . $e->getMessage());
    }
    return $skip;
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
        $posicao = gcv_substitution_move_to_end($owner);
        $tour['guide_user_id'] = null;
        $picked = gcv_guiagem_open_top($tour, $owner);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_guiagem_release: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível cancelar a guiagem', 'status' => 500];
    }

    $ids = array_map(static fn ($g) => (int)$g['id'], $picked);
    gcv_guiagem_notify_new_purchase($excursionId, $ids);
    gcv_guiagem_notify_agency_released($tour, $owner, count($ids));

    if (!$ids) {
        $message = 'Guiagem cancelada. Você foi para o fim da fila (' . $posicao . 'º). Nenhum guia livre no topo para receber esta vaga agora.';
    } else {
        $message = 'Guiagem cancelada. Você foi para o fim da fila (' . $posicao . 'º). Os guias do topo foram avisados e podem aceitar, como em uma compra nova.';
    }
    return ['ok' => true, 'message' => $message, 'offered' => count($ids), 'posicao' => $posicao];
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
    if (gcv_substitution_busy($me, $tour)) {
        return ['ok' => false, 'error' => 'Você já tem uma saída neste horário', 'status' => 409];
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
        $taken = $pdo->prepare(
            'UPDATE gcv_excursions SET guide_user_id = ?, updated_by = ? WHERE id = ? AND (guide_user_id IS NULL OR guide_user_id = 0)'
        );
        $taken->execute([$me, $me, $excursionId]);
        if ($taken->rowCount() < 1) {
            $pdo->prepare(
                "UPDATE gcv_guide_queue_offers SET status = 'declined', decided_at = NOW() WHERE id = ?"
            )->execute([$offerId]);
            $pdo->commit();
            return ['ok' => false, 'error' => 'Outro guia aceitou esta vaga antes', 'status' => 409];
        }
        $othersSt = $pdo->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND status = 'pending' AND guide_user_id <> ?"
        );
        $othersSt->execute([$excursionId, $me]);
        $others = array_map('intval', $othersSt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $pdo->prepare(
            "UPDATE gcv_booking_trips SET guide_user_id = ?
             WHERE excursion_id = ? AND decision IN ('UNDECIDED','CONFIRMED','CAPTURED')"
        )->execute([$me, $excursionId]);
        $pdo->prepare(
            "UPDATE gcv_guide_queue_offers SET status = 'accepted', decided_at = NOW() WHERE id = ?"
        )->execute([$offerId]);
        $pdo->prepare(
            "UPDATE gcv_guide_queue_offers SET status = 'declined', decided_at = NOW()
             WHERE excursion_id = ? AND status = 'pending'"
        )->execute([$excursionId]);
        $posicao = gcv_substitution_move_to_end($me);
        $tour['guide_user_id'] = $me;
        try {
            require_once __DIR__ . '/marketplace/sale_service.php';
            $guide = gcv_sale_resolve_guide($tour);
            $name = trim((string)($guide['name'] ?? ''));
            $pdo->prepare(
                "UPDATE gcv_sales
                 SET guide_user_id = ?, guide_name = ?, guide_cpf = ?, guide_cnpj = ?, updated_at = NOW()
                 WHERE excursion_id = ? AND deleted_at IS NULL
                   AND payout_status <> 'PAYOUT_PAID'
                   AND sale_status IN ('PENDING','AUTHORIZED','PAID')"
            )->execute([
                $me,
                $name !== '' ? $name : null,
                ($guide['cpf'] ?? '') !== '' ? $guide['cpf'] : null,
                ($guide['cnpj'] ?? '') !== '' ? $guide['cnpj'] : null,
                $excursionId,
            ]);
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

    try {
        require_once __DIR__ . '/payments/authorization.php';
        $trips = db()->prepare(
            "SELECT id FROM gcv_booking_trips WHERE excursion_id = ? AND decision IN ('UNDECIDED','CONFIRMED')"
        );
        $trips->execute([$excursionId]);
        foreach ($trips->fetchAll(PDO::FETCH_COLUMN) ?: [] as $tripId) {
            gcv_auth_guide_confirm((int)$tripId, $user, false);
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_accept confirm: ' . $e->getMessage());
    }

    gcv_guiagem_notify_taken($excursionId, $others);
    gcv_guiagem_notify_clients_if_introduced($excursionId);

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
        $exhausted = false;
        if ($pending < 1) {
            $tour = gcv_substitution_load_excursion($excursionId);
            if ($tour && (int)($tour['guide_user_id'] ?? 0) <= 0) {
                $picked = gcv_guiagem_open_top($tour, $guideId);
                $exhausted = !$picked;
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_guiagem_decline: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível recusar', 'status' => 500];
    }

    if ($picked) {
        gcv_guiagem_notify_new_purchase($excursionId, array_map(static fn ($g) => (int)$g['id'], $picked));
    } elseif (!empty($exhausted)) {
        gcv_guiagem_notify_agency_exhausted($excursionId);
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
            "SELECT excursion_id FROM gcv_guide_queue_offers
             WHERE guide_user_id = ? AND status = 'pending'
             ORDER BY id ASC"
        );
        $st->execute([$userId]);
        $ids = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
    } catch (Throwable $e) {
        return $rows;
    }
    if (!$ids) {
        return $rows;
    }
    require_once __DIR__ . '/guide_agenda.php';
    $incoming = [];
    foreach ($ids as $id) {
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
        $mapped['confirm_deadline'] = gcv_guide_confirm_deadline($mapped);
        $mapped['decision_hours'] = gcv_guide_decision_hours();
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
            foreach ($sales as $sale) {
                $copy = $sale;
                $copy['guide_user_id'] = $gid;
                gcv_ops_notify_guide_new_booking($copy, $excCopy, max(1, (int)($copy['spots'] ?? 1)), false);
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

function gcv_guiagem_notify_clients_if_introduced(int $excursionId): void
{
    try {
        require_once __DIR__ . '/notify_ops.php';
        $exc = gcv_ops_load_excursion($excursionId);
        if (!$exc || (int)($exc['guide_user_id'] ?? 0) <= 0) {
            return;
        }
        $st = db()->prepare(
            "SELECT * FROM gcv_sales
             WHERE excursion_id = ? AND deleted_at IS NULL
               AND sale_status IN ('PAID','AUTHORIZED')"
        );
        $st->execute([$excursionId]);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $sale) {
            if (empty($sale['notify_guide_intro_sent_at'])) {
                continue;
            }
            gcv_ops_notify_client_guide_changed($sale, $exc);
        }
    } catch (Throwable $e) {
        error_log('gcv_guiagem_notify_clients_if_introduced: ' . $e->getMessage());
    }
}
