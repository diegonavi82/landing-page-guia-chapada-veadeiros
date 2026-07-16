<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/user_roles.php';

header('Content-Type: application/json; charset=utf-8');

$user = current_user();
if (!$user) {
    json_response(false, null, 'Não autenticado', 401);
}

json_response(true, [
    'id'             => $user['id'],
    'name'           => $user['name'],
    'email'          => $user['email'],
    'role'           => $user['role'], // active_role (layout)
    'active_role'    => $user['active_role'] ?? $user['role'],
    'roles'          => $user['roles'] ?? [],
    'primary_role'   => $user['primary_role'] ?? null,
    'avatar_url'     => $user['avatar_url'],
    'lang'           => $user['lang'],
    'status'         => $user['status'],
    'email_verified' => (bool)$user['email_verified'],
]);
