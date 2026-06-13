<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function auth_session_start(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 86400,
            'path'     => '/',
            'domain'   => '',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function current_user(): ?array {
    $sessionId = $_COOKIE['gcv_session'] ?? null;
    if (!$sessionId) return null;

    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.lang, u.status, u.email_verified
         FROM gcv_sessions s
         JOIN gcv_users u ON u.id = s.user_id
         WHERE s.session_id = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([$sessionId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_auth(): array {
    $user = current_user();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Não autenticado']);
        exit;
    }
    return $user;
}

function require_role(string $role): array {
    $user = require_auth();
    if ($user['role'] !== $role && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Acesso negado']);
        exit;
    }
    return $user;
}

function require_admin(): array {
    $user = require_auth();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Acesso negado']);
        exit;
    }
    return $user;
}

function create_session(int $userId): string {
    $sessionId = bin2hex(random_bytes(64));
    $ip        = $_SERVER['REMOTE_ADDR'] ?? null;
    $ua        = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300);
    $expires   = date('Y-m-d H:i:s', time() + 86400);

    db()->prepare(
        'INSERT INTO gcv_sessions (session_id, user_id, ip, user_agent, expires_at) VALUES (?,?,?,?,?)'
    )->execute([$sessionId, $userId, $ip, $ua, $expires]);

    setcookie('gcv_session', $sessionId, [
        'expires'  => time() + 86400,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return $sessionId;
}

function destroy_session(): void {
    $sessionId = $_COOKIE['gcv_session'] ?? null;
    if ($sessionId) {
        db()->prepare('DELETE FROM gcv_sessions WHERE session_id = ?')->execute([$sessionId]);
        setcookie('gcv_session', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}

function destroy_all_user_sessions(int $userId): void {
    db()->prepare('DELETE FROM gcv_sessions WHERE user_id = ?')->execute([$userId]);
}

function generate_csrf(): string {
    auth_session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(): void {
    auth_session_start();
    $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Token CSRF inválido']);
        exit;
    }
}

function json_response(bool $ok, $data = null, string $error = '', int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    if ($ok) {
        echo json_encode(['ok' => true, 'data' => $data]);
    } else {
        echo json_encode(['ok' => false, 'error' => $error]);
    }
    exit;
}
