<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/mailer.php';

auth_session_start();

$appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';

$code   = $_GET['code']  ?? '';
$state  = $_GET['state'] ?? '';
$secret = $_ENV['APP_SECRET'] ?? 'gcv_secret';

// Verificar state via HMAC (sem sessão)
$valid = false;
if ($state && str_contains($state, '.')) {
    [$ts, $sig] = explode('.', $state, 2);
    $expected = hash_hmac('sha256', $ts, $secret);
    $valid = hash_equals($expected, $sig) && (time() - (int)$ts) < 600;
}

if (!$code || !$valid) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_state');
    exit;
}

$clientId     = $_ENV['GOOGLE_CLIENT_ID']     ?? '';
$clientSecret = $_ENV['GOOGLE_CLIENT_SECRET'] ?? '';
$redirectUri  = $_ENV['GOOGLE_REDIRECT_URI']  ?? '';

// Trocar code por access_token
try {
    $tokenResponse = null;
    if (function_exists('curl_init')) {
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
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
    } else {
        // Fallback: file_get_contents
        $ctx = stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query([
                'code'          => $code,
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri'  => $redirectUri,
                'grant_type'    => 'authorization_code',
            ]),
            'ignore_errors' => true,
        ]]);
        $tokenResponse = json_decode(file_get_contents('https://oauth2.googleapis.com/token', false, $ctx), true);
    }
} catch (Throwable $e) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_curl&msg=' . urlencode($e->getMessage()));
    exit;
}

if (empty($tokenResponse['access_token'])) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_token');
    exit;
}

// Buscar dados do usuário
try {
    $googleUser = null;
    if (function_exists('curl_init')) {
        $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $tokenResponse['access_token']],
        ]);
        $googleUser = json_decode(curl_exec($ch), true);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'header'        => 'Authorization: Bearer ' . $tokenResponse['access_token'],
            'ignore_errors' => true,
        ]]);
        $googleUser = json_decode(file_get_contents('https://www.googleapis.com/oauth2/v3/userinfo', false, $ctx), true);
    }
} catch (Throwable $e) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_userinfo');
    exit;
}

if (empty($googleUser['email'])) {
    header('Location: ' . $appUrl . '/login.html?error=oauth_user');
    exit;
}

$googleId  = $googleUser['sub']     ?? '';
$email     = strtolower($googleUser['email'] ?? '');
$name      = $googleUser['name']    ?? $email;
$avatarUrl = $googleUser['picture'] ?? null;

try {
    $pdo  = db();
    $stmt = $pdo->prepare('SELECT id, status FROM gcv_users WHERE email = ? OR google_id = ?');
    $stmt->execute([$email, $googleId]);
    $user = $stmt->fetch();

    if ($user) {
        if ($user['status'] === 'suspended') {
            header('Location: ' . $appUrl . '/login.html?error=suspended');
            exit;
        }
        $pdo->prepare(
            'UPDATE gcv_users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?'
        )->execute([$googleId, $avatarUrl, $user['id']]);
        $userId = (int)$user['id'];
    } else {
        $pdo->prepare(
            'INSERT INTO gcv_users (name, email, google_id, avatar_url, role, status, email_verified) VALUES (?,?,?,?,\'client\',\'active\',1)'
        )->execute([$name, $email, $googleId, $avatarUrl]);
        $userId = (int)$pdo->lastInsertId();
        try { mail_welcome($email, $name); } catch (Throwable) {}
    }

    create_session($userId);
    header('Location: ' . $appUrl . '/dashboard/');
    exit;

} catch (Throwable $e) {
    header('Location: ' . $appUrl . '/login.html?error=db&msg=' . urlencode($e->getMessage()));
    exit;
}
