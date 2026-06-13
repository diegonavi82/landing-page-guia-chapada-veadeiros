<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

check_rate_limit('forgot_password', 3, 60);

$data  = body_json();
$email = validate_email($data['email'] ?? '');

// Resposta genérica independente de o email existir
if (!$email) {
    json_response(true, ['message' => 'Se este email estiver cadastrado, você receberá as instruções em breve.']);
}

$stmt = db()->prepare('SELECT id, name, lang FROM gcv_users WHERE email = ? AND status != \'suspended\'');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $token     = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $code6     = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires   = date('Y-m-d H:i:s', time() + 3600);

    // Invalidar tokens anteriores
    db()->prepare('UPDATE gcv_password_resets SET used = 1 WHERE user_id = ?')->execute([$user['id']]);

    db()->prepare(
        'INSERT INTO gcv_password_resets (user_id, token_hash, code_6, expires_at) VALUES (?,?,?,?)'
    )->execute([$user['id'], $tokenHash, $code6, $expires]);

    mail_reset_password($email, $user['name'], $token, $code6, $user['lang']);
}

json_response(true, ['message' => 'Se este email estiver cadastrado, você receberá as instruções em breve.']);
