<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/access_policy.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/guide_registration.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$admin = require_admin();
gcv_cms_ensure_schema();
$data = body_json();
$userId = (int)($data['user_id'] ?? 0);

if (!$userId) {
    json_response(false, null, 'user_id obrigatório', 422);
}

$row = gcv_guide_pending_snapshot($userId);
if (!$row || !gcv_user_has_role($userId, 'guide')) {
    json_response(false, null, 'Guia não encontrado', 404);
}

if ((string)($row['status'] ?? '') !== 'pending' && !gcv_guide_is_unapproved_rejected($row)) {
    json_response(false, null, 'Este cadastro não pode ser aprovado por aqui.', 422);
}

db()->prepare('UPDATE gcv_users SET status = \'active\' WHERE id = ?')->execute([$userId]);

gcv_user_grant_role($userId, 'guide');
if (gcv_client_area_enabled()) {
    gcv_user_grant_role($userId, 'client');
}
gcv_user_sync_primary_role($userId);

try {
    db()->prepare(
        'UPDATE gcv_guides SET approved_at = NOW(), approved_by = ?, needs_resubmit = 0 WHERE user_id = ?'
    )->execute([(int)$admin['id'], $userId]);
} catch (Throwable $e) {
    db()->prepare(
        'UPDATE gcv_guides SET approved_at = NOW(), approved_by = ? WHERE user_id = ?'
    )->execute([(int)$admin['id'], $userId]);
}

echo json_encode(['ok' => true, 'data' => ['message' => 'Guia aprovado com sucesso', 'status' => 'APROVADO']], JSON_UNESCAPED_UNICODE);
gcv_finish_http_response();
gcv_guide_notify_registration_decision('approved', $row);
exit;
