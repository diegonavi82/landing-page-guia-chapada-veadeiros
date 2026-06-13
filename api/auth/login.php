<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

check_rate_limit('login');

$data  = body_json();
$email = validate_email($data['email'] ?? '');
$pass  = $data['password'] ?? '';

if (!$email || !$pass) {
    json_response(false, null, 'Email e senha são obrigatórios', 422);
}

$stmt = db()->prepare(
    'SELECT id, name, email, password_hash, role, avatar_url, lang, status FROM gcv_users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password_hash'] ?? '')) {
    json_response(false, null, 'Email ou senha incorretos', 401);
}

if ($user['status'] === 'pending') {
    json_response(false, null, 'Conta aguardando aprovação do administrador', 403);
}

if ($user['status'] === 'suspended') {
    json_response(false, null, 'Conta suspensa. Entre em contato com o suporte.', 403);
}

reset_rate_limit('login');
create_session((int)$user['id']);

json_response(true, [
    'role'       => $user['role'],
    'name'       => $user['name'],
    'avatar_url' => $user['avatar_url'],
    'lang'       => $user['lang'],
]);
