<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';
require_once __DIR__ . '/../helpers/marketplace/pricing_service.php';
require_once __DIR__ . '/../helpers/marketplace/audit_service.php';
require_once __DIR__ . '/../helpers/meeting_point.php';
require_once __DIR__ . '/../helpers/google_places.php';
require_once __DIR__ . '/../helpers/notify_ops.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
gcv_marketplace_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_excursion_validate(array $body, bool $creating): ?string
{
    if ($creating || array_key_exists('date_iso', $body)) {
        if (empty($body['date_iso'])) return 'Data obrigatória';
    }
    if ($creating || array_key_exists('departure_time', $body)) {
        if (empty($body['departure_time'])) return 'Hora obrigatória (minutos 00, 10, 20, 30, 40 ou 50)';
    }
    if ($creating || array_key_exists('departure_city_id', $body)) {
        if (empty($body['departure_city_id'])) return 'Cidade de saída obrigatória';
    }
    if ($creating || array_key_exists('meeting_point', $body)) {
        $mp = gcv_meeting_point_from_body($body, true);
        if (isset($mp['error'])) return $mp['error'];
    }
    if ($creating || array_key_exists('attraction_ids', $body) || array_key_exists('attraction_id', $body)) {
        $ids = gcv_excursion_normalize_attraction_ids($body);
        $attrErr = gcv_excursion_validate_attraction_ids($ids);
        if ($attrErr) return $attrErr;
    } elseif ($creating) {
        return 'Selecione pelo menos 1 atrativo';
    }
    if ($creating || array_key_exists('price_cents', $body)) {
        if (!isset($body['price_cents']) || (int)$body['price_cents'] <= 0) return 'Valor por pessoa obrigatório';
    }
    if ($creating || array_key_exists('quorum', $body)) {
        $q = (int)($body['quorum'] ?? 0);
        if ($q < 0 || $q > 4) return 'Quórum deve ser entre 0 e 4 pessoas';
    }
    if ($creating || array_key_exists('max_people', $body)) {
        if (!isset($body['max_people']) || (int)$body['max_people'] < 1) return 'Máximo de pessoas obrigatório';
        if ((int)$body['max_people'] > 12) return 'Máximo de pessoas é 12';
    }
    if ($creating || array_key_exists('preconfirmed_people', $body)) {
        $pre = (int)($body['preconfirmed_people'] ?? 0);
        if ($pre < 0 || $pre > 5) return 'Pessoas confirmadas deve ser entre 0 e 5';
    }
    return null;
}

function gcv_admin_notify_guide_published(int $id, string $status): void
{
    if (!in_array($status, ['published', 'soldout'], true) || $id <= 0) {
        return;
    }
    try {
        gcv_ops_notify_guide_approved($id);
    } catch (Throwable $e) {
        error_log('notify guide published: ' . $e->getMessage());
    }
}

function gcv_excursion_require_guide_if_published(array $body, ?array $existing = null): ?string
{
    $status = (string)($body['status'] ?? ($existing['status'] ?? 'draft'));
    if ($status !== 'published' && $status !== 'soldout') {
        return null;
    }
    $guideId = array_key_exists('guide_user_id', $body)
        ? $body['guide_user_id']
        : ($existing['guide_user_id'] ?? null);
    if (empty($guideId)) {
        return 'Guia obrigatório para publicar a excursão';
    }
    return null;
}

function gcv_excursion_enrich(array $row): array
{
    $id = (int)$row['id'];
    $attrs = gcv_excursion_load_attractions($id);
    $row['attractions'] = $attrs;
    $row['attraction_ids'] = array_map(static fn($a) => (int)$a['id'], $attrs);
    $row['attraction_title'] = gcv_excursion_titles_joined($attrs, 'pt');
    if (!empty($attrs[0])) {
        $row['attraction_id'] = (int)$attrs[0]['id'];
        $row['attraction_slug'] = $attrs[0]['slug'] ?? ($row['attraction_slug'] ?? null);
    }
    return $row;
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = db()->prepare(
            'SELECT e.*, c.name AS departure_city_name, u.name AS guide_name
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_users u ON u.id = e.guide_user_id
             WHERE e.id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Excursão não encontrada']);
            exit;
        }
        echo json_encode(['ok' => true, 'data' => gcv_excursion_enrich($row)]);
        exit;
    }
    $rows = db()->query(
        'SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.quorum, e.max_people, e.booked_people,
                e.preconfirmed_people,
                e.guide_user_id, e.attraction_id, e.business_mode, e.created_by_origin, e.guide_net_cents,
                e.guide_payout_planned_cents, e.platform_margin_cents, e.commission_pct_applied,
                c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.deleted_at IS NULL
         ORDER BY e.date_iso ASC, e.departure_time ASC'
    )->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $out[] = gcv_excursion_enrich($row);
    }
    echo json_encode(['ok' => true, 'data' => ['excursions' => $out]]);
    exit;
}

$body = gcv_cms_json_body();
if (isset($body['departure_time'])) {
    $body['departure_time'] = gcv_normalize_departure_time((string)$body['departure_time']);
}

if ($method === 'POST') {
    $err = gcv_excursion_validate($body, true);
    if ($err) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $err]);
        exit;
    }
    $attrIds = gcv_excursion_normalize_attraction_ids($body);
    $status = (string)($body['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'published', 'cancelled', 'soldout', 'pending_approval', 'rejected'], true)) {
        $status = 'draft';
    }
    $guideErr = gcv_excursion_require_guide_if_published(array_merge($body, ['status' => $status]));
    if ($guideErr) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $guideErr]);
        exit;
    }

    $createdByOrigin = GcvCreatedBy::normalize(
        (string)($body['created_by_origin'] ?? $body['CreatedBy'] ?? GcvCreatedBy::ADMIN),
        GcvCreatedBy::ADMIN
    );
    // Admin CMS sempre opera em modo administrativo (regras financeiras)
    $businessMode = GcvBusinessMode::ADMINISTRATIVE;
    $guidePayout = isset($body['guide_payout_planned_cents'])
        ? (int)$body['guide_payout_planned_cents']
        : (isset($body['guide_net_cents']) ? (int)$body['guide_net_cents'] : 0);
    if ($status === 'published' && $guidePayout < 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Informe o valor previsto de repasse ao guia']);
        exit;
    }

    $pricing = null;
    try {
        if ((int)$body['price_cents'] > 0) {
            $pricing = gcv_pricing_administrative(
                (int)$body['price_cents'],
                max(0, $guidePayout),
                !empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null,
                isset($body['category_key']) ? (string)$body['category_key'] : null,
                (int)$body['departure_city_id'],
                null
            );
        }
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }

    $quorum = (int)$body['quorum'];
    if ($quorum < 0) {
        $quorum = 0;
    }
    if ($quorum > 4) {
        $quorum = 4;
    }
    $maxPeople = min(12, max(1, (int)$body['max_people']));
    $bookedPeople = 0;
    $preconfirmed = gcv_clamp_preconfirmed($body['preconfirmed_people'] ?? 0, $maxPeople, $bookedPeople);
    $stmt = db()->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, preconfirmed_people, include_transport, include_entry, include_lunch,
          notes_pt, notes_en, notes_es, cart_slug, created_by, updated_by,
          business_mode, created_by_origin, guide_net_cents, commission_rule_id, commission_pct_applied,
          commission_cents, price_before_round_cents, rounding_diff_cents, platform_margin_cents,
          guide_payout_planned_cents, approved_at, approved_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $status,
        $body['date_iso'],
        $body['departure_time'],
        (int)$body['departure_city_id'],
        $attrIds[0],
        !empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null,
        (int)$body['price_cents'],
        $quorum,
        $maxPeople,
        $bookedPeople,
        $preconfirmed,
        !empty($body['include_transport']) ? 1 : 0,
        !empty($body['include_entry']) ? 1 : 0,
        !empty($body['include_lunch']) ? 1 : 0,
        ($body['notes_pt'] ?? null),
        ($body['notes_en'] ?? null),
        ($body['notes_es'] ?? null),
        !empty($body['cart_slug']) ? (string)$body['cart_slug'] : null,
        (int)$admin['id'],
        (int)$admin['id'],
        $businessMode,
        $createdByOrigin,
        $pricing ? $pricing['guide_payout_planned_cents'] : $guidePayout,
        $pricing['commission_rule_id'] ?? null,
        $pricing['commission_pct'] ?? null,
        $pricing['platform_margin_cents'] ?? null,
        (int)$body['price_cents'],
        0,
        $pricing['platform_margin_cents'] ?? max(0, (int)$body['price_cents'] - $guidePayout),
        $pricing ? $pricing['guide_payout_planned_cents'] : $guidePayout,
        $status === 'published' ? date('Y-m-d H:i:s') : null,
        $status === 'published' ? (int)$admin['id'] : null,
    ]);
    $id = (int)db()->lastInsertId();
    $mp = gcv_meeting_point_from_body($body, false);
    if (!isset($mp['error']) && ($mp['point'] ?? '') !== '') {
        gcv_excursion_save_meeting_point(
            $id,
            (string)$mp['point'],
            $mp['place_id'] ?? null,
            $mp['lat'] ?? null,
            $mp['lng'] ?? null
        );
    }
    try {
        gcv_excursion_save_attractions($id, $attrIds);
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }
    gcv_audit_log('excursion', $id, 'admin_create', (int)$admin['id'], null, null, [
        'business_mode' => $businessMode,
        'created_by_origin' => $createdByOrigin,
        'price_cents' => (int)$body['price_cents'],
        'guide_payout_planned_cents' => $guidePayout,
    ], $createdByOrigin);
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    $created = $stmt->fetch();
    gcv_admin_notify_guide_published($id, $status);
    echo json_encode(['ok' => true, 'data' => gcv_excursion_enrich($created)]);
    exit;
}

if ($method === 'PUT') {
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    $err = gcv_excursion_validate($body, false);
    if ($err) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $err]);
        exit;
    }
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    $ex = $stmt->fetch();
    if (!$ex) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Excursão não encontrada']);
        exit;
    }
    $status = (string)($body['status'] ?? $ex['status']);
    if (!in_array($status, ['draft', 'published', 'cancelled', 'soldout', 'pending_approval', 'rejected'], true)) {
        $status = $ex['status'];
    }
    $guideErr = gcv_excursion_require_guide_if_published(array_merge($body, ['status' => $status]), $ex);
    if ($guideErr) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $guideErr]);
        exit;
    }

    $hasAttrPayload = array_key_exists('attraction_ids', $body) || array_key_exists('attraction_id', $body);
    $attrIds = $hasAttrPayload
        ? gcv_excursion_normalize_attraction_ids($body)
        : array_map(static fn($a) => (int)$a['id'], gcv_excursion_load_attractions($id));
    if ($attrIds === []) {
        $attrIds = [(int)$ex['attraction_id']];
    }

    $priceCents = (int)($body['price_cents'] ?? $ex['price_cents']);
    $guidePayout = array_key_exists('guide_payout_planned_cents', $body)
        ? (int)$body['guide_payout_planned_cents']
        : (int)($ex['guide_payout_planned_cents'] ?? $ex['guide_net_cents'] ?? 0);
    $margin = max(0, $priceCents - $guidePayout);

    $quorum = (int)($body['quorum'] ?? $ex['quorum']);
    if ($quorum < 0) {
        $quorum = 0;
    }
    if ($quorum > 4) {
        $quorum = 4;
    }
    $maxPeople = min(12, max(1, (int)($body['max_people'] ?? $ex['max_people'])));
    $bookedPeople = (int)($ex['booked_people'] ?? 0);
    $preconfirmed = gcv_clamp_preconfirmed(
        $body['preconfirmed_people'] ?? ($ex['preconfirmed_people'] ?? 0),
        $maxPeople,
        $bookedPeople
    );
    $approvedAt = $ex['approved_at'] ?? null;
    $approvedBy = $ex['approved_by'] ?? null;
    $justPublished = false;
    $justRejected = false;
    if (in_array($status, ['published', 'soldout'], true) && empty($approvedAt)) {
        $approvedAt = date('Y-m-d H:i:s');
        $approvedBy = (int)$admin['id'];
        $justPublished = true;
    }
    if ($status === 'rejected' && (string)($ex['status'] ?? '') !== 'rejected') {
        $justRejected = true;
    }
    $stmt = db()->prepare(
        'UPDATE gcv_excursions SET
          status=?, date_iso=?, departure_time=?, departure_city_id=?, attraction_id=?, guide_user_id=?,
          price_cents=?, quorum=?, max_people=?, booked_people=?, preconfirmed_people=?, include_transport=?, include_entry=?, include_lunch=?,
          notes_pt=?, notes_en=?, notes_es=?, cart_slug=?, updated_by=?,
          guide_payout_planned_cents=?, guide_net_cents=?, platform_margin_cents=?,
          business_mode=COALESCE(business_mode, \'ADMINISTRATIVE\'),
          approved_at=?, approved_by=?
         WHERE id=?'
    );
    $stmt->execute([
        $status,
        $body['date_iso'] ?? $ex['date_iso'],
        $body['departure_time'] ?? $ex['departure_time'],
        (int)($body['departure_city_id'] ?? $ex['departure_city_id']),
        $attrIds[0],
        array_key_exists('guide_user_id', $body)
            ? (!empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null)
            : $ex['guide_user_id'],
        $priceCents,
        $quorum,
        $maxPeople,
        $bookedPeople,
        $preconfirmed,
        array_key_exists('include_transport', $body) ? (!empty($body['include_transport']) ? 1 : 0) : (int)$ex['include_transport'],
        array_key_exists('include_entry', $body) ? (!empty($body['include_entry']) ? 1 : 0) : (int)$ex['include_entry'],
        array_key_exists('include_lunch', $body) ? (!empty($body['include_lunch']) ? 1 : 0) : (int)$ex['include_lunch'],
        array_key_exists('notes_pt', $body) ? $body['notes_pt'] : $ex['notes_pt'],
        array_key_exists('notes_en', $body) ? $body['notes_en'] : $ex['notes_en'],
        array_key_exists('notes_es', $body) ? $body['notes_es'] : $ex['notes_es'],
        array_key_exists('cart_slug', $body)
            ? (!empty($body['cart_slug']) ? (string)$body['cart_slug'] : null)
            : ($ex['cart_slug'] ?? null),
        (int)$admin['id'],
        $guidePayout,
        $guidePayout,
        $margin,
        $approvedAt,
        $approvedBy,
        $id,
    ]);
    if (array_key_exists('meeting_point', $body)) {
        $mp = gcv_meeting_point_from_body($body, true);
        if (isset($mp['error'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $mp['error']]);
            exit;
        }
        gcv_excursion_save_meeting_point(
            $id,
            (string)$mp['point'],
            $mp['place_id'] ?? null,
            $mp['lat'] ?? null,
            $mp['lng'] ?? null
        );
    }
    try {
        gcv_excursion_save_attractions($id, $attrIds);
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    $after = $stmt->fetch();
    gcv_audit_diff('excursion', $id, $ex, $after ?: [], (int)$admin['id'], GcvCreatedBy::ADMIN);
    if ($justPublished) {
        gcv_admin_notify_guide_published($id, $status);
    }
    if ($justRejected) {
        $reason = trim((string)($body['rejection_reason'] ?? $ex['rejection_reason'] ?? ''));
        try {
            gcv_ops_notify_guide_rejected($id, $reason);
        } catch (Throwable $e) {
            error_log('notify guide rejected cms: ' . $e->getMessage());
        }
    }
    echo json_encode(['ok' => true, 'data' => gcv_excursion_enrich($after)]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    // Soft delete — nunca apagar registros financeiros/históricos
    $stmt = db()->prepare(
        "UPDATE gcv_excursions SET status='cancelled', deleted_at=NOW(), updated_by=? WHERE id=? AND deleted_at IS NULL"
    );
    $stmt->execute([(int)$admin['id'], $id]);
    if ($stmt->rowCount() < 1) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Excursão não encontrada']);
        exit;
    }
    gcv_audit_log('excursion', $id, 'soft_delete', (int)$admin['id'], 'deleted_at', null, date('c'), GcvCreatedBy::ADMIN);
    try {
        require_once dirname(__DIR__) . '/helpers/notify_ops.php';
        gcv_ops_notify_tour_cancelled($id, 'admin');
    } catch (Throwable $e) {
        error_log('notify admin tour cancel: ' . $e->getMessage());
    }
    echo json_encode(['ok' => true, 'deleted' => $id, 'soft' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
