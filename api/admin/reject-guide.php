<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/guide_registration.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$admin = require_admin();
gcv_auth_ensure_role_schema();
$data = body_json();
$userId = (int)($data['user_id'] ?? 0);
$reason = (string)($data['reason'] ?? '');

if (!$userId) {
    json_response(false, null, 'user_id obrigatório', 422);
}

try {
    $row = gcv_guide_reject_registration($userId, $reason, (int)$admin['id']);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (RuntimeException $e) {
    $code = str_contains($e->getMessage(), 'não encontrado') ? 404 : 422;
    json_response(false, null, $e->getMessage(), $code);
} catch (Throwable $e) {
    error_log('reject-guide: ' . $e->getMessage());
    json_response(false, null, 'Erro ao recusar cadastro.', 500);
}

echo json_encode([
    'ok' => true,
    'data' => [
        'message' => 'Cadastro recusado. O perfil foi mantido e o guia não poderá solicitar nova aprovação por 45 dias.',
        'status' => 'RECUSADO',
    ],
], JSON_UNESCAPED_UNICODE);
gcv_finish_http_response();
gcv_guide_notify_registration_decision('rejected', $row, (string)($row['_reason'] ?? $reason));
exit;
