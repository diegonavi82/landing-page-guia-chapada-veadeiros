<?php
declare(strict_types=1);

/**
 * Admin: listar / ocultar / reexibir / excluir avaliações.
 * GET  — lista
 * POST { id, action: hide|show|delete }
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/review_service.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_admin();
gcv_marketplace_ensure_schema();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_response(true, [
        'reviews' => gcv_review_list_admin(300),
    ]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        json_response(false, null, 'JSON inválido', 400);
    }
    $id = (int)($body['id'] ?? 0);
    $action = strtolower(trim((string)($body['action'] ?? '')));
    if ($id <= 0) {
        json_response(false, null, 'id obrigatório', 422);
    }
    $row = db()->prepare('SELECT id FROM gcv_guide_reviews WHERE id = ? LIMIT 1');
    $row->execute([$id]);
    if (!$row->fetchColumn()) {
        json_response(false, null, 'Avaliação não encontrada', 404);
    }
    if ($action === 'hide') {
        gcv_review_set_admin_hidden($id, true);
        json_response(true, ['message' => 'Avaliação ocultada (não aparece no perfil do guia)']);
    }
    if ($action === 'show') {
        gcv_review_set_admin_hidden($id, false);
        json_response(true, ['message' => 'Avaliação visível novamente']);
    }
    if ($action === 'delete') {
        gcv_review_delete_permanent($id);
        json_response(true, ['message' => 'Avaliação excluída permanentemente']);
    }
    json_response(false, null, 'Ação inválida (hide, show ou delete)', 422);
}

json_response(false, null, 'Método não permitido', 405);
