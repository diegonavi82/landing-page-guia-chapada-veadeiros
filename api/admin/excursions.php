<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_excursion_validate(array $body, bool $creating): ?string
{
    if ($creating || array_key_exists('date_iso', $body)) {
        if (empty($body['date_iso'])) return 'Data obrigatória';
    }
    if ($creating || array_key_exists('departure_time', $body)) {
        if (empty($body['departure_time'])) return 'Hora obrigatória';
    }
    if ($creating || array_key_exists('departure_city_id', $body)) {
        if (empty($body['departure_city_id'])) return 'Cidade de saída obrigatória';
    }
    if ($creating || array_key_exists('attraction_id', $body)) {
        if (empty($body['attraction_id'])) return 'Atrativo obrigatório';
    }
    if ($creating || array_key_exists('price_cents', $body)) {
        if (!isset($body['price_cents']) || (int)$body['price_cents'] <= 0) return 'Valor por pessoa obrigatório';
    }
    if ($creating || array_key_exists('quorum', $body)) {
        $q = (int)($body['quorum'] ?? 0);
        if ($q < 4) return 'Quorum mínimo é 4 pessoas';
    }
    if ($creating || array_key_exists('max_people', $body)) {
        if (!isset($body['max_people']) || (int)$body['max_people'] <= 0) return 'Máximo de pessoas obrigatório';
    }
    return null;
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

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = db()->prepare(
            'SELECT e.*, a.title_pt AS attraction_title, a.slug AS attraction_slug,
                    c.name AS departure_city_name, u.name AS guide_name
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
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
        echo json_encode(['ok' => true, 'data' => $row]);
        exit;
    }
    $rows = db()->query(
        'SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.quorum, e.max_people, e.booked_people,
                e.guide_user_id, a.title_pt AS attraction_title, c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         ORDER BY e.date_iso ASC, e.departure_time ASC'
    )->fetchAll();
    echo json_encode(['ok' => true, 'data' => ['excursions' => $rows]]);
    exit;
}

$body = gcv_cms_json_body();

if ($method === 'POST') {
    $err = gcv_excursion_validate($body, true);
    if ($err) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $err]);
        exit;
    }
    $status = (string)($body['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'published', 'cancelled', 'soldout'], true)) $status = 'draft';
    $guideErr = gcv_excursion_require_guide_if_published(array_merge($body, ['status' => $status]));
    if ($guideErr) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $guideErr]);
        exit;
    }
    $quorum = max(4, (int)$body['quorum']);
    $stmt = db()->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, include_transport, include_entry, include_lunch,
          notes_pt, notes_en, notes_es, cart_slug, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $status,
        $body['date_iso'],
        $body['departure_time'],
        (int)$body['departure_city_id'],
        (int)$body['attraction_id'],
        !empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null,
        (int)$body['price_cents'],
        $quorum,
        (int)$body['max_people'],
        (int)($body['booked_people'] ?? 0),
        !empty($body['include_transport']) ? 1 : 0,
        !empty($body['include_entry']) ? 1 : 0,
        !empty($body['include_lunch']) ? 1 : 0,
        ($body['notes_pt'] ?? null),
        ($body['notes_en'] ?? null),
        ($body['notes_es'] ?? null),
        !empty($body['cart_slug']) ? (string)$body['cart_slug'] : null,
        (int)$admin['id'],
        (int)$admin['id'],
    ]);
    $id = (int)db()->lastInsertId();
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true, 'data' => $stmt->fetch()]);
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
    if (!in_array($status, ['draft', 'published', 'cancelled', 'soldout'], true)) $status = $ex['status'];
    $guideErr = gcv_excursion_require_guide_if_published(array_merge($body, ['status' => $status]), $ex);
    if ($guideErr) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $guideErr]);
        exit;
    }
    $quorum = max(4, (int)($body['quorum'] ?? $ex['quorum']));
    $stmt = db()->prepare(
        'UPDATE gcv_excursions SET
          status=?, date_iso=?, departure_time=?, departure_city_id=?, attraction_id=?, guide_user_id=?,
          price_cents=?, quorum=?, max_people=?, booked_people=?, include_transport=?, include_entry=?, include_lunch=?,
          notes_pt=?, notes_en=?, notes_es=?, cart_slug=?, updated_by=?
         WHERE id=?'
    );
    $stmt->execute([
        $status,
        $body['date_iso'] ?? $ex['date_iso'],
        $body['departure_time'] ?? $ex['departure_time'],
        (int)($body['departure_city_id'] ?? $ex['departure_city_id']),
        (int)($body['attraction_id'] ?? $ex['attraction_id']),
        array_key_exists('guide_user_id', $body)
            ? (!empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null)
            : $ex['guide_user_id'],
        (int)($body['price_cents'] ?? $ex['price_cents']),
        $quorum,
        (int)($body['max_people'] ?? $ex['max_people']),
        (int)($body['booked_people'] ?? $ex['booked_people']),
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
        $id,
    ]);
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true, 'data' => $stmt->fetch()]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    db()->prepare('UPDATE gcv_excursions SET status="cancelled", updated_by=? WHERE id=?')->execute([(int)$admin['id'], $id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
