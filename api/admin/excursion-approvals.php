<?php
declare(strict_types=1);

/**
 * Admin — Aprovar / Rejeitar / Solicitar alterações / Editar e Aprovar
 * GET  — lista pending_approval
 * POST — { id, action: approve|reject|request_changes|edit_and_approve, ... }
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace/publish_service.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_response(true, ['pending' => gcv_publish_list_pending()]);
}

if ($method !== 'POST' && $method !== 'PUT') {
    json_response(false, null, 'Método não permitido', 405);
}

$body = body_json();
$id = (int)($body['id'] ?? $body['excursion_id'] ?? 0);
$action = trim((string)($body['action'] ?? ''));
if ($id <= 0 || $action === '') {
    json_response(false, null, 'id e action obrigatórios', 422);
}

try {
    $row = gcv_publish_admin_decision($id, $action, $body, (int)$admin['id']);
    json_response(true, [
        'message' => 'Ação aplicada: ' . $action,
        'excursion' => $row,
    ]);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (RuntimeException $e) {
    json_response(false, null, $e->getMessage(), 404);
} catch (Throwable $e) {
    json_response(false, null, $e->getMessage(), 500);
}
