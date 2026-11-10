<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
gcv_cms_ensure_regions(db());
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/** @return array{0:?int,1:?string} */
function gcv_city_region_pair(PDO $pdo, array $body): array
{
    $id = (int)($body['region_id'] ?? 0);
    if ($id > 0) {
        $stmt = $pdo->prepare("SELECT id, name FROM gcv_regions WHERE id = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            return [(int)$row['id'], (string)$row['name']];
        }
    }
    $name = trim((string)($body['region'] ?? ''));
    if ($name === '') {
        return [null, null];
    }
    if (function_exists('mb_substr')) {
        $name = mb_substr($name, 0, 160);
    } else {
        $name = substr($name, 0, 160);
    }
    $stmt = $pdo->prepare("SELECT id, name FROM gcv_regions WHERE status = 'active' AND name = ? LIMIT 1");
    $stmt->execute([$name]);
    $row = $stmt->fetch();
    if ($row) {
        return [(int)$row['id'], (string)$row['name']];
    }
    return [null, $name];
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = db()->prepare('SELECT * FROM gcv_cities WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Cidade não encontrada']);
            exit;
        }
        echo json_encode(['ok' => true, 'data' => $row]);
        exit;
    }
    $q = trim((string)($_GET['q'] ?? ''));
    $sql = 'SELECT * FROM gcv_cities WHERE status = "active"';
    $params = [];
    if ($q !== '') {
        $sql .= ' AND (name LIKE ? OR formatted_address LIKE ?)';
        $like = '%' . $q . '%';
        $params = [$like, $like];
    }
    $sql .= ' ORDER BY name ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $cities = $stmt->fetchAll();
    $regions = db()->query(
        "SELECT id, name, sort_order FROM gcv_regions WHERE status = 'active' ORDER BY sort_order ASC, name ASC"
    )->fetchAll();
    $byId = [];
    foreach ($regions as $region) {
        $byId[(int)$region['id']] = (string)$region['name'];
    }
    foreach ($cities as &$city) {
        $rid = (int)($city['region_id'] ?? 0);
        if ($rid > 0 && isset($byId[$rid])) {
            $city['region'] = $byId[$rid];
        }
    }
    unset($city);
    echo json_encode(['ok' => true, 'data' => ['cities' => $cities, 'regions' => $regions]]);
    exit;
}

$body = gcv_cms_json_body();

if ($method === 'POST') {
    $name = trim((string)($body['name'] ?? ''));
    if ($name === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nome da cidade obrigatório']);
        exit;
    }
    [$regionId, $regionName] = gcv_city_region_pair(db(), $body);
    $stmt = db()->prepare(
        'INSERT INTO gcv_cities (name, state, state_code, country, country_code, region, region_id, place_id, formatted_address, lat, lng, is_base, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $name,
        trim((string)($body['state'] ?? 'Goiás')) ?: 'Goiás',
        strtoupper(substr(trim((string)($body['state_code'] ?? 'GO')), 0, 2)) ?: 'GO',
        trim((string)($body['country'] ?? 'Brasil')) ?: 'Brasil',
        strtoupper(substr(trim((string)($body['country_code'] ?? 'BR')), 0, 2)) ?: 'BR',
        $regionName,
        $regionId,
        ($body['place_id'] ?? null) ?: null,
        ($body['formatted_address'] ?? null) ?: $name,
        isset($body['lat']) && $body['lat'] !== '' ? (float)$body['lat'] : null,
        isset($body['lng']) && $body['lng'] !== '' ? (float)$body['lng'] : null,
        !empty($body['is_base']) ? 1 : 1,
        'active',
    ]);
    $id = (int)db()->lastInsertId();
    $stmt = db()->prepare('SELECT * FROM gcv_cities WHERE id = ?');
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
    [$regionId, $regionName] = gcv_city_region_pair(db(), $body);
    $stmt = db()->prepare(
        'UPDATE gcv_cities SET name=?, state=?, state_code=?, country=?, country_code=?, region=?, region_id=?, place_id=?, formatted_address=?, lat=?, lng=?, is_base=?, status=? WHERE id=?'
    );
    $stmt->execute([
        trim((string)($body['name'] ?? '')),
        trim((string)($body['state'] ?? 'Goiás')),
        strtoupper(substr(trim((string)($body['state_code'] ?? 'GO')), 0, 2)),
        trim((string)($body['country'] ?? 'Brasil')),
        strtoupper(substr(trim((string)($body['country_code'] ?? 'BR')), 0, 2)),
        $regionName,
        $regionId,
        ($body['place_id'] ?? null) ?: null,
        ($body['formatted_address'] ?? null) ?: null,
        isset($body['lat']) && $body['lat'] !== '' ? (float)$body['lat'] : null,
        isset($body['lng']) && $body['lng'] !== '' ? (float)$body['lng'] : null,
        !empty($body['is_base']) ? 1 : 0,
        in_array(($body['status'] ?? 'active'), ['active', 'archived'], true) ? $body['status'] : 'active',
        $id,
    ]);
    $stmt = db()->prepare('SELECT * FROM gcv_cities WHERE id = ?');
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
    db()->prepare('UPDATE gcv_cities SET status="archived" WHERE id=?')->execute([$id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
