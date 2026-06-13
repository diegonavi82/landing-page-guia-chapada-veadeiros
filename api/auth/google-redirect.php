<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

auth_session_start();

$clientId    = $_ENV['GOOGLE_CLIENT_ID']    ?? '';
$redirectUri = $_ENV['GOOGLE_REDIRECT_URI'] ?? '';
$secret      = $_ENV['APP_SECRET']          ?? 'gcv_secret';

// State assinado com HMAC — não depende de sessão PHP
$ts    = time();
$hmac  = hash_hmac('sha256', (string)$ts, $secret);
$state = $ts . '.' . $hmac;

$params = http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirectUri,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'state'         => $state,
    'access_type'   => 'online',
    'prompt'        => 'select_account',
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
