<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/related_tours.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();
gcv_cms_ensure_schema();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = $method === 'GET' ? [] : gcv_cms_json_body();

try {
    if ($method === 'POST') {
        $ids = [];
        foreach ((array)($body['attraction_ids'] ?? []) as $raw) {
            $ids[] = (int)$raw;
        }
        $tour = gcv_related_tour_save(db(), $ids);
        echo json_encode(['ok' => true, 'data' => $tour]);
        exit;
    }
    if ($method === 'DELETE') {
        $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
            exit;
        }
        gcv_related_tour_delete(db(), $id);
        echo json_encode(['ok' => true]);
        exit;
    }
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
