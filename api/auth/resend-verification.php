<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';
require_once __DIR__ . '/../helpers/email_verify.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

check_rate_limit('resend_verify', 3, 10);

$data = body_json();
$user = current_user();
$email = validate_email($data['email'] ?? '') ?: '';

if ($user) {
    $userId = (int)$user['id'];
    $email = (string)$user['email'];
    $name = (string)$user['name'];
    $lang = (string)($user['lang'] ?? 'pt');
    if (!empty($user['email_verified'])) {
        json_response(true, ['message' => 'E-mail já confirmado.', 'already' => true, 'redirect' => '/dashboard/']);
    }
} else {
    if (!$email) {
        json_response(false, null, 'Informe o e-mail', 422);
    }
    $st = db()->prepare(
        'SELECT id, name, lang, email_verified, status FROM gcv_users WHERE email = ? LIMIT 1'
    );
    $st->execute([$email]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row || !empty($row['email_verified'])) {
        json_response(true, ['message' => 'Se este e-mail estiver pendente, enviamos um novo código.']);
    }
    $userId = (int)$row['id'];
    $name = (string)$row['name'];
    $lang = (string)($row['lang'] ?? 'pt');
}

gcv_email_verify_issue($userId, $email, $name, $lang);
json_response(true, ['message' => 'Enviamos um novo código e um link para o seu e-mail.']);
