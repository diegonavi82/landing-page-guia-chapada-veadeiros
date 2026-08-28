<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../excursion_status.php';
require_once __DIR__ . '/../mailer.php';
require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/pricing_service.php';
require_once __DIR__ . '/audit_service.php';

function gcv_clamp_quorum($value): int
{
    $n = (int)$value;
    if ($n < 0) {
        return 0;
    }
    if ($n > 4) {
        return 4;
    }
    return $n;
}

function gcv_clamp_max_people($value): int
{
    $n = (int)$value;
    if ($n < 1) {
        return 1;
    }
    if ($n > 12) {
        return 12;
    }
    return $n;
}

/**
 * Publicação administrativa (BusinessMode = ADMINISTRATIVE).
 * Publica imediatamente; admin define preço e repasse.
 *
 * @param array<string,mixed> $payload
 * @return array<string,mixed>
 */
function gcv_publish_administrative(array $payload, int $adminUserId, string $createdByOrigin = GcvCreatedBy::ADMIN): array
{
    gcv_marketplace_ensure_schema();
    $origin = GcvCreatedBy::normalize($createdByOrigin, GcvCreatedBy::ADMIN);
    if ($origin === GcvCreatedBy::GUIDE) {
        throw new InvalidArgumentException('CreatedBy GUIDE não pode publicar no modo ADMINISTRATIVE');
    }

    $guideUserId = (int)($payload['guide_user_id'] ?? 0);
    if ($guideUserId <= 0) {
        throw new InvalidArgumentException('Guia responsável obrigatório');
    }
    $priceCents = (int)($payload['price_cents'] ?? 0);
    $guidePayout = (int)($payload['guide_payout_planned_cents'] ?? ($payload['guide_net_cents'] ?? -1));
    if ($guidePayout < 0) {
        throw new InvalidArgumentException('Valor previsto de repasse ao guia obrigatório');
    }

    $cityId = (int)($payload['departure_city_id'] ?? 0);
    $attrId = (int)($payload['attraction_id'] ?? 0);
    $pricing = gcv_pricing_administrative(
        $priceCents,
        $guidePayout,
        $guideUserId,
        isset($payload['category_key']) ? (string)$payload['category_key'] : null,
        $cityId > 0 ? $cityId : null,
        null
    );

    $status = (string)($payload['status'] ?? 'published');
    if (!in_array($status, ['draft', 'published', 'soldout'], true)) {
        $status = 'published';
    }

    $pdo = db();
    $quorum = gcv_clamp_quorum($payload['quorum'] ?? 4);
    $maxPeople = gcv_clamp_max_people($payload['max_people'] ?? 10);
    $preconfirmed = gcv_clamp_preconfirmed(
        $payload['preconfirmed_people'] ?? 0,
        $maxPeople,
        (int)($payload['booked_people'] ?? 0)
    );
    $stmt = $pdo->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, preconfirmed_people, include_transport, include_entry, include_lunch,
          notes_pt, notes_en, notes_es, cart_slug, created_by, updated_by,
          business_mode, created_by_origin, guide_net_cents, commission_rule_id, commission_pct_applied,
          commission_cents, price_before_round_cents, rounding_diff_cents, platform_margin_cents,
          guide_payout_planned_cents, approved_at, approved_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?)'
    );

    $stmt->execute([
        $status,
        $payload['date_iso'],
        $payload['departure_time'],
        $cityId,
        $attrId,
        $guideUserId,
        $pricing['final_price_cents'],
        $quorum,
        $maxPeople,
        (int)($payload['booked_people'] ?? 0),
        $preconfirmed,
        !empty($payload['include_transport']) ? 1 : 0,
        !empty($payload['include_entry']) ? 1 : 0,
        !empty($payload['include_lunch']) ? 1 : 0,
        $payload['notes_pt'] ?? null,
        $payload['notes_en'] ?? null,
        $payload['notes_es'] ?? null,
        !empty($payload['cart_slug']) ? (string)$payload['cart_slug'] : null,
        $adminUserId,
        $adminUserId,
        GcvBusinessMode::ADMINISTRATIVE,
        $origin,
        $pricing['guide_payout_planned_cents'],
        $pricing['commission_rule_id'],
        $pricing['commission_pct'],
        $pricing['platform_margin_cents'],
        $pricing['final_price_cents'],
        0,
        $pricing['platform_margin_cents'],
        $pricing['guide_payout_planned_cents'],
        $adminUserId,
    ]);

    $id = (int)$pdo->lastInsertId();
    gcv_audit_log('excursion', $id, 'create_administrative', $adminUserId, null, null, [
        'business_mode' => GcvBusinessMode::ADMINISTRATIVE,
        'created_by_origin' => $origin,
        'price_cents' => $pricing['final_price_cents'],
        'guide_payout_planned_cents' => $pricing['guide_payout_planned_cents'],
        'platform_margin_cents' => $pricing['platform_margin_cents'],
    ], $origin);

    return gcv_publish_load_excursion($id);
}

/**
 * Publicação pelo guia (BusinessMode = GUIDE_MARKETPLACE).
 * Sempre entra em pending_approval — nunca publica sozinho.
 * Só o admin publica (Aprovar / Editar e Aprovar).
 *
 * @param array<string,mixed> $payload
 * @return array<string,mixed>
 */
function gcv_publish_guide_marketplace(array $payload, int $guideUserId): array
{
    gcv_marketplace_ensure_schema();

    $guideNet = isset($payload['guide_net_cents'])
        ? (int)$payload['guide_net_cents']
        : (int)round(((float)($payload['guide_net'] ?? 0)) * 100);

    $rangeErr = gcv_guide_net_range_error($guideNet);
    if ($rangeErr !== null) {
        throw new InvalidArgumentException($rangeErr);
    }

    $cityId = (int)($payload['departure_city_id'] ?? 0);
    $attrId = (int)($payload['attraction_id'] ?? 0);
    $categoryKey = isset($payload['category_key']) ? (string)$payload['category_key'] : null;

    $pricing = gcv_pricing_from_guide_net($guideNet, null, $guideUserId, $categoryKey, $cityId > 0 ? $cityId : null);

    $pdo = db();
    $quorum = gcv_clamp_quorum($payload['quorum'] ?? 4);
    $maxPeople = gcv_clamp_max_people($payload['max_people'] ?? 10);
    $preconfirmed = gcv_clamp_preconfirmed($payload['preconfirmed_people'] ?? 0, $maxPeople, 0);
    $stmt = $pdo->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, preconfirmed_people, include_transport, include_entry, include_lunch,
          notes_pt, created_by, updated_by,
          business_mode, created_by_origin, guide_net_cents, commission_rule_id, commission_pct_applied,
          commission_cents, price_before_round_cents, rounding_diff_cents, platform_margin_cents,
          guide_payout_planned_cents
        ) VALUES (\'pending_approval\',?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $payload['date_iso'],
        $payload['departure_time'],
        $cityId,
        $attrId,
        $guideUserId,
        $pricing['final_price_cents'],
        $quorum,
        $maxPeople,
        $preconfirmed,
        !empty($payload['include_transport']) ? 1 : 0,
        !empty($payload['include_entry']) ? 1 : 0,
        !empty($payload['include_lunch']) ? 1 : 0,
        $payload['notes_pt'] ?? null,
        $guideUserId,
        $guideUserId,
        GcvBusinessMode::GUIDE_MARKETPLACE,
        GcvCreatedBy::GUIDE,
        $pricing['guide_net_cents'],
        $pricing['commission_rule_id'],
        $pricing['commission_pct'],
        $pricing['commission_cents'],
        $pricing['price_before_round_cents'],
        $pricing['rounding_diff_cents'],
        $pricing['commission_cents'],
        $pricing['guide_net_cents'],
    ]);

    $id = (int)$pdo->lastInsertId();
    $verify = $pdo->prepare('SELECT status FROM gcv_excursions WHERE id = ?');
    $verify->execute([$id]);
    $st = (string)$verify->fetchColumn();
    if ($st !== 'pending_approval') {
        gcv_marketplace_ensure_schema();
        try {
            $pdo->prepare(
                "UPDATE gcv_excursions SET status='pending_approval', approved_at=NULL, approved_by=NULL WHERE id=?"
            )->execute([$id]);
            $verify->execute([$id]);
            $st = (string)$verify->fetchColumn();
        } catch (Throwable $e) {
            $st = '';
        }
        if ($st !== 'pending_approval') {
            $pdo->prepare("UPDATE gcv_excursions SET status='draft' WHERE id=?")->execute([$id]);
            throw new RuntimeException('Não foi possível enfileirar o passeio para aprovação do admin.');
        }
    }
    if (!function_exists('gcv_excursion_save_meeting_point')) {
        require_once __DIR__ . '/../meeting_point.php';
    }
    $meetingPoint = trim((string)($payload['meeting_point'] ?? ''));
    if ($meetingPoint !== '') {
        gcv_excursion_save_meeting_point(
            $id,
            $meetingPoint,
            isset($payload['meeting_point_place_id']) ? (string)$payload['meeting_point_place_id'] : null,
            $payload['meeting_point_lat'] ?? null,
            $payload['meeting_point_lng'] ?? null
        );
    }
    gcv_audit_log('excursion', $id, 'create_guide_marketplace', $guideUserId, null, null, $pricing, GcvCreatedBy::GUIDE);

    gcv_publish_notify_pending_approval($id);

    $row = gcv_publish_load_excursion($id);
    $row['pricing'] = $pricing;
    return $row;
}

/**
 * Ações admin: approve | reject | request_changes | edit_and_approve
 *
 * @param array<string,mixed> $body
 * @return array<string,mixed>
 */
function gcv_publish_admin_decision(int $excursionId, string $action, array $body, int $adminId): array
{
    gcv_marketplace_ensure_schema();
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM gcv_excursions WHERE id = ? AND deleted_at IS NULL');
    $stmt->execute([$excursionId]);
    $ex = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ex) {
        throw new RuntimeException('Excursão não encontrada');
    }

    $action = strtolower(trim($action));
    $before = $ex;

    if ($action === 'approve') {
        $pdo->prepare(
            "UPDATE gcv_excursions SET status='published', approved_at=NOW(), approved_by=?, rejection_reason=NULL, updated_by=? WHERE id=?"
        )->execute([$adminId, $adminId, $excursionId]);
        gcv_audit_log('excursion', $excursionId, 'approve', $adminId, 'status', $before['status'], 'published', GcvCreatedBy::ADMIN);
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_approved($excursionId);
            $after = $pdo->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
            $after->execute([$excursionId]);
            $afterRow = $after->fetch(PDO::FETCH_ASSOC) ?: [];
            if ($afterRow && gcv_resolve_excursion_lifecycle($afterRow) === 'confirmada') {
                gcv_ops_notify_guide_confirmed($excursionId);
            }
        } catch (Throwable $e) {
            error_log('notify approve: ' . $e->getMessage());
        }
    } elseif ($action === 'reject') {
        $reason = trim((string)($body['rejection_reason'] ?? $body['reason'] ?? ''));
        if ($reason === '') {
            throw new InvalidArgumentException('Motivo da rejeição obrigatório');
        }
        $pdo->prepare(
            "UPDATE gcv_excursions SET status='rejected', rejection_reason=?, approved_at=NULL, approved_by=NULL, updated_by=? WHERE id=?"
        )->execute([$reason, $adminId, $excursionId]);
        gcv_audit_log('excursion', $excursionId, 'reject', $adminId, 'status', $before['status'], 'rejected', GcvCreatedBy::ADMIN, ['reason' => $reason]);
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_rejected($excursionId, $reason);
        } catch (Throwable $e) {
            error_log('notify reject: ' . $e->getMessage());
        }
    } elseif ($action === 'request_changes') {
        $note = trim((string)($body['approval_note'] ?? $body['note'] ?? ''));
        if ($note === '') {
            throw new InvalidArgumentException('Nota de alteração obrigatória');
        }
        $pdo->prepare(
            "UPDATE gcv_excursions SET status='draft', approval_note=?, updated_by=? WHERE id=?"
        )->execute([$note, $adminId, $excursionId]);
        gcv_audit_log('excursion', $excursionId, 'request_changes', $adminId, 'status', $before['status'], 'draft', GcvCreatedBy::ADMIN, ['note' => $note]);
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_needs_changes($excursionId, $note);
        } catch (Throwable $e) {
            error_log('notify changes: ' . $e->getMessage());
        }
    } elseif ($action === 'edit_and_approve') {
        $fields = [];
        $params = [];
        $editable = [
            'date_iso', 'departure_time', 'departure_city_id', 'attraction_id', 'guide_user_id',
            'price_cents', 'quorum', 'max_people', 'preconfirmed_people', 'notes_pt', 'notes_en', 'notes_es',
            'guide_net_cents', 'guide_payout_planned_cents', 'platform_margin_cents',
            'include_transport', 'include_entry', 'include_lunch',
        ];
        foreach ($editable as $f) {
            if (!array_key_exists($f, $body)) {
                continue;
            }
            $val = $body[$f];
            if ($f === 'preconfirmed_people') {
                $maxP = gcv_clamp_max_people($body['max_people'] ?? $ex['max_people'] ?? 10);
                $val = gcv_clamp_preconfirmed($val, $maxP, (int)($ex['booked_people'] ?? 0));
            }
            $fields[] = "`{$f}`=?";
            $params[] = $val;
        }

        // Se admin informou guide_net e modo marketplace, recalcula preço
        if (
            ($ex['business_mode'] ?? '') === GcvBusinessMode::GUIDE_MARKETPLACE
            && isset($body['guide_net_cents'])
        ) {
            $pricing = gcv_pricing_from_guide_net(
                (int)$body['guide_net_cents'],
                $excursionId,
                (int)($body['guide_user_id'] ?? $ex['guide_user_id']),
                null,
                (int)($body['departure_city_id'] ?? $ex['departure_city_id'])
            );
            $map = [
                'price_cents' => $pricing['final_price_cents'],
                'guide_net_cents' => $pricing['guide_net_cents'],
                'commission_rule_id' => $pricing['commission_rule_id'],
                'commission_pct_applied' => $pricing['commission_pct'],
                'commission_cents' => $pricing['commission_cents'],
                'price_before_round_cents' => $pricing['price_before_round_cents'],
                'rounding_diff_cents' => $pricing['rounding_diff_cents'],
                'platform_margin_cents' => $pricing['commission_cents'],
                'guide_payout_planned_cents' => $pricing['guide_net_cents'],
            ];
            foreach ($map as $k => $v) {
                $fields[] = "`{$k}`=?";
                $params[] = $v;
            }
        } elseif (isset($body['price_cents'], $body['guide_payout_planned_cents'])) {
            $adminPricing = gcv_pricing_administrative(
                (int)$body['price_cents'],
                (int)$body['guide_payout_planned_cents'],
                (int)($body['guide_user_id'] ?? $ex['guide_user_id']),
                null,
                (int)($body['departure_city_id'] ?? $ex['departure_city_id']),
                $excursionId
            );
            foreach ([
                'price_cents' => $adminPricing['final_price_cents'],
                'guide_payout_planned_cents' => $adminPricing['guide_payout_planned_cents'],
                'platform_margin_cents' => $adminPricing['platform_margin_cents'],
                'commission_pct_applied' => $adminPricing['commission_pct'],
                'commission_rule_id' => $adminPricing['commission_rule_id'],
            ] as $k => $v) {
                $fields[] = "`{$k}`=?";
                $params[] = $v;
            }
        }

        $fields[] = "status='published'";
        $fields[] = 'approved_at=NOW()';
        $fields[] = 'approved_by=?';
        $params[] = $adminId;
        $fields[] = 'rejection_reason=NULL';
        $fields[] = 'updated_by=?';
        $params[] = $adminId;
        $params[] = $excursionId;

        $sql = 'UPDATE gcv_excursions SET ' . implode(', ', $fields) . ' WHERE id=?';
        $pdo->prepare($sql)->execute($params);

        $after = gcv_publish_load_excursion($excursionId);
        gcv_audit_diff('excursion', $excursionId, $before, $after, $adminId, GcvCreatedBy::ADMIN);
        gcv_audit_log('excursion', $excursionId, 'edit_and_approve', $adminId, 'status', $before['status'], 'published', GcvCreatedBy::ADMIN);
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_approved($excursionId);
            if (gcv_resolve_excursion_lifecycle($after) === 'confirmada') {
                gcv_ops_notify_guide_confirmed($excursionId);
            }
        } catch (Throwable $e) {
            error_log('notify edit_and_approve: ' . $e->getMessage());
        }
        return $after;
    } else {
        throw new InvalidArgumentException('Ação inválida');
    }

    return gcv_publish_load_excursion($excursionId);
}

function gcv_publish_notify_pending_approval(int $excursionId): void
{
    try {
        require_once dirname(__DIR__) . '/notify_ops.php';
        gcv_ops_notify_guide_pending_approval($excursionId);
    } catch (Throwable $e) {
        error_log('pending approval whatsapp: ' . $e->getMessage());
    }

    $row = gcv_publish_load_excursion($excursionId);
    $to = 'diegonavi82@gmail.com';
    $title = (string)($row['attraction_title'] ?? ('Excursão #' . $excursionId));
    $price = number_format(((int)($row['price_cents'] ?? 0)) / 100, 2, ',', '.');
    $net = number_format(((int)($row['guide_net_cents'] ?? 0)) / 100, 2, ',', '.');
    $guide = (string)($row['guide_name'] ?? ('#' . ($row['guide_user_id'] ?? '')));
    $date = (string)($row['date_iso'] ?? '');
    $html = '<p>Há uma excursão aguardando aprovação no marketplace.</p>'
        . '<ul>'
        . '<li><strong>ID:</strong> ' . (int)$excursionId . '</li>'
        . '<li><strong>Passeio:</strong> ' . htmlspecialchars($title) . '</li>'
        . '<li><strong>Guia:</strong> ' . htmlspecialchars($guide) . '</li>'
        . '<li><strong>Data:</strong> ' . htmlspecialchars($date) . '</li>'
        . '<li><strong>Valor líquido guia:</strong> R$ ' . $net . '</li>'
        . '<li><strong>Preço final publicado:</strong> R$ ' . $price . '</li>'
        . '<li><strong>BusinessMode:</strong> GUIDE_MARKETPLACE</li>'
        . '</ul>'
        . '<p>Acesse o painel Admin → Aprovações de Excursões.</p>';

    try {
        send_mail($to, '[GCV] Excursão aguardando aprovação #' . $excursionId, $html, 'Diego');
    } catch (Throwable $e) {
        error_log('pending approval mail: ' . $e->getMessage());
    }
}

/** @return array<string,mixed> */
function gcv_publish_load_excursion(int $id): array
{
    $stmt = db()->prepare(
        'SELECT e.*, a.title_pt AS attraction_title, a.slug AS attraction_slug,
                c.name AS departure_city_name, u.name AS guide_name, u.email AS guide_email
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: [];
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_publish_list_pending(): array
{
    gcv_marketplace_ensure_schema();
    return db()->query(
        "SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name,
                u.name AS guide_name, u.email AS guide_email
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.status = 'pending_approval' AND e.deleted_at IS NULL
         ORDER BY e.created_at ASC"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
}
