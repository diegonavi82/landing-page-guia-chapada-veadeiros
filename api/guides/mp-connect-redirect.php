<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

// Carregar .env
$envFile = dirname(__DIR__, 2) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

$user = require_role('guide');

$mpAppId      = $_ENV['MP_APP_ID']   ?? '';
$appUrl       = $_ENV['APP_URL']     ?? 'https://www.guiachapadaveadeiros.com';
$redirectUri  = urlencode($appUrl . '/api/guides/mp-callback.php');
$state        = bin2hex(random_bytes(16));

auth_session_start();
$_SESSION['mp_connect_state'] = $state;
$_SESSION['mp_connect_user']  = $user['id'];

$params = http_build_query([
    'response_type' => 'code',
    'client_id'     => $mpAppId,
    'state'         => $state,
    'redirect_uri'  => $appUrl . '/api/guides/mp-callback.php',
]);

header('Location: https://auth.mercadopago.com.br/authorization?' . $params);
exit;
