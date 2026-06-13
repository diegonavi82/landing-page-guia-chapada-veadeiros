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

auth_session_start();

$appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
$code   = $_GET['code']  ?? '';
$state  = $_GET['state'] ?? '';

if (!$code || !$state || $state !== ($_SESSION['mp_connect_state'] ?? '')) {
    header('Location: ' . $appUrl . '/dashboard/?error=mp_state');
    exit;
}

$userId = (int)($_SESSION['mp_connect_user'] ?? 0);
unset($_SESSION['mp_connect_state'], $_SESSION['mp_connect_user']);

if (!$userId) {
    header('Location: ' . $appUrl . '/login.html');
    exit;
}

// Trocar code por access_token
$ch = curl_init('https://api.mercadopago.com/oauth/token');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_POSTFIELDS     => http_build_query([
        'client_secret' => $_ENV['MP_ACCESS_TOKEN'] ?? '',
        'grant_type'    => 'authorization_code',
        'code'          => $code,
        'redirect_uri'  => $appUrl . '/api/guides/mp-callback.php',
    ]),
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if (empty($response['access_token'])) {
    header('Location: ' . $appUrl . '/dashboard/?error=mp_token');
    exit;
}

db()->prepare(
    'UPDATE gcv_guides SET mp_access_token = ?, mp_user_id = ?, mp_connected_at = NOW() WHERE user_id = ?'
)->execute([$response['access_token'], $response['user_id'] ?? null, $userId]);

header('Location: ' . $appUrl . '/dashboard/?mp_connected=1');
exit;
