<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/access_policy.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

try {
    check_rate_limit('login');

    $data  = body_json();
    $email = validate_email($data['email'] ?? '');
    $pass  = $data['password'] ?? '';
    $context = gcv_normalize_login_context($data['context'] ?? 'client');

    if (!$email || !$pass) {
        json_response(false, null, 'Email e senha são obrigatórios', 422);
    }

    $accessErr = gcv_login_access_error($context, (string)$email);
    if ($accessErr) {
        json_response(false, null, $accessErr, 403);
    }

    $stmt = db()->prepare(
        'SELECT id, name, email, password_hash, role, avatar_url, lang, status FROM gcv_users WHERE email = ?'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password_hash'] ?? '')) {
        json_response(false, null, 'Email ou senha incorretos', 401);
    }

    if ($user['status'] === 'suspended') {
        json_response(false, null, 'Conta suspensa. Entre em contato com o suporte.', 403);
    }

    // Guia pendente: só na porta guia (dashboard mostra “em análise”)
    if ($user['status'] === 'pending' && $context === 'guide') {
        // ok
    } elseif ($user['status'] === 'pending' && $context !== 'guide') {
        $roles = gcv_user_roles((int)$user['id']);
        if ($roles === ['guide'] || $roles === []) {
            json_response(false, null, 'Conta aguardando aprovação do administrador', 403);
        }
    }

    $ctxErr = gcv_login_context_error((int)$user['id'], $context, (string)$user['status']);
    if ($ctxErr) {
        json_response(false, null, $ctxErr, 403);
    }

    // Dupla checagem admin allowlist (após autenticar)
    if ($context === 'admin' && !gcv_is_admin_allowlisted((string)$user['email'])) {
        json_response(false, null, 'Acesso à Área Admin restrito.', 403);
    }

    reset_rate_limit('login');
    destroy_session();
    create_session((int)$user['id'], $context);

    $roles = gcv_user_roles((int)$user['id']);
    json_response(true, [
        'role'        => $context,
        'active_role' => $context,
        'roles'       => $roles,
        'name'        => $user['name'],
        'avatar_url'  => $user['avatar_url'],
        'lang'        => $user['lang'],
        'status'      => $user['status'],
    ]);
} catch (Throwable $e) {
    error_log('login.php: ' . $e->getMessage());
    json_response(false, null, 'Erro de conexão com o banco. Tente novamente.', 500);
}
