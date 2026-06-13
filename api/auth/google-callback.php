<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/mailer.php';

auth_session_start();

$appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';

$code  = $_GET['code']  ?? '';
$state = $_GET['state'] ?? '';

if (!$code || !$state || $state !== ($_SESSION['google_state'] ?? '')) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_state');
    exit;
}
unset($_SESSION['google_state']);

// Trocar code por access_token
$clientId     = $_ENV['GOOGLE_CLIENT_ID']     ?? '';
$clientSecret = $_ENV['GOOGLE_CLIENT_SECRET'] ?? '';
$redirectUri  = $_ENV['GOOGLE_REDIRECT_URI']  ?? '';

$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS     => http_build_query([
        'code'          => $code,
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri'  => $redirectUri,
        'grant_type'    => 'authorization_code',
    ]),
]);
$tokenResponse = json_decode(curl_exec($ch), true);
curl_close($ch);

if (empty($tokenResponse['access_token'])) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_token');
    exit;
}

// Buscar dados do usuário
$ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $tokenResponse['access_token']],
]);
$googleUser = json_decode(curl_exec($ch), true);
curl_close($ch);

if (empty($googleUser['email'])) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_user');
    exit;
}

$googleId  = $googleUser['sub']      ?? '';
$email     = strtolower($googleUser['email']  ?? '');
$name      = $googleUser['name']     ?? $email;
$avatarUrl = $googleUser['picture']  ?? null;

$pdo  = db();
$stmt = $pdo->prepare('SELECT id, status FROM gcv_users WHERE email = ? OR google_id = ?');
$stmt->execute([$email, $googleId]);
$user = $stmt->fetch();

if ($user) {
    if ($user['status'] === 'suspended') {
        header('Location: ' . $appUrl . '/login.html?error=suspended');
        exit;
    }
    // Atualizar google_id e avatar se necessário
    $pdo->prepare(
        'UPDATE gcv_users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?'
    )->execute([$googleId, $avatarUrl, $user['id']]);
    $userId = (int)$user['id'];
} else {
    $pdo->prepare(
        'INSERT INTO gcv_users (name, email, google_id, avatar_url, role, status, email_verified) VALUES (?,?,?,?,\'client\',\'active\',1)'
    )->execute([$name, $email, $googleId, $avatarUrl]);
    $userId = (int)$pdo->lastInsertId();
    mail_welcome($email, $name);
}

create_session($userId);
header('Location: ' . $appUrl . '/dashboard/');
exit;
