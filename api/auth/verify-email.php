<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

$token = $_GET['token'] ?? '';
if (!$token) json_response(false, null, 'Token não informado', 400);

$tokenHash = hash('sha256', $token);
$stmt = db()->prepare(
    'SELECT id, user_id FROM gcv_password_resets WHERE token_hash = ? AND used = 0 AND expires_at > NOW()'
);
$stmt->execute([$tokenHash]);
$row = $stmt->fetch();

if (!$row) json_response(false, null, 'Link inválido ou expirado', 400);

db()->prepare('UPDATE gcv_users SET email_verified = 1 WHERE id = ?')->execute([$row['user_id']]);
db()->prepare('UPDATE gcv_password_resets SET used = 1 WHERE id = ?')->execute([$row['id']]);

json_response(true, ['message' => 'Email verificado com sucesso!']);
