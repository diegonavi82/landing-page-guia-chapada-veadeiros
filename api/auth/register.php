<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/mailer.php';

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

// Verificar se email já existe sem revelar ao usuário
$check = db()->prepare('SELECT id FROM gcv_users WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    // Resposta genérica por segurança
    json_response(true, ['message' => 'Se este email não estiver cadastrado, você receberá um email de confirmação.']);
}

$hash   = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
$status = $role === 'client' ? 'active' : 'pending';

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
        mail_guide_pending_admin($name, $email);
    }

    $pdo->commit();
} catch (\Exception $e) {
    $pdo->rollBack();
    error_log('Register error: ' . $e->getMessage());
    json_response(false, null, 'Erro ao criar conta. Tente novamente.', 500);
}

mail_welcome($email, $name, $lang);

json_response(true, [
    'message' => $role === 'guide'
        ? 'Cadastro realizado! Aguarde aprovação do administrador.'
        : 'Cadastro realizado! Faça login para continuar.',
]);
