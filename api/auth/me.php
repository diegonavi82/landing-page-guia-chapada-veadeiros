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

$profileComplete = false;
$isGuide = ($user['role'] ?? '') === 'guide'
    || in_array('guide', $user['roles'] ?? [], true);
if ($isGuide) {
    try {
        $st = db()->prepare('SELECT profile_complete FROM gcv_guides WHERE user_id = ? LIMIT 1');
        $st->execute([(int)$user['id']]);
        $profileComplete = (int)$st->fetchColumn() === 1;
    } catch (Throwable $e) {
        $profileComplete = false;
    }
}

$whatsappOk = true;
$activeRole = (string)($user['role'] ?? '');
if ($activeRole === 'guide' || $activeRole === 'client') {
    $whatsappOk = false;
    try {
        $sql = $activeRole === 'guide'
            ? 'SELECT phone FROM gcv_guides WHERE user_id = ? LIMIT 1'
            : 'SELECT phone FROM gcv_client_profiles WHERE user_id = ? LIMIT 1';
        $st = db()->prepare($sql);
        $st->execute([(int)$user['id']]);
        $whatsappOk = trim((string)$st->fetchColumn()) !== '';
    } catch (Throwable $e) {
        $whatsappOk = true;
    }
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
    'profile_complete' => $profileComplete,
    'whatsapp_ok'    => $whatsappOk,
]);
