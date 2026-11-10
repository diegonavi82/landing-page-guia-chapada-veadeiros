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

function gcv_region_clean_name(string $name): string
{
    $name = trim($name);
    if (function_exists('mb_substr')) {
        return mb_substr($name, 0, 160);
    }
    return substr($name, 0, 160);
}

function gcv_region_fetch(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, status, sort_order FROM gcv_regions WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

if ($method === 'GET') {
    $rows = db()->query(
        "SELECT id, name, sort_order FROM gcv_regions WHERE status = 'active' ORDER BY sort_order ASC, name ASC"
    )->fetchAll();
    echo json_encode(['ok' => true, 'data' => ['regions' => $rows]]);
    exit;
}

$body = gcv_cms_json_body();

if ($method === 'POST' || $method === 'PUT') {
    $name = gcv_region_clean_name((string)($body['name'] ?? ''));
    if ($name === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nome da região obrigatório']);
        exit;
    }
    if (gcv_cms_is_sao_jorge_label($name)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'São Jorge não é uma região. É uma cidade da Chapada dos Veadeiros.']);
        exit;
    }
    $id = (int)($body['id'] ?? 0);
    $dup = db()->prepare(
        "SELECT id, status FROM gcv_regions WHERE name = ? AND id <> ? LIMIT 1"
    );
    $dup->execute([$name, $method === 'PUT' ? $id : 0]);
    $existing = $dup->fetch();

    if ($method === 'POST') {
        if ($existing && ($existing['status'] ?? '') === 'active') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Já existe uma região com esse nome']);
            exit;
        }
        if ($existing) {
            db()->prepare("UPDATE gcv_regions SET name = ?, status = 'active' WHERE id = ?")->execute([$name, (int)$existing['id']]);
            $id = (int)$existing['id'];
        } else {
            db()->prepare('INSERT INTO gcv_regions (name, status, sort_order) VALUES (?, \'active\', 0)')->execute([$name]);
            $id = (int)db()->lastInsertId();
        }
        echo json_encode(['ok' => true, 'data' => gcv_region_fetch(db(), $id)]);
        exit;
    }

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    $current = gcv_region_fetch(db(), $id);
    if (!$current || ($current['status'] ?? '') !== 'active') {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Região não encontrada']);
        exit;
    }
    if ($existing && ($existing['status'] ?? '') === 'active') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Já existe uma região com esse nome']);
        exit;
    }
    if ($existing) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Já existe uma região com esse nome']);
        exit;
    }
    db()->prepare('UPDATE gcv_regions SET name = ? WHERE id = ?')->execute([$name, $id]);
    db()->prepare('UPDATE gcv_cities SET region = ? WHERE region_id = ?')->execute([$name, $id]);
    echo json_encode(['ok' => true, 'data' => gcv_region_fetch(db(), $id)]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    $current = gcv_region_fetch(db(), $id);
    if (!$current || ($current['status'] ?? '') !== 'active') {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Região não encontrada']);
        exit;
    }
    db()->prepare('UPDATE gcv_cities SET region_id = NULL, region = NULL WHERE region_id = ?')->execute([$id]);
    db()->prepare("UPDATE gcv_regions SET status = 'archived' WHERE id = ?")->execute([$id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
