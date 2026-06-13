<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$data    = body_json();
$newPass = validate_password($data['password'] ?? '');
$confirm = $data['password_confirm'] ?? '';
$token   = $data['token'] ?? '';
$code6   = $data['code'] ?? '';
$email   = validate_email($data['email'] ?? '');

if (!$newPass) json_response(false, null, 'Senha muito curta (mínimo 8 caracteres)', 422);
if ($newPass !== $confirm) json_response(false, null, 'As senhas não coincidem', 422);

$resetRow = null;

if ($token) {
    $tokenHash = hash('sha256', $token);
    $stmt = db()->prepare(
        'SELECT id, user_id FROM gcv_password_resets WHERE token_hash = ? AND used = 0 AND expires_at > NOW()'
    );
    $stmt->execute([$tokenHash]);
    $resetRow = $stmt->fetch();
} elseif ($code6 && $email) {
    $stmt = db()->prepare(
        'SELECT r.id, r.user_id FROM gcv_password_resets r
         JOIN gcv_users u ON u.id = r.user_id
         WHERE r.code_6 = ? AND u.email = ? AND r.used = 0 AND r.expires_at > NOW()'
    );
    $stmt->execute([$code6, $email]);
    $resetRow = $stmt->fetch();
}

if (!$resetRow) {
    json_response(false, null, 'Token inválido ou expirado', 400);
}

$hash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);

$pdo = db();
$pdo->prepare('UPDATE gcv_users SET password_hash = ? WHERE id = ?')->execute([$hash, $resetRow['user_id']]);
$pdo->prepare('UPDATE gcv_password_resets SET used = 1 WHERE id = ?')->execute([$resetRow['id']]);
destroy_all_user_sessions((int)$resetRow['user_id']);

json_response(true, ['message' => 'Senha redefinida com sucesso! Faça login.']);
