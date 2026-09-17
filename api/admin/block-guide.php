<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/access_policy.php';
require_once __DIR__ . '/../helpers/guide_registration.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_auth_ensure_role_schema();
gcv_blocked_guide_emails_ensure();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_response(true, [
        'blocked_emails' => gcv_guide_blocked_emails_list(),
        'reject_reasons' => gcv_guide_reject_reason_presets(),
    ]);
}

if ($method !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$data = body_json();
$action = strtolower(trim((string)($data['action'] ?? 'block')));

if ($action === 'unblock') {
    $email = gcv_guide_normalize_email((string)($data['email'] ?? ''));
    if ($email === '') {
        json_response(false, null, 'E-mail obrigatório', 422);
    }
    gcv_guide_email_unblock($email);
    json_response(true, ['message' => 'E-mail desbloqueado. A pessoa pode se cadastrar novamente.']);
}

$userId = (int)($data['user_id'] ?? 0);
$reason = (string)($data['reason'] ?? '');
if (!$userId) {
    json_response(false, null, 'user_id obrigatório', 422);
}

try {
    $row = gcv_guide_block_registration($userId, $reason, (int)$admin['id']);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (RuntimeException $e) {
    $code = str_contains($e->getMessage(), 'não encontrado') ? 404 : 422;
    json_response(false, null, $e->getMessage(), $code);
} catch (Throwable $e) {
    error_log('block-guide: ' . $e->getMessage());
    json_response(false, null, 'Erro ao bloquear cadastro.', 500);
}

echo json_encode([
    'ok' => true,
    'data' => [
        'message' => 'Cadastro bloqueado. O perfil foi eliminado e este e-mail não poderá se inscrever de novo.',
        'status' => 'BLOQUEADO',
    ],
], JSON_UNESCAPED_UNICODE);
gcv_finish_http_response();
gcv_guide_notify_registration_decision('blocked', $row, (string)($row['_reason'] ?? $reason));
exit;
