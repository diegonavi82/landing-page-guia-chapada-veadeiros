<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/user_roles.php';
require_once __DIR__ . '/../helpers/access_policy.php';
require_once __DIR__ . '/../helpers/diego_navi_stash.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$data  = body_json();
$name  = validate_name($data['name'] ?? '');
$email = validate_email($data['email'] ?? '');
$pass  = validate_password($data['password'] ?? '');
$role  = validate_role($data['role'] ?? 'client');
$lang  = validate_lang($data['lang'] ?? 'pt');
$cadastur = sanitize_text($data['cadastur'] ?? '', 60);

if (!$name) json_response(false, null, 'Nome inválido (mínimo 2 caracteres)', 422);
if (!$email) json_response(false, null, 'Email inválido', 422);
if (!$pass) json_response(false, null, 'Senha muito curta (mínimo 8 caracteres)', 422);
if (!$role) json_response(false, null, 'Tipo de conta inválido', 422);

if ($role === 'client' && !gcv_client_area_enabled()) {
    json_response(false, null, 'Cadastro de cliente temporariamente indisponível.', 403);
}

$check = db()->prepare('SELECT id, role FROM gcv_users WHERE email = ?');
$check->execute([$email]);
$existing = $check->fetch();
if ($existing) {
    if ($role === 'guide') {
        json_response(
            false,
            null,
            'Este e-mail já possui cadastro de guia. Entre na Área do Guia para confirmar o e-mail ou use “Esqueci a senha”.',
            409
        );
    }
    json_response(true, ['message' => 'Se este email não estiver cadastrado, você receberá um email de confirmação.']);
}

$hash   = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
// Guia sempre nasce pending até o admin aprovar
$status = $role === 'guide' ? 'pending' : 'active';

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare(
        'INSERT INTO gcv_users (name, email, password_hash, role, lang, status, email_verified) VALUES (?,?,?,?,?,?,?)'
    )->execute([$name, $email, $hash, $role, $lang, $status, $role === 'client' ? 1 : 0]);

    $userId = (int)$pdo->lastInsertId();

    if ($role === 'guide') {
        $pdo->prepare(
            'INSERT INTO gcv_guides (user_id, cadastur) VALUES (?,?)'
        )->execute([$userId, $cadastur ?: null]);
        gcv_diego_navi_stash_apply_if_needed($userId, $email);
    }

    $pdo->commit();
} catch (\Exception $e) {
    $pdo->rollBack();
    error_log('Register error: ' . $e->getMessage());
    json_response(false, null, 'Erro ao criar conta. Tente novamente.', 500);
}

gcv_user_grant_role($userId, $role);
// Não concede papel client automaticamente enquanto a área do cliente estiver fechada
if ($role === 'guide' && gcv_client_area_enabled()) {
    gcv_user_grant_role($userId, 'client');
}
gcv_user_sync_primary_role($userId);

if ($role === 'guide') {
    require_once __DIR__ . '/../helpers/email_verify.php';
    require_once __DIR__ . '/../helpers/rate_limiter.php';
    try {
        gcv_email_verify_issue($userId, $email, $name, $lang);
    } catch (Throwable $e) {
        error_log('register verify email: ' . $e->getMessage());
    }
    destroy_session();
    create_session($userId, 'guide');
    json_response(true, [
        'message' => 'Conta criada! Confirme seu e-mail para continuar.',
        'auto_login' => true,
        'need_email_verify' => true,
        'email' => $email,
        'redirect' => '/guia/confirmar-email.html',
        'role' => 'guide',
        'status' => 'pending',
        'email_verified' => false,
    ]);
}

mail_welcome($email, $name, $lang);

json_response(true, [
    'message' => 'Cadastro realizado! Faça login para continuar.',
]);
