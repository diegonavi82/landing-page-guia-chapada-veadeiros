<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/user_roles.php';
// mailer NÃO é carregado no boot — só quando for enviar e-mail (evita 500 se vendor ausente)

auth_session_start();

$appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
$secret = $_ENV['APP_SECRET'] ?? 'gcv_secret';

$code  = (string)($_GET['code'] ?? '');
$state = (string)($_GET['state'] ?? '');

/**
 * @return array{ok:bool,context:string,loginPath:string}
 */
function gcv_oauth_parse_state(string $state, string $secret): array
{
    $parts = explode('.', $state);
    // Novo: ts.context.hmac  | Legado: ts.hmac
    if (count($parts) === 3) {
        [$ts, $context, $sig] = $parts;
        $context = strtolower(trim($context));
        if (!in_array($context, ['client', 'guide', 'admin'], true)) {
            $context = 'client';
        }
        $expected = hash_hmac('sha256', $ts . '.' . $context, $secret);
        $ok = hash_equals($expected, $sig) && (time() - (int)$ts) < 600;
        return ['ok' => $ok, 'context' => $context, 'loginPath' => gcv_oauth_login_path($context)];
    }
    if (count($parts) === 2) {
        [$ts, $sig] = $parts;
        $expected = hash_hmac('sha256', $ts, $secret);
        $ok = hash_equals($expected, $sig) && (time() - (int)$ts) < 600;
        return ['ok' => $ok, 'context' => 'client', 'loginPath' => gcv_oauth_login_path('client')];
    }
    return ['ok' => false, 'context' => 'client', 'loginPath' => gcv_oauth_login_path('client')];
}

function gcv_oauth_login_path(string $context): string
{
    if ($context === 'admin') {
        return '/admin/login.html';
    }
    if ($context === 'guide') {
        return '/guia/login.html';
    }
    return '/login.html';
}

function gcv_oauth_fail(string $appUrl, string $loginPath, string $error): never
{
    header('Location: ' . $appUrl . $loginPath . '?error=' . rawurlencode($error));
    exit;
}

$parsed = gcv_oauth_parse_state($state, $secret);
$context = $parsed['context'];
$loginPath = $parsed['loginPath'];

if (!$code || !$parsed['ok']) {
    gcv_oauth_fail($appUrl, $loginPath, 'oauth_state');
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
        $tokenResponse = json_decode((string)curl_exec($ch), true);
        curl_close($ch);
    } else {
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
        $tokenResponse = json_decode((string)file_get_contents('https://oauth2.googleapis.com/token', false, $ctx), true);
    }
} catch (Throwable $e) {
    gcv_oauth_fail($appUrl, $loginPath, 'oauth_token');
}

if (empty($tokenResponse['access_token'])) {
    gcv_oauth_fail($appUrl, $loginPath, 'oauth_token');
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
        $googleUser = json_decode((string)curl_exec($ch), true);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'header'        => 'Authorization: Bearer ' . $tokenResponse['access_token'],
            'ignore_errors' => true,
        ]]);
        $googleUser = json_decode((string)file_get_contents('https://www.googleapis.com/oauth2/v3/userinfo', false, $ctx), true);
    }
} catch (Throwable $e) {
    gcv_oauth_fail($appUrl, $loginPath, 'oauth_userinfo');
}

if (empty($googleUser['email'])) {
    gcv_oauth_fail($appUrl, $loginPath, 'oauth_user');
}

$googleId  = (string)($googleUser['sub'] ?? '');
$email     = strtolower((string)($googleUser['email'] ?? ''));
$name      = (string)($googleUser['name'] ?? $email);
$avatarUrl = $googleUser['picture'] ?? null;

try {
    $pdo  = db();
    $stmt = $pdo->prepare('SELECT id, role, status FROM gcv_users WHERE email = ? OR google_id = ? LIMIT 1');
    $stmt->execute([$email, $googleId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        if (($user['status'] ?? '') === 'suspended') {
            gcv_oauth_fail($appUrl, $loginPath, 'suspended');
        }

        $userId = (int)$user['id'];
        // Garante papéis migrados
        gcv_user_roles($userId);

        $ctxErr = gcv_login_context_error($userId, $context, (string)($user['status'] ?? ''));
        if ($ctxErr) {
            if ($context === 'admin') {
                gcv_oauth_fail($appUrl, $loginPath, 'admin_only');
            }
            if ($context === 'guide') {
                gcv_oauth_fail($appUrl, '/login.html', 'guide_area');
            }
            if ($context === 'client') {
                gcv_oauth_fail($appUrl, '/guia/login.html', 'client_area');
            }
            gcv_oauth_fail($appUrl, $loginPath, 'oauth_user');
        }

        $pdo->prepare(
            'UPDATE gcv_users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?'
        )->execute([$googleId, $avatarUrl, $userId]);
    } else {
        // Conta nova
        if ($context === 'admin') {
            // Nunca cria admin via Google
            gcv_oauth_fail($appUrl, $loginPath, 'admin_only');
        }

        if ($context === 'guide') {
            $pdo->beginTransaction();
            try {
                $pdo->prepare(
                    'INSERT INTO gcv_users (name, email, google_id, avatar_url, role, status, email_verified) VALUES (?,?,?,?,\'guide\',\'pending\',1)'
                )->execute([$name, $email, $googleId, $avatarUrl]);
                $userId = (int)$pdo->lastInsertId();
                $pdo->prepare('INSERT INTO gcv_guides (user_id, cadastur) VALUES (?, NULL)')->execute([$userId]);
                $pdo->commit();
                gcv_user_grant_role($userId, 'guide');
                gcv_user_grant_role($userId, 'client');
                gcv_user_sync_primary_role($userId);
                try {
                    if (is_readable(__DIR__ . '/../helpers/mailer.php')) {
                        require_once __DIR__ . '/../helpers/mailer.php';
                        if (function_exists('mail_guide_pending_admin')) {
                            mail_guide_pending_admin($name, $email);
                        }
                    }
                } catch (Throwable) {
                }
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        } else {
            $pdo->prepare(
                'INSERT INTO gcv_users (name, email, google_id, avatar_url, role, status, email_verified) VALUES (?,?,?,?,\'client\',\'active\',1)'
            )->execute([$name, $email, $googleId, $avatarUrl]);
            $userId = (int)$pdo->lastInsertId();
            gcv_user_grant_role($userId, 'client');
            gcv_user_sync_primary_role($userId);
            try {
                if (is_readable(__DIR__ . '/../helpers/mailer.php')) {
                    require_once __DIR__ . '/../helpers/mailer.php';
                    if (function_exists('mail_welcome')) {
                        mail_welcome($email, $name);
                    }
                }
            } catch (Throwable) {
            }
        }
    }

    destroy_session();
    create_session($userId, $context);
    header('Location: ' . $appUrl . '/dashboard/');
    exit;
} catch (Throwable $e) {
    error_log('google-callback: ' . $e->getMessage());
    gcv_oauth_fail($appUrl, $loginPath, 'db');
}
