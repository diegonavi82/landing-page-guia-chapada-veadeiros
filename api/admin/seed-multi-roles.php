<?php
/**
 * Garante papéis multi-portal para e-mails Diego (admin logado).
 * /api/admin/seed-multi-roles.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/guides_seed.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();

$emails = [
    'diegonavi82@gmail.com',
    'diegonavi182@gmail.com',
    'diegocsp82@gmail.com',
];

try {
    gcv_auth_ensure_role_schema();
    // Garante perfil guia Diego
    try {
        gcv_seed_diego_navi_guide();
    } catch (Throwable $e) {
        // pode falhar se e-mail for admin-only em edge case
    }

    $out = [];
    foreach ($emails as $email) {
        $stmt = db()->prepare('SELECT id, email, role, status FROM gcv_users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $u = $stmt->fetch();
        if (!$u) {
            $out[] = ['email' => $email, 'ok' => false, 'error' => 'não encontrado'];
            continue;
        }
        $uid = (int)$u['id'];
        gcv_user_grant_role($uid, 'admin');
        gcv_user_grant_role($uid, 'guide');
        gcv_user_grant_role($uid, 'client');
        gcv_user_sync_primary_role($uid);
        db()->prepare('UPDATE gcv_users SET status="active", email_verified=1 WHERE id=?')->execute([$uid]);
        $out[] = [
            'email' => $email,
            'ok' => true,
            'user_id' => $uid,
            'roles' => gcv_user_roles($uid),
        ];
    }

    echo json_encode([
        'ok' => true,
        'data' => ['accounts' => $out],
        'message' => 'Papéis atualizados. Saia e entre de novo em cada porta (Cliente / Guia / Admin).',
        'admin' => $admin['email'] ?? '',
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
