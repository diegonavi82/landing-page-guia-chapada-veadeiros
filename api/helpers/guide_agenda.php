<?php
declare(strict_types=1);

require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/meeting_point.php';
require_once __DIR__ . '/marketplace/pricing_service.php';
require_once __DIR__ . '/marketplace/publish_service.php';
require_once __DIR__ . '/excursion_attractions.php';

/**
 * Regras da Agenda do guia (editar / excluir / campos bloqueados).
 *
 * @param array<string,mixed> $e
 * @return array<string,mixed>
 */
function gcv_guide_tour_is_archived(array $e, ?string $today = null): bool
{
    $life = (string)($e['lifecycle'] ?? (function_exists('gcv_resolve_excursion_lifecycle')
        ? gcv_resolve_excursion_lifecycle($e)
        : ''));
    if (in_array($life, ['rejeitada', 'cancelada', 'concluida'], true)) {
        return true;
    }
    $status = (string)($e['status'] ?? '');
    if (in_array($status, ['cancelled', 'rejected'], true)) {
        return true;
    }
    if ($today === null) {
        $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    }
    return (string)($e['date_iso'] ?? '') < $today;
}

function gcv_guide_agenda_flags(array $e): array
{
    $life = (string)($e['lifecycle'] ?? (function_exists('gcv_resolve_excursion_lifecycle')
        ? gcv_resolve_excursion_lifecycle($e)
        : ''));
    $walkInsc = function_exists('gcv_excursion_platform_inscriptions')
        ? gcv_excursion_platform_inscriptions($e)
        : max(0, (int)($e['booked_people'] ?? 0));
    $vanInsc = function_exists('gcv_excursion_platform_inscriptions_transport')
        ? gcv_excursion_platform_inscriptions_transport($e)
        : max(0, (int)($e['booked_people_transport'] ?? 0));
    $insc = $walkInsc + $vanInsc;
    $occupied = function_exists('gcv_excursion_occupied_people')
        ? gcv_excursion_occupied_people($e)
        : $insc + max(0, (int)($e['preconfirmed_people'] ?? 0));
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $future = (string)($e['date_iso'] ?? '') >= $today;
    $cancelled = in_array($life, ['cancelada', 'rejeitada'], true);
    $done = $life === 'concluida';
    $forming = $life === 'em_formacao';
    $confirmed = $life === 'confirmada';
    $pending = $life === 'aguardando_aprovacao';
    $canEdit = $insc === 0 && !$cancelled && !$done;
    $canDelete = $canEdit && ($pending || $future) && !($confirmed && $insc > 0);

    return [
        'can_edit' => $canEdit,
        'can_delete' => $canDelete,
        'archived' => gcv_guide_tour_is_archived($e),
        'can_scan' => !$pending && !$cancelled && !$done && $life !== 'rejeitada',
        'can_change_date' => $canEdit,
        'can_change_city' => $canEdit,
        'can_change_time' => $canEdit,
        'can_change_meeting' => $canEdit,
        'can_change_price' => $canEdit,
        'can_change_max' => $canEdit,
        'can_change_quorum' => $canEdit,
        'can_confirm' => $canEdit && $forming,
        'can_change_preconfirmed' => $canEdit,
        'can_change_includes' => $canEdit,
        'can_transfer' => $canEdit,
        'platform_inscriptions' => $insc,
        'occupied' => $occupied,
        'has_transfer_pending' => (int)($e['transfer_to_user_id'] ?? 0) > 0,
    ];
}

/**
 * @return list<array{id:int,name:string}>
 */
function gcv_guide_list_peer_guides(int $exceptUserId): array
{
    $sql = "SELECT u.id,
                   COALESCE(NULLIF(g.full_name,''), NULLIF(g.nickname,''), u.name) AS name
            FROM gcv_users u
            INNER JOIN gcv_guides g ON g.user_id = u.id
            WHERE u.status = 'active' AND u.id <> ?
            ORDER BY name ASC";
    try {
        $st = db()->prepare($sql);
        $st->execute([$exceptUserId]);
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $id = (int)($row['id'] ?? 0);
            $name = trim((string)($row['name'] ?? ''));
            if ($id > 0 && $name !== '') {
                $out[] = ['id' => $id, 'name' => $name];
            }
        }
        return $out;
    } catch (Throwable $e) {
        return [];
    }
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_guide_incoming_transfers(int $toUserId): array
{
    if ($toUserId <= 0) {
        return [];
    }
    try {
        $st = db()->prepare(
            "SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name,
                    COALESCE(NULLIF(g.full_name,''), NULLIF(g.nickname,''), u.name) AS from_guide_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_users u ON u.id = e.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
             WHERE e.transfer_to_user_id = ?
               AND e.guide_user_id <> ?
               AND e.status NOT IN ('cancelled','rejected')
               AND e.deleted_at IS NULL
             ORDER BY e.date_iso ASC, e.departure_time ASC"
        );
        $st->execute([$toUserId, $toUserId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map('gcv_map_excursion_row', $rows);
    } catch (Throwable $e) {
        return [];
    }
}

/**
 * @param array<string,mixed> $ex
 * @param array<string,mixed> $data
 * @return array<string,mixed>
 */
function gcv_guide_update_excursion(array $ex, array $data, int $userId): array
{
    $mapped = function_exists('gcv_map_excursion_row') ? gcv_map_excursion_row($ex) : $ex;
    $flags = gcv_guide_agenda_flags($mapped);
    if (empty($flags['can_edit'])) {
        throw new InvalidArgumentException('Este passeio não pode ser editado');
    }

    $sets = [];
    $params = [];
    $insc = (int)$flags['platform_inscriptions'];
    $occupied = (int)$flags['occupied'];
    $maxPeople = (int)($ex['max_people'] ?? 10);
    $preconfirmed = (int)($ex['preconfirmed_people'] ?? 0);
    $quorum = (int)($ex['quorum'] ?? 0);

    if (array_key_exists('max_people', $data) && !empty($flags['can_change_max'])) {
        $maxPeople = (int)$data['max_people'];
        if ($maxPeople < 1) {
            $maxPeople = 1;
        }
        if ($maxPeople > 12) {
            $maxPeople = 12;
        }
        if ($maxPeople < $occupied) {
            throw new InvalidArgumentException('Vagas não podem ser menores que o grupo atual');
        }
        if ($quorum > $maxPeople) {
            $quorum = $maxPeople;
        }
    }

    if (array_key_exists('preconfirmed_people', $data) && !empty($flags['can_change_preconfirmed'])) {
        $preconfirmed = gcv_clamp_preconfirmed($data['preconfirmed_people'], $maxPeople, $insc);
    }

    if (!empty($data['confirm_now']) && !empty($flags['can_confirm'])) {
        $quorum = 0;
    } elseif (array_key_exists('quorum', $data) && !empty($flags['can_change_quorum'])) {
        $quorum = gcv_clamp_walk_quorum($data['quorum'], $maxPeople);
    }

    if ($maxPeople < ($preconfirmed + $quorum)) {
        throw new InvalidArgumentException('Vagas devem caber as pessoas confirmadas por fora e o quórum das novas inscrições');
    }

    if (array_key_exists('date_iso', $data) && (string)$data['date_iso'] !== (string)($ex['date_iso'] ?? '')) {
        if (empty($flags['can_change_date'])) {
            throw new InvalidArgumentException('A data só pode ser alterada se não houver inscrição na plataforma');
        }
        $date = trim((string)$data['date_iso']);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new InvalidArgumentException('Data inválida');
        }
        $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
        if ($date < $today) {
            throw new InvalidArgumentException('Data deve ser futura');
        }
        $sets[] = 'date_iso = ?';
        $params[] = $date;
    }

    if (array_key_exists('departure_city_id', $data) && (int)$data['departure_city_id'] !== (int)($ex['departure_city_id'] ?? 0)) {
        if (empty($flags['can_change_city'])) {
            throw new InvalidArgumentException('A cidade de saída só pode ser alterada se não houver inscrição na plataforma');
        }
        $cityId = (int)$data['departure_city_id'];
        if ($cityId <= 0) {
            throw new InvalidArgumentException('Cidade inválida');
        }
        $c = db()->prepare("SELECT id FROM gcv_cities WHERE id = ? AND status = 'active'");
        $c->execute([$cityId]);
        if (!$c->fetch()) {
            throw new InvalidArgumentException('Cidade de saída inválida');
        }
        $sets[] = 'departure_city_id = ?';
        $params[] = $cityId;
    }

    if (array_key_exists('departure_time', $data) && !empty($flags['can_change_time'])) {
        $time = function_exists('gcv_normalize_departure_time')
            ? gcv_normalize_departure_time((string)$data['departure_time'])
            : trim((string)$data['departure_time']);
        if ($time === '') {
            throw new InvalidArgumentException('Horário de saída inválido');
        }
        $sets[] = 'departure_time = ?';
        $params[] = $time;
    }

    if (!empty($flags['can_change_meeting']) && (isset($data['meeting_point']) || isset($data['meeting_point_place_id']))) {
        $mp = gcv_meeting_point_from_body($data, true);
        if (isset($mp['error'])) {
            throw new InvalidArgumentException((string)$mp['error']);
        }
        $sets[] = 'meeting_point = ?';
        $params[] = (string)$mp['point'];
        $sets[] = 'meeting_point_place_id = ?';
        $params[] = $mp['place_id'] ?? null;
        $sets[] = 'meeting_point_lat = ?';
        $params[] = $mp['lat'] ?? null;
        $sets[] = 'meeting_point_lng = ?';
        $params[] = $mp['lng'] ?? null;
    }

    $attrId = (int)($ex['attraction_id'] ?? 0);
    if (array_key_exists('attraction_id', $data)) {
        $newAttr = (int)$data['attraction_id'];
        if ($newAttr <= 0) {
            throw new InvalidArgumentException('Atrativo inválido');
        }
        $a = db()->prepare("SELECT id FROM gcv_attractions WHERE id = ? AND status = 'published'");
        $a->execute([$newAttr]);
        if (!$a->fetch()) {
            throw new InvalidArgumentException('Atrativo inválido ou não publicado pelo admin');
        }
        $attrId = $newAttr;
        $sets[] = 'attraction_id = ?';
        $params[] = $attrId;
    }

    if (array_key_exists('notes_pt', $data)) {
        $notes = trim((string)$data['notes_pt']);
        if (function_exists('mb_substr')) {
            $notes = mb_substr($notes, 0, 2000);
        } else {
            $notes = substr($notes, 0, 2000);
        }
        $sets[] = 'notes_pt = ?';
        $params[] = $notes !== '' ? $notes : null;
    }

    if (array_key_exists('include_entry', $data)) {
        if (empty($flags['can_change_includes'])) {
            throw new InvalidArgumentException('Ingresso só pode ser alterado se não houver inscrição');
        }
        $sets[] = 'include_entry = ?';
        $params[] = !empty($data['include_entry']) ? 1 : 0;
    }

    $currentNet = (int)($ex['guide_net_cents'] ?? 0);
    if ($currentNet <= 0) {
        require_once __DIR__ . '/settings.php';
        $pct = (float)setting('platform_commission_pct', '10');
        $keep = 1 - ($pct / 100.0);
        if ($keep <= 0 || $keep >= 1) {
            $keep = 0.90;
        }
        $currentNet = (int)round(((int)($ex['price_cents'] ?? 0)) * $keep);
    }
    if (isset($data['guide_net_cents']) || isset($data['guide_net'])) {
        if (empty($flags['can_change_price'])) {
            throw new InvalidArgumentException('Valor não pode ser alterado neste passeio');
        }
        $newNet = isset($data['guide_net_cents'])
            ? (int)$data['guide_net_cents']
            : (int)round(((float)$data['guide_net']) * 100);
        if ($newNet < $currentNet && $insc > 0) {
            throw new InvalidArgumentException('O valor a receber só pode ser aumentado');
        }
        $attrForPrice = array_key_exists('attraction_id', $data)
            ? (int)$data['attraction_id']
            : (int)($ex['attraction_id'] ?? 0);
        $withTransport = array_key_exists('include_transport', $data)
            ? !empty($data['include_transport'])
            : !empty($ex['include_transport']);
        $rangeErr = gcv_guide_net_range_error($newNet, $attrForPrice, null, $withTransport);
        if ($rangeErr !== null) {
            throw new InvalidArgumentException($rangeErr);
        }
        $cityForPrice = isset($data['departure_city_id'])
            ? (int)$data['departure_city_id']
            : (int)($ex['departure_city_id'] ?? 0);
        $pricing = gcv_pricing_from_guide_net(
            $newNet,
            (int)($ex['id'] ?? 0),
            $userId,
            null,
            $cityForPrice > 0 ? $cityForPrice : null
        );
        $sets[] = 'guide_net_cents = ?';
        $params[] = $pricing['guide_net_cents'];
        $sets[] = 'price_cents = ?';
        $params[] = $pricing['final_price_cents'];
        $sets[] = 'commission_pct_applied = ?';
        $params[] = $pricing['commission_pct'];
        $sets[] = 'commission_cents = ?';
        $params[] = $pricing['commission_cents'];
        $sets[] = 'price_before_round_cents = ?';
        $params[] = $pricing['price_before_round_cents'];
        $sets[] = 'rounding_diff_cents = ?';
        $params[] = $pricing['rounding_diff_cents'];
        $sets[] = 'guide_payout_planned_cents = ?';
        $params[] = $pricing['guide_net_cents'];
        if (isset($pricing['commission_rule_id'])) {
            $sets[] = 'commission_rule_id = ?';
            $params[] = $pricing['commission_rule_id'];
        }
    }

    $sets[] = 'max_people = ?';
    $params[] = $maxPeople;
    $sets[] = 'preconfirmed_people = ?';
    $params[] = $preconfirmed;
    $sets[] = 'quorum = ?';
    $params[] = $quorum;
    $sets[] = 'updated_by = ?';
    $params[] = $userId;

    $toGuide = isset($data['transfer_to_user_id']) ? (int)$data['transfer_to_user_id'] : 0;
    if ($toGuide > 0 && !empty($flags['can_transfer'])) {
        if ($toGuide === $userId) {
            throw new InvalidArgumentException('Escolha outro guia para o repasse');
        }
        $ok = db()->prepare(
            "SELECT u.id FROM gcv_users u INNER JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.id = ? AND u.status = 'active' LIMIT 1"
        );
        $ok->execute([$toGuide]);
        if (!$ok->fetch()) {
            throw new InvalidArgumentException('Guia de destino inválido');
        }
        $sets[] = 'transfer_to_user_id = ?';
        $params[] = $toGuide;
        $sets[] = 'transfer_requested_at = NOW()';
    }

    $params[] = (int)$ex['id'];
    $sql = 'UPDATE gcv_excursions SET ' . implode(', ', $sets) . ' WHERE id = ?';
    db()->prepare($sql)->execute($params);

    if (array_key_exists('attraction_id', $data) && function_exists('gcv_excursion_save_attractions')) {
        gcv_excursion_save_attractions((int)$ex['id'], [$attrId]);
    }

    if (
        array_key_exists('offer_transport', $data)
        || array_key_exists('include_transport', $data)
        || array_key_exists('guide_net_transport_cents', $data)
        || array_key_exists('guide_net_transport', $data)
    ) {
        if (empty($flags['can_change_includes'])) {
            throw new InvalidArgumentException('Transporte só pode ser alterado se não houver inscrição');
        }
        $payloadT = $data;
        $payloadT['offer_transport'] = !empty($data['offer_transport']) || !empty($data['include_transport']);
        $payloadT['max_people'] = $maxPeople;
        gcv_publish_save_transport_offer(
            db(),
            (int)$ex['id'],
            $payloadT,
            $attrId,
            $userId,
            null,
            isset($data['departure_city_id']) ? (int)$data['departure_city_id'] : (int)($ex['departure_city_id'] ?? 0)
        );
    }

    $st = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $st->execute([(int)$ex['id']]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: $ex;

    if ($toGuide > 0) {
        try {
            require_once __DIR__ . '/notify_ops.php';
            if (function_exists('gcv_ops_notify_guide_transfer_offer')) {
                gcv_ops_notify_guide_transfer_offer((int)$ex['id'], $userId, $toGuide);
            }
        } catch (Throwable $e) {
            error_log('transfer notify: ' . $e->getMessage());
        }
    }

    return $row;
}
