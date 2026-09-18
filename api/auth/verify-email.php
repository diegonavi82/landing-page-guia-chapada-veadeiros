<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';
require_once __DIR__ . '/../helpers/email_verify.php';
require_once __DIR__ . '/../helpers/user_roles.php';

header('Content-Type: application/json; charset=utf-8');

$token = '';
$code6 = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = (string)($_GET['token'] ?? '');
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_rate_limit('verify_email', 8, 15);
    $data = body_json();
    $token = (string)($data['token'] ?? '');
    $code6 = (string)($data['code'] ?? $data['code_6'] ?? '');
    $email = validate_email($data['email'] ?? '') ?: '';
} else {
    json_response(false, null, 'Método não permitido', 405);
}

$row = gcv_email_verify_find_row($token, $code6, $email);
if (!$row) {
    json_response(false, null, 'Código ou link inválido ou expirado', 400);
}

$userId = gcv_email_verify_consume($row);
$st = db()->prepare('SELECT id, name, email, role, status, email_verified FROM gcv_users WHERE id = ?');
$st->execute([$userId]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    json_response(false, null, 'Conta não encontrada', 404);
}

$roles = gcv_user_roles($userId);
$context = in_array('guide', $roles, true) ? 'guide' : (string)($user['role'] ?? 'client');
$current = current_user();
if (!$current || (int)$current['id'] !== $userId) {
    destroy_session($context);
    create_session($userId, $context);
}

$redirect = '/dashboard/?as=' . rawurlencode($context);
if ($context === 'guide') {
    $redirect .= '#agenda';
}

json_response(true, [
    'message' => 'E-mail confirmado! Complete seu perfil para enviar à aprovação.',
    'redirect' => $redirect,
    'email_verified' => true,
    'role' => $context,
    'status' => $user['status'] ?? 'pending',
]);
