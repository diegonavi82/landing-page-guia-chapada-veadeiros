<?php
/**
 * ONE-SHOT: restaura diegonavi82@gmail.com como admin (sem apagar o cadastro de guia).
 * https://www.guiachapadaveadeiros.com/api/_restore_diego_admin_once.php?key=GCV-MKT-2026
 * Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/user_roles.php';

function out(string $m): void
{
    echo $m . "\n";
}

$email = 'diegonavi82@gmail.com';

try {
    $pdo = db();
    out('OK: conectado');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

gcv_auth_ensure_role_schema();

$st = $pdo->prepare(
    'SELECT u.id, u.email, u.name, u.role, u.status, u.email_verified, u.google_id,
            g.id AS guide_id, g.profile_complete, g.approved_at
     FROM gcv_users u
     LEFT JOIN gcv_guides g ON g.user_id = u.id
     WHERE LOWER(u.email) = ?
     LIMIT 1'
);
$st->execute([$email]);
$user = $st->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    $pdo->prepare(
        'INSERT INTO gcv_users (name, email, role, status, email_verified)
         VALUES (?,?,\'admin\',\'active\',1)'
    )->execute(['Diego Navi', $email]);
    $userId = (int)$pdo->lastInsertId();
    out('CRIADO user_id=' . $userId);
} else {
    $userId = (int)$user['id'];
    out('EXISTE user_id=' . $userId
        . ' role=' . ($user['role'] ?? '')
        . ' status=' . ($user['status'] ?? '')
        . ' verified=' . (int)($user['email_verified'] ?? 0)
        . ' google=' . (trim((string)($user['google_id'] ?? '')) !== '' ? 'sim' : 'nao')
        . ' guide_id=' . ($user['guide_id'] ?? 'null'));
}

gcv_user_grant_role($userId, 'admin');
gcv_user_grant_role($userId, 'guide');
gcv_user_sync_primary_role($userId);

$pdo->prepare('UPDATE gcv_users SET email_verified = 1 WHERE id = ?')->execute([$userId]);

$roles = gcv_user_roles($userId);
$after = $pdo->prepare('SELECT id, email, role, status, email_verified FROM gcv_users WHERE id = ?');
$after->execute([$userId]);
$row = $after->fetch(PDO::FETCH_ASSOC) ?: [];

out('roles=' . implode(',', $roles));
out('primary_role=' . ($row['role'] ?? ''));
out('status=' . ($row['status'] ?? '') . ' (cadastro de guia preservado)');
out('FEITO: ' . $email . ' é admin de novo. Entre em /admin/login.html com Google.');
