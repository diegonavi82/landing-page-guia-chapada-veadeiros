<?php
declare(strict_types=1);

/**
 * Confirmação de e-mail do guia: código de 6 dígitos + link.
 */
require_once __DIR__ . '/db.php';

function gcv_email_verify_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        $cols = db()->query('SHOW COLUMNS FROM gcv_password_resets')->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $have = [];
        foreach ($cols as $c) {
            $have[strtolower((string)$c['Field'])] = true;
        }
        if (!isset($have['purpose'])) {
            db()->exec(
                "ALTER TABLE gcv_password_resets
                 ADD COLUMN purpose VARCHAR(32) NOT NULL DEFAULT 'password_reset' AFTER used"
            );
        }
    } catch (Throwable $e) {
        error_log('gcv_email_verify schema: ' . $e->getMessage());
    }
}

function gcv_email_verify_issue(int $userId, string $email, string $name, string $lang = 'pt'): array
{
    gcv_email_verify_ensure_schema();
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $code6 = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', time() + 86400);

    try {
        db()->prepare(
            "UPDATE gcv_password_resets SET used = 1 WHERE user_id = ? AND purpose = 'email_verify' AND used = 0"
        )->execute([$userId]);
    } catch (Throwable $e) {
        db()->prepare('UPDATE gcv_password_resets SET used = 1 WHERE user_id = ? AND used = 0')->execute([$userId]);
    }

    try {
        db()->prepare(
            'INSERT INTO gcv_password_resets (user_id, token_hash, code_6, expires_at, purpose)
             VALUES (?,?,?,?,?)'
        )->execute([$userId, $tokenHash, $code6, $expires, 'email_verify']);
    } catch (Throwable $e) {
        db()->prepare(
            'INSERT INTO gcv_password_resets (user_id, token_hash, code_6, expires_at) VALUES (?,?,?,?)'
        )->execute([$userId, $tokenHash, $code6, $expires]);
    }

    if (!function_exists('mail_verify_email')) {
        require_once __DIR__ . '/mailer.php';
    }
    mail_verify_email($email, $name, $token, $code6, $lang);

    return ['token' => $token, 'code_6' => $code6];
}

function gcv_email_verify_find_row(?string $token, ?string $code6, ?string $email): ?array
{
    gcv_email_verify_ensure_schema();
    $token = trim((string)$token);
    $code6 = preg_replace('/\D+/', '', (string)$code6) ?? '';
    $email = strtolower(trim((string)$email));

    $purposeSql = "AND (r.purpose = 'email_verify' OR r.purpose IS NULL OR r.purpose = '')";
    try {
        if ($token !== '') {
            $st = db()->prepare(
                "SELECT r.id, r.user_id FROM gcv_password_resets r
                 WHERE r.token_hash = ? AND r.used = 0 AND r.expires_at > NOW()
                   {$purposeSql}
                 LIMIT 1"
            );
            $st->execute([hash('sha256', $token)]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        }
        if (strlen($code6) === 6 && $email !== '') {
            $st = db()->prepare(
                "SELECT r.id, r.user_id FROM gcv_password_resets r
                 JOIN gcv_users u ON u.id = r.user_id
                 WHERE r.code_6 = ? AND LOWER(u.email) = ? AND r.used = 0 AND r.expires_at > NOW()
                   {$purposeSql}
                 LIMIT 1"
            );
            $st->execute([$code6, $email]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        }
    } catch (Throwable $e) {
        if ($token !== '') {
            $st = db()->prepare(
                'SELECT id, user_id FROM gcv_password_resets
                 WHERE token_hash = ? AND used = 0 AND expires_at > NOW() LIMIT 1'
            );
            $st->execute([hash('sha256', $token)]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        }
        if (strlen($code6) === 6 && $email !== '') {
            $st = db()->prepare(
                'SELECT r.id, r.user_id FROM gcv_password_resets r
                 JOIN gcv_users u ON u.id = r.user_id
                 WHERE r.code_6 = ? AND LOWER(u.email) = ? AND r.used = 0 AND r.expires_at > NOW()
                 LIMIT 1'
            );
            $st->execute([$code6, $email]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        }
    }
    return null;
}

function gcv_email_verify_consume(array $row): int
{
    $userId = (int)$row['user_id'];
    db()->prepare('UPDATE gcv_users SET email_verified = 1 WHERE id = ?')->execute([$userId]);
    db()->prepare('UPDATE gcv_password_resets SET used = 1 WHERE id = ?')->execute([(int)$row['id']]);
    try {
        db()->prepare(
            "UPDATE gcv_password_resets SET used = 1 WHERE user_id = ? AND purpose = 'email_verify' AND used = 0"
        )->execute([$userId]);
    } catch (Throwable $e) {
        // ignore
    }
    return $userId;
}

function gcv_require_guide_email_verified(array $user): void
{
    if (!empty($user['email_verified'])) {
        return;
    }
    json_response(false, null, 'Confirme seu e-mail para continuar o cadastro.', 403);
}

function gcv_require_guide_approved(array $user): void
{
    if (($user['status'] ?? '') === 'active') {
        return;
    }
    json_response(false, null, 'Seu cadastro ainda não foi aprovado. Complete o perfil e aguarde a análise.', 403);
}
