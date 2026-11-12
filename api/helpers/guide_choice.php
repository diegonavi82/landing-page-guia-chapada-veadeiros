<?php
declare(strict_types=1);

/**
 * Privativo: o cliente escolhe o guia.
 * Uma leva chama até 5 guias livres, do topo da fila.
 * A lista fecha com 3 sim. Com menos de 3 e sem mais ninguém livre, fecha assim mesmo.
 * O prazo de cada guia é o relógio de 4h20. O cliente tem 6h no mesmo relógio.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ops_clock.php';

function gcv_escolha_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_guide_choice_rounds (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              excursion_id INT UNSIGNED NOT NULL,
              token VARCHAR(64) NOT NULL,
              status VARCHAR(16) NOT NULL DEFAULT 'open',
              expires_at DATETIME NOT NULL,
              chosen_guide_id INT UNSIGNED NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_choice_token (token),
              INDEX idx_choice_exc (excursion_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('gcv_escolha_ensure_schema: ' . $e->getMessage());
    }
}

function gcv_escolha_need(): int
{
    return 3;
}

function gcv_escolha_wave(): int
{
    return 5;
}

function gcv_escolha_is_private(array $tour): bool
{
    if (!function_exists('gcv_excursion_is_private')) {
        require_once __DIR__ . '/excursion_status.php';
    }
    if (!function_exists('gcv_guiagem_tour_is_teste')) {
        require_once __DIR__ . '/guide_queue_offer.php';
    }
    return gcv_excursion_is_private($tour) && !gcv_guiagem_tour_is_teste($tour);
}

/** @return list<int> */
function gcv_escolha_accepted_ids(int $excursionId): array
{
    if ($excursionId <= 0) {
        return [];
    }
    try {
        $st = db()->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND kind = 'escolha' AND status = 'accepted'
             ORDER BY id ASC"
        );
        $st->execute([$excursionId]);
        return array_values(array_unique(array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: [])));
    } catch (Throwable $e) {
        error_log('gcv_escolha_accepted_ids: ' . $e->getMessage());
        return [];
    }
}

function gcv_escolha_round_open(int $excursionId): bool
{
    gcv_escolha_ensure_schema();
    if ($excursionId <= 0) {
        return false;
    }
    try {
        $st = db()->prepare(
            "SELECT id FROM gcv_guide_choice_rounds
             WHERE excursion_id = ? AND status = 'open' LIMIT 1"
        );
        $st->execute([$excursionId]);
        return (bool)$st->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

function gcv_escolha_blocks_cancel(int $excursionId): bool
{
    return gcv_escolha_round_open($excursionId) || gcv_escolha_accepted_ids($excursionId) !== [];
}

function gcv_guiagem_choice_holds_day(int $guideId, string $dateIso, int $exceptId): bool
{
    if ($guideId <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateIso)) {
        return false;
    }
    try {
        $st = db()->prepare(
            "SELECT o.id
             FROM gcv_guide_queue_offers o
             INNER JOIN gcv_excursions e ON e.id = o.excursion_id
             WHERE o.guide_user_id = ?
               AND o.kind = 'escolha'
               AND o.status IN ('pending','accepted')
               AND e.date_iso = ?
               AND e.id <> ?
               AND e.deleted_at IS NULL
             LIMIT 1"
        );
        $st->execute([$guideId, $dateIso, $exceptId]);
        return (bool)$st->fetchColumn();
    } catch (Throwable $e) {
        error_log('gcv_guiagem_choice_holds_day: ' . $e->getMessage());
        return false;
    }
}

function gcv_escolha_url(string $token): string
{
    return 'https://www.guiachapadaveadeiros.com/escolher-guia/?t=' . rawurlencode($token);
}

/**
 * @param array<string,mixed> $tour
 * @return list<array<string,mixed>>
 */
function gcv_escolha_open_wave(array $tour, int $exceptId = 0): array
{
    if (!gcv_escolha_is_private($tour)) {
        return [];
    }
    gcv_escolha_ensure_schema();
    if (!function_exists('gcv_guiagem_ensure_schema')) {
        require_once __DIR__ . '/guide_queue_offer.php';
    }
    gcv_guiagem_ensure_schema();
    $tourId = (int)($tour['id'] ?? 0);
    if ($tourId <= 0 || gcv_escolha_round_open($tourId)) {
        return [];
    }
    if ((int)($tour['guide_user_id'] ?? 0) > 0) {
        return [];
    }
    $accepted = gcv_escolha_accepted_ids($tourId);
    if (count($accepted) >= gcv_escolha_need()) {
        gcv_escolha_publish($tour, $accepted);
        return [];
    }
    if (gcv_guiagem_pending_guide_ids($tourId)) {
        return [];
    }
    $skip = gcv_guiagem_skip_ids($tourId);
    if ($exceptId > 0) {
        $skip[$exceptId] = true;
    }
    $vehicle = gcv_guiagem_is_vehicle_broadcast($tour);
    $fila = function_exists('gcv_excursao_exige_guia_kalunga') && gcv_excursao_exige_guia_kalunga($tour)
        ? 'kalunga'
        : 'geral';
    if (!function_exists('gcv_substitution_queue')) {
        require_once __DIR__ . '/guide_substitution.php';
    }
    $picked = [];
    foreach (gcv_substitution_queue($fila) as $g) {
        $id = (int)($g['id'] ?? 0);
        if ($id <= 0 || isset($skip[$id])) {
            continue;
        }
        if ($vehicle && !gcv_guide_has_registered_vehicle($id)) {
            continue;
        }
        if (gcv_substitution_busy($id, $tour) || gcv_guiagem_day_busy($id, (string)($tour['date_iso'] ?? ''), $tourId)) {
            continue;
        }
        $kalungaErro = function_exists('gcv_guia_erro_kalunga_excursao')
            ? gcv_guia_erro_kalunga_excursao($tour, $id)
            : null;
        if ($kalungaErro === null && function_exists('gcv_guia_erro_fila_kalunga')) {
            $kalungaErro = gcv_guia_erro_fila_kalunga($tour, $id);
        }
        if ($kalungaErro !== null) {
            continue;
        }
        $picked[] = $g;
        if (count($picked) >= gcv_escolha_wave()) {
            break;
        }
    }
    if (!$picked) {
        if ($accepted !== []) {
            gcv_escolha_publish($tour, $accepted);
        }
        return [];
    }
    $deadline = gcv_guiagem_deadline_for($tour);
    $hasKind = gcv_guiagem_column_exists('kind');
    $hasToken = gcv_guiagem_column_exists('accept_token');
    $hasExp = gcv_guiagem_column_exists('expires_at');
    try {
        if ($hasKind && $hasToken && $hasExp) {
            $ins = db()->prepare(
                "INSERT INTO gcv_guide_queue_offers
                   (excursion_id, guide_user_id, status, kind, accept_token, expires_at)
                 VALUES (?, ?, 'pending', 'escolha', ?, ?)"
            );
            foreach ($picked as $g) {
                $ins->execute([$tourId, (int)$g['id'], gcv_guiagem_new_token(), $deadline]);
            }
        } elseif ($hasKind) {
            $ins = db()->prepare(
                "INSERT INTO gcv_guide_queue_offers (excursion_id, guide_user_id, status, kind)
                 VALUES (?, ?, 'pending', 'escolha')"
            );
            foreach ($picked as $g) {
                $ins->execute([$tourId, (int)$g['id']]);
            }
            gcv_guiagem_stamp_pending($tourId, array_map(static fn ($g) => (int)$g['id'], $picked), $tour);
        }
    } catch (Throwable $e) {
        error_log('gcv_escolha_open_wave: ' . $e->getMessage());
        return [];
    }
    return $picked;
}

/**
 * @param array<string,mixed> $user
 * @return array<string,mixed>
 */
function gcv_escolha_guide_accept(int $excursionId, array $user): array
{
    $me = (int)($user['id'] ?? 0);
    if ($me <= 0) {
        return ['ok' => false, 'error' => 'Esta vaga não está aguardando você', 'status' => 404];
    }
    $pdo = db();
    $publish = false;
    $pdo->beginTransaction();
    try {
        $offer = $pdo->prepare(
            "SELECT id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND guide_user_id = ? AND status = 'pending' AND kind = 'escolha'
             LIMIT 1 FOR UPDATE"
        );
        $offer->execute([$excursionId, $me]);
        $offerId = (int)($offer->fetchColumn() ?: 0);
        if ($offerId <= 0) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Esta lista não está aguardando você', 'status' => 404];
        }
        $pdo->prepare(
            "UPDATE gcv_guide_queue_offers SET status = 'accepted', decided_at = NOW() WHERE id = ?"
        )->execute([$offerId]);
        $count = $pdo->prepare(
            "SELECT COUNT(*) FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND kind = 'escolha' AND status = 'accepted'"
        );
        $count->execute([$excursionId]);
        $publish = (int)$count->fetchColumn() >= gcv_escolha_need();
        if ($publish) {
            $pdo->prepare(
                "UPDATE gcv_guide_queue_offers
                 SET status = 'expired', decided_at = NOW()
                 WHERE excursion_id = ? AND kind = 'escolha' AND status = 'pending'"
            )->execute([$excursionId]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_escolha_guide_accept: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível entrar na lista', 'status' => 500];
    }
    $tour = gcv_substitution_load_excursion($excursionId);
    if ($publish && $tour) {
        gcv_escolha_publish($tour, gcv_escolha_accepted_ids($excursionId));
    }
    return [
        'ok' => true,
        'result' => 'accepted',
        'message' => $publish
            ? 'Você entrou na lista. Ela fechou e o cliente vai escolher.'
            : 'Você entrou na lista. O cliente escolhe o guia. Sua posição na fila não mudou.',
    ];
}

/**
 * @param array<string,mixed> $tour
 * @param list<int> $guideIds
 */
function gcv_escolha_publish(array $tour, array $guideIds): void
{
    gcv_escolha_ensure_schema();
    $excursionId = (int)($tour['id'] ?? 0);
    $guideIds = array_values(array_filter(array_map('intval', $guideIds), static fn ($id) => $id > 0));
    if ($excursionId <= 0 || $guideIds === [] || gcv_escolha_round_open($excursionId)) {
        return;
    }
    $withdrawn = [];
    try {
        $pend = db()->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND kind = 'escolha' AND status = 'pending'"
        );
        $pend->execute([$excursionId]);
        $withdrawn = array_map('intval', $pend->fetchAll(PDO::FETCH_COLUMN) ?: []);
        db()->prepare(
            "UPDATE gcv_guide_queue_offers
             SET status = 'expired', decided_at = NOW()
             WHERE excursion_id = ? AND kind = 'escolha' AND status = 'pending'"
        )->execute([$excursionId]);
    } catch (Throwable $e) {
        error_log('gcv_escolha_publish withdraw: ' . $e->getMessage());
    }
    $token = bin2hex(random_bytes(16));
    $expires = gcv_ops_clock_active_until(gcv_ops_clock_now(), gcv_ops_clock_choice_seconds())
        ->format('Y-m-d H:i:s');
    try {
        db()->prepare(
            "INSERT INTO gcv_guide_choice_rounds (excursion_id, token, status, expires_at)
             VALUES (?, ?, 'open', ?)"
        )->execute([$excursionId, $token, $expires]);
    } catch (Throwable $e) {
        error_log('gcv_escolha_publish insert: ' . $e->getMessage());
        return;
    }
    gcv_escolha_notify_closed($tour, $withdrawn);
    gcv_escolha_notify_client($tour, $token, $expires, count($guideIds));
}

/** @param list<int> $guideIds */
function gcv_escolha_notify_closed(array $tour, array $guideIds): void
{
    $guideIds = array_values(array_filter(array_map('intval', $guideIds), static fn ($id) => $id > 0));
    if (!$guideIds) {
        return;
    }
    require_once __DIR__ . '/notify_ops.php';
    require_once __DIR__ . '/wa_copy.php';
    $title = function_exists('gcv_ops_excursion_title')
        ? gcv_ops_excursion_title($tour)
        : (string)($tour['attraction_title'] ?? 'Passeio');
    $when = trim(
        gcv_ops_date_br((string)($tour['date_iso'] ?? ''))
        . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5)
    );
    $text = gcv_wa_text('guia_lista_fechou', 'pt', ['titulo' => $title, 'quando' => $when]);
    foreach ($guideIds as $gid) {
        gcv_ops_wa_guide($gid, $text, [
            'kind' => 'choice_closed',
            'excursion_id' => (int)($tour['id'] ?? 0),
        ]);
    }
}

function gcv_escolha_notify_client(array $tour, string $token, string $expiresSql, int $count, bool $auto = false, string $guideName = ''): void
{
    require_once __DIR__ . '/notify_ops.php';
    require_once __DIR__ . '/wa_copy.php';
    $excursionId = (int)($tour['id'] ?? 0);
    $title = gcv_ops_excursion_title($tour);
    $when = trim(
        gcv_ops_date_br((string)($tour['date_iso'] ?? ''))
        . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5)
    );
    $sales = gcv_ops_reserved_sales_for_excursion($excursionId);
    if (!$sales) {
        return;
    }
    foreach ($sales as $sale) {
        $loc = gcv_ops_sale_locale($sale);
        $vars = [
            'titulo' => $title,
            'quando' => $when,
            'codigo' => strtoupper(trim((string)($sale['reservation_id'] ?? ''))),
            'prazo' => gcv_ops_clock_label_from_sql($expiresSql),
            'link' => gcv_escolha_url($token),
            'n' => (string)max(1, $count),
            'guia' => $guideName,
        ];
        $key = $auto ? 'escolha_auto' : 'escolha_link';
        $text = gcv_wa_text($key, $loc, $vars);
        gcv_ops_wa_client($sale, $text, [
            'kind' => $auto ? 'choice_auto' : 'choice_link',
            'excursion_id' => $excursionId,
            'sale_id' => (int)($sale['id'] ?? 0),
        ]);
        $email = trim((string)($sale['tourist_email'] ?? ''));
        if ($email !== '') {
            gcv_ops_mail_plain($email, gcv_wa_text($auto ? 'assunto_escolha_auto' : 'assunto_escolha', $loc, $vars), $text);
        }
    }
}

/**
 * @return array<string,mixed>
 */
function gcv_escolha_assign(int $excursionId, int $guideId, bool $auto = false): array
{
    if ($excursionId <= 0 || $guideId <= 0) {
        return ['ok' => false, 'error' => 'Guia inválido'];
    }
    gcv_escolha_ensure_schema();
    $name = '';
    try {
        $st = db()->prepare(
            "SELECT COALESCE(NULLIF(g.full_name, ''), NULLIF(g.nickname, ''), u.name)
             FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.id = ? LIMIT 1"
        );
        $st->execute([$guideId]);
        $name = trim((string)($st->fetchColumn() ?: ''));
    } catch (Throwable $e) {
        $name = '';
    }
    $others = [];
    try {
        $othersSt = db()->prepare(
            "SELECT guide_user_id FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND kind = 'escolha' AND status = 'accepted' AND guide_user_id <> ?"
        );
        $othersSt->execute([$excursionId, $guideId]);
        $others = array_map('intval', $othersSt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        db()->prepare(
            "UPDATE gcv_guide_queue_offers
             SET status = 'passed', decided_at = NOW()
             WHERE excursion_id = ? AND kind = 'escolha' AND status = 'accepted' AND guide_user_id <> ?"
        )->execute([$excursionId, $guideId]);
        db()->prepare(
            "UPDATE gcv_guide_queue_offers
             SET status = 'pending', kind = 'queue', decided_at = NULL
             WHERE excursion_id = ? AND guide_user_id = ? AND kind = 'escolha' AND status = 'accepted'"
        )->execute([$excursionId, $guideId]);
        db()->prepare(
            "UPDATE gcv_guide_choice_rounds
             SET status = 'chosen', chosen_guide_id = ?
             WHERE excursion_id = ? AND status = 'open'"
        )->execute([$guideId, $excursionId]);
    } catch (Throwable $e) {
        error_log('gcv_escolha_assign prep: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Não foi possível escolher o guia'];
    }
    $result = gcv_guiagem_accept($excursionId, ['id' => $guideId, 'role' => 'guide']);
    if (empty($result['ok'])) {
        try {
            db()->prepare(
                "UPDATE gcv_guide_queue_offers
                 SET status = 'accepted', kind = 'escolha', decided_at = NOW()
                 WHERE excursion_id = ? AND guide_user_id = ? AND kind = 'queue' AND status = 'pending'"
            )->execute([$excursionId, $guideId]);
            if ($others) {
                $back = db()->prepare(
                    "UPDATE gcv_guide_queue_offers
                     SET status = 'accepted', kind = 'escolha'
                     WHERE excursion_id = ? AND guide_user_id = ? AND kind = 'escolha' AND status = 'passed'"
                );
                foreach ($others as $gid) {
                    if ($gid > 0) {
                        $back->execute([$excursionId, $gid]);
                    }
                }
            }
            db()->prepare(
                "UPDATE gcv_guide_choice_rounds
                 SET status = 'open', chosen_guide_id = NULL
                 WHERE excursion_id = ? AND status = 'chosen' AND chosen_guide_id = ?"
            )->execute([$excursionId, $guideId]);
        } catch (Throwable $e) {
            error_log('gcv_escolha_assign revert: ' . $e->getMessage());
        }
        return $result;
    }
    $tour = gcv_substitution_load_excursion($excursionId) ?: [];
    if ($tour && $others) {
        require_once __DIR__ . '/notify_ops.php';
        require_once __DIR__ . '/wa_copy.php';
        $title = gcv_ops_excursion_title($tour);
        $when = trim(gcv_ops_date_br((string)($tour['date_iso'] ?? '')) . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5));
        $text = gcv_wa_text('guia_nao_escolhido', 'pt', ['titulo' => $title, 'quando' => $when]);
        foreach ($others as $gid) {
            if ($gid > 0) {
                gcv_ops_wa_guide($gid, $text, ['kind' => 'choice_passed', 'excursion_id' => $excursionId]);
            }
        }
    }
    if ($auto && $tour) {
        gcv_escolha_notify_client($tour, '', '', 1, true, $name !== '' ? $name : 'O guia');
    }
    return $result;
}

function gcv_escolha_best_guide(int $excursionId, array $tour): int
{
    $accepted = array_flip(gcv_escolha_accepted_ids($excursionId));
    if (!$accepted) {
        return 0;
    }
    if (!function_exists('gcv_substitution_queue')) {
        require_once __DIR__ . '/guide_substitution.php';
    }
    $fila = function_exists('gcv_excursao_exige_guia_kalunga') && gcv_excursao_exige_guia_kalunga($tour)
        ? 'kalunga'
        : 'geral';
    foreach (gcv_substitution_queue($fila) as $g) {
        $id = (int)($g['id'] ?? 0);
        if ($id > 0 && isset($accepted[$id])) {
            return $id;
        }
    }
    $ids = array_keys($accepted);
    return (int)($ids[0] ?? 0);
}

function gcv_escolha_expire_rounds(?DateTimeImmutable $now = null): int
{
    gcv_escolha_ensure_schema();
    $now = $now ?? gcv_ops_clock_now();
    try {
        $st = db()->prepare(
            "SELECT excursion_id FROM gcv_guide_choice_rounds
             WHERE status = 'open' AND expires_at <= ?"
        );
        $st->execute([$now->format('Y-m-d H:i:s')]);
        $ids = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
    } catch (Throwable $e) {
        error_log('gcv_escolha_expire_rounds: ' . $e->getMessage());
        return 0;
    }
    $n = 0;
    foreach ($ids as $excursionId) {
        if (!function_exists('gcv_substitution_load_excursion')) {
            require_once __DIR__ . '/guide_substitution.php';
        }
        $tour = gcv_substitution_load_excursion($excursionId);
        if (!$tour) {
            continue;
        }
        $guideId = gcv_escolha_best_guide($excursionId, $tour);
        if ($guideId <= 0) {
            try {
                db()->prepare(
                    "UPDATE gcv_guide_choice_rounds SET status = 'expired' WHERE excursion_id = ? AND status = 'open'"
                )->execute([$excursionId]);
            } catch (Throwable $e) {
                error_log('gcv_escolha_expire empty: ' . $e->getMessage());
            }
            continue;
        }
        $out = gcv_escolha_assign($excursionId, $guideId, true);
        if (!empty($out['ok'])) {
            $n++;
        }
    }
    return $n;
}

/**
 * @return array<string,mixed>|null
 */
function gcv_escolha_round_by_token(string $token): ?array
{
    gcv_escolha_ensure_schema();
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return null;
    }
    try {
        $st = db()->prepare('SELECT * FROM gcv_guide_choice_rounds WHERE token = ? LIMIT 1');
        $st->execute([$token]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

/** @return list<array<string,mixed>> */
function gcv_escolha_candidates(int $excursionId): array
{
    try {
        $st = db()->prepare(
            "SELECT u.id,
                    COALESCE(NULLIF(g.full_name, ''), NULLIF(g.nickname, ''), u.name) AS nome,
                    COALESCE(NULLIF(g.photo_3x4_url, ''), NULLIF(g.photo_url, '')) AS foto
             FROM gcv_guide_queue_offers o
             INNER JOIN gcv_users u ON u.id = o.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE o.excursion_id = ? AND o.kind = 'escolha' AND o.status = 'accepted'
             ORDER BY o.id ASC"
        );
        $st->execute([$excursionId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return [];
    }
    $byId = [];
    foreach ($rows as $row) {
        $byId[(int)$row['id']] = $row;
    }
    if (!function_exists('gcv_substitution_load_excursion')) {
        require_once __DIR__ . '/guide_substitution.php';
    }
    $tour = gcv_substitution_load_excursion($excursionId) ?: [];
    $ordered = [];
    if ($tour && function_exists('gcv_substitution_queue')) {
        $fila = function_exists('gcv_excursao_exige_guia_kalunga') && gcv_excursao_exige_guia_kalunga($tour)
            ? 'kalunga'
            : 'geral';
        foreach (gcv_substitution_queue($fila) as $g) {
            $id = (int)($g['id'] ?? 0);
            if ($id > 0 && isset($byId[$id])) {
                $ordered[] = $byId[$id];
                unset($byId[$id]);
            }
        }
    }
    foreach ($byId as $row) {
        $ordered[] = $row;
    }
    return $ordered;
}
