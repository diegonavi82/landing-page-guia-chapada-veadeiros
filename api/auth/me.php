<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

$user = current_user();
if (!$user) {
    json_response(false, null, 'Não autenticado', 401);
}

// Nunca retornar password_hash
json_response(true, [
    'id'             => $user['id'],
    'name'           => $user['name'],
    'email'          => $user['email'],
    'role'           => $user['role'],
    'avatar_url'     => $user['avatar_url'],
    'lang'           => $user['lang'],
    'status'         => $user['status'],
    'email_verified' => (bool)$user['email_verified'],
]);
