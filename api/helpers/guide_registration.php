<?php
declare(strict_types=1);

/**
 * Decisão de cadastro novo de guia: aprovar / recusar / bloquear.
 * Recusar mantém o perfil (status RECUSADO) e trava novo pedido por 45 dias.
 * O admin pode aprovar a qualquer momento. Bloquear elimina o perfil e impede o e-mail.
 */

function gcv_guide_reject_reason_presets(): array
{
    return [
        'Devido à alta demanda de guias cadastrados, não estamos aceitando novas inscrições. Entraremos em contato em breve ao lançarmos novas vagas',
        'Os dados enviados estão incompletos ou inconsistentes. Você pode se cadastrar novamente com as informações corretas.',
        'Não foi possível validar os documentos ou dados de identificação informados. Você pode tentar novamente com documentos atualizados.',
        'O perfil enviado não atende aos critérios atuais da plataforma. Você pode se cadastrar novamente em outro momento.',
    ];
}

function gcv_guide_email_blocked_message(): string
{
    return 'Este e-mail está bloqueado e não pode solicitar cadastro de guia.';
}

function gcv_guide_normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function gcv_blocked_guide_emails_ensure(?PDO $pdo = null): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $pdo = $pdo ?: db();
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_blocked_guide_emails (
              id INT UNSIGNED NOT NULL AUTO_INCREMENT,
              email VARCHAR(190) NOT NULL,
              reason VARCHAR(500) NULL,
              blocked_by INT UNSIGNED NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              UNIQUE KEY uq_blocked_guide_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('gcv_blocked_guide_emails_ensure: ' . $e->getMessage());
    }
}

function gcv_guide_email_is_blocked(string $email): bool
{
    $email = gcv_guide_normalize_email($email);
    if ($email === '' || !str_contains($email, '@')) {
        return false;
    }
    gcv_blocked_guide_emails_ensure();
    try {
        $st = db()->prepare('SELECT 1 FROM gcv_blocked_guide_emails WHERE email = ? LIMIT 1');
        $st->execute([$email]);
        return (bool)$st->fetchColumn();
    } catch (Throwable $e) {
        error_log('gcv_guide_email_is_blocked: ' . $e->getMessage());
        return false;
    }
}

function gcv_guide_email_block(string $email, string $reason, int $adminId): void
{
    $email = gcv_guide_normalize_email($email);
    if ($email === '') {
        return;
    }
    gcv_blocked_guide_emails_ensure();
    $st = db()->prepare(
        'INSERT INTO gcv_blocked_guide_emails (email, reason, blocked_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), blocked_by = VALUES(blocked_by), created_at = CURRENT_TIMESTAMP'
    );
    $st->execute([$email, $reason !== '' ? $reason : null, $adminId > 0 ? $adminId : null]);
}

function gcv_guide_email_unblock(string $email): bool
{
    $email = gcv_guide_normalize_email($email);
    if ($email === '') {
        return false;
    }
    gcv_blocked_guide_emails_ensure();
    $st = db()->prepare('DELETE FROM gcv_blocked_guide_emails WHERE email = ?');
    $st->execute([$email]);
    return $st->rowCount() > 0;
}

function gcv_guide_blocked_emails_list(): array
{
    gcv_blocked_guide_emails_ensure();
    try {
        $rows = db()->query(
            'SELECT email, reason, blocked_by, created_at
             FROM gcv_blocked_guide_emails
             ORDER BY created_at DESC'
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return $rows;
    } catch (Throwable $e) {
        error_log('gcv_guide_blocked_emails_list: ' . $e->getMessage());
        return [];
    }
}

function gcv_guide_resolve_reason(string $reason): string
{
    $reason = trim(preg_replace('/\s+/u', ' ', strip_tags($reason)) ?? '');
    if (function_exists('mb_substr')) {
        $reason = mb_substr($reason, 0, 500);
    } else {
        $reason = substr($reason, 0, 500);
    }
    return $reason;
}

function gcv_guide_reject_cooldown_days(): int
{
    return 45;
}

function gcv_guide_pending_snapshot(int $userId): ?array
{
    if ($userId <= 0) {
        return null;
    }
    $sql = 'SELECT u.id, u.name, u.email, u.status, u.role,
                g.full_name, g.nickname, g.phone, g.phone_ddi, g.approved_at,
                g.rejected_at, g.rejected_reason, g.rejected_by,
                COALESCE(g.profile_complete, 0) AS profile_complete
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ?
         LIMIT 1';
    try {
        $st = db()->prepare($sql);
        $st->execute([$userId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (Throwable $e) {
        $st = db()->prepare(
            'SELECT u.id, u.name, u.email, u.status, u.role,
                    g.full_name, g.nickname, g.phone, g.phone_ddi, g.approved_at,
                    COALESCE(g.profile_complete, 0) AS profile_complete
             FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.id = ?
             LIMIT 1'
        );
        $st->execute([$userId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}

/** Cadastro recusado que nunca foi aprovado — o guia ainda pode entrar no perfil. */
function gcv_guide_rejected_may_login(int $userId): bool
{
    try {
        $st = db()->prepare('SELECT approved_at FROM gcv_guides WHERE user_id = ? LIMIT 1');
        $st->execute([$userId]);
        $approved = $st->fetchColumn();
        return $approved === null || $approved === false || $approved === '';
    } catch (Throwable $e) {
        return false;
    }
}

function gcv_guide_is_unapproved_rejected(array $row): bool
{
    $status = (string)($row['status'] ?? $row['user_status'] ?? '');
    return $status === 'suspended' && empty($row['approved_at']);
}

/**
 * @return array{rejected:bool,reason:string,days_left:int,can_submit:bool,until:?string}
 */
function gcv_guide_submit_cooldown(?array $row): array
{
    $out = [
        'rejected' => false,
        'reason' => '',
        'days_left' => 0,
        'can_submit' => true,
        'until' => null,
    ];
    if (!$row || !gcv_guide_is_unapproved_rejected($row)) {
        return $out;
    }
    $out['rejected'] = true;
    $out['reason'] = trim((string)($row['rejected_reason'] ?? ''));
    $from = trim((string)($row['rejected_at'] ?? ''));
    $ts = $from !== '' ? strtotime($from) : time();
    if ($ts === false) {
        $ts = time();
    }
    $until = $ts + (gcv_guide_reject_cooldown_days() * 86400);
    $out['until'] = date('Y-m-d', $until);
    $left = (int)ceil(($until - time()) / 86400);
    if ($left < 0) {
        $left = 0;
    }
    $out['days_left'] = $left;
    $out['can_submit'] = $left === 0;
    return $out;
}

function gcv_guide_can_admin_decide(array $row): bool
{
    $status = (string)($row['status'] ?? '');
    if (!empty($row['approved_at'])) {
        return false;
    }
    return in_array($status, ['pending', 'suspended'], true);
}

function gcv_guide_display_name(array $row): string
{
    foreach (['full_name', 'nickname', 'name'] as $key) {
        $v = trim((string)($row[$key] ?? ''));
        if ($v !== '') {
            return $v;
        }
    }
    return 'Guia';
}

function gcv_delete_unapproved_guide_account(int $userId): void
{
    $row = gcv_guide_pending_snapshot($userId);
    if (!$row) {
        throw new RuntimeException('Guia não encontrado');
    }
    $status = (string)($row['status'] ?? '');
    if (!empty($row['approved_at']) || !in_array($status, ['pending', 'suspended'], true)) {
        throw new RuntimeException('Só é possível eliminar cadastro que nunca foi aprovado.');
    }

    $pdo = db();
    $deletes = [
        'DELETE FROM gcv_sessions WHERE user_id = ?',
        'DELETE FROM gcv_password_resets WHERE user_id = ?',
        'DELETE FROM gcv_user_roles WHERE user_id = ?',
        'DELETE FROM gcv_inbox WHERE user_id = ?',
        'DELETE FROM gcv_client_profiles WHERE user_id = ?',
        'DELETE FROM gcv_guide_financial WHERE guide_user_id = ?',
        'DELETE FROM gcv_guides WHERE user_id = ?',
    ];

    $pdo->beginTransaction();
    try {
        foreach ($deletes as $sql) {
            try {
                $pdo->prepare($sql)->execute([$userId]);
            } catch (Throwable $e) {
                // tabela pode não existir neste ambiente
            }
        }
        $pdo->prepare('DELETE FROM gcv_users WHERE id = ?')->execute([$userId]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function gcv_finish_http_response(): void
{
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
        return;
    }
    ignore_user_abort(true);
    while (ob_get_level() > 0) {
        @ob_end_flush();
    }
    flush();
}

function gcv_guide_notify_registration_decision(string $kind, array $row, string $reason = ''): void
{
    $name = gcv_guide_display_name($row);
    $email = gcv_guide_normalize_email((string)($row['email'] ?? ''));
    $reason = trim($reason);
    $phone = trim((string)($row['phone'] ?? ''));
    $ddi = preg_replace('/\D+/', '', (string)($row['phone_ddi'] ?? '')) ?: '55';

    try {
        require_once __DIR__ . '/mailer.php';
        if ($kind === 'approved') {
            mail_guide_approved($email, $name);
        } elseif ($kind === 'blocked') {
            mail_guide_blocked($email, $name, $reason);
        } else {
            mail_guide_rejected($email, $name, $reason);
        }
    } catch (Throwable $e) {
        error_log('guide registration mail: ' . $e->getMessage());
    }

    $text = '';
    if ($kind === 'approved') {
        $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
        $text = "✅ Seu cadastro de guia foi aprovado!\n\n"
            . 'Olá, ' . $name . "!\n\n"
            . "Agora você pode publicar sua primeira excursão no painel:\n"
            . $appUrl . '/dashboard/#publicar';
    } elseif ($kind === 'blocked') {
        $text = 'Olá, ' . $name . ".\n\n"
            . "Seu pedido de cadastro como guia não foi aceito e este e-mail foi bloqueado para novas inscrições.\n\n"
            . 'Motivo: ' . $reason;
    } else {
        $text = 'Olá, ' . $name . ".\n\n"
            . "Após análise, seu cadastro como guia não foi aprovado.\n\n"
            . 'Motivo: ' . $reason . "\n\n"
            . 'Seu perfil permanece no sistema. Você poderá solicitar uma nova aprovação em '
            . gcv_guide_reject_cooldown_days() . ' dias. O administrador pode aprovar a qualquer momento.';
    }

    if ($phone === '' || $text === '') {
        return;
    }
    try {
        require_once __DIR__ . '/purchase_notify.php';
        $wa = gcv_whatsapp_normalize_phone($phone, $ddi);
        if ($wa !== '') {
            gcv_whatsapp_send_text($wa, $text);
        }
    } catch (Throwable $e) {
        error_log('guide registration whatsapp: ' . $e->getMessage());
    }
}

/**
 * Recusa cadastro novo: envia motivo, mantém o perfil e trava novo pedido por 45 dias.
 */
function gcv_guide_reject_registration(int $userId, string $reason, int $adminId = 0): array
{
    $reason = gcv_guide_resolve_reason($reason);
    if ($reason === '') {
        throw new InvalidArgumentException('Informe o motivo da recusa.');
    }
    $row = gcv_guide_pending_snapshot($userId);
    if (!$row) {
        throw new RuntimeException('Guia não encontrado');
    }
    if ((string)($row['status'] ?? '') !== 'pending' || !empty($row['approved_at'])) {
        throw new RuntimeException('Recusar é só para cadastro novo. Perfil já aprovado deve ser cancelado.');
    }
    $pdo = db();
    $pdo->prepare('UPDATE gcv_users SET status = \'suspended\' WHERE id = ?')->execute([$userId]);
    try {
        $pdo->prepare(
            'UPDATE gcv_guides SET rejected_at = NOW(), rejected_reason = ?, rejected_by = ? WHERE user_id = ?'
        )->execute([$reason, $adminId > 0 ? $adminId : null, $userId]);
    } catch (Throwable $e) {
        error_log('reject_registration columns: ' . $e->getMessage());
    }
    $row['status'] = 'suspended';
    $row['rejected_at'] = date('Y-m-d H:i:s');
    $row['rejected_reason'] = $reason;
    return $row + ['_reason' => $reason, '_kind' => 'rejected'];
}

/**
 * Bloqueia o e-mail, envia motivo e apaga o perfil que nunca foi aprovado.
 */
function gcv_guide_block_registration(int $userId, string $reason, int $adminId): array
{
    $reason = gcv_guide_resolve_reason($reason);
    if ($reason === '') {
        throw new InvalidArgumentException('Informe o motivo do bloqueio.');
    }
    $row = gcv_guide_pending_snapshot($userId);
    if (!$row) {
        throw new RuntimeException('Guia não encontrado');
    }
    if (!gcv_guide_can_admin_decide($row)) {
        throw new RuntimeException('Bloquear cadastro novo é só para perfil que nunca foi aprovado.');
    }
    $email = gcv_guide_normalize_email((string)($row['email'] ?? ''));
    if ($email === '') {
        throw new RuntimeException('E-mail do cadastro inválido.');
    }
    if (function_exists('gcv_is_admin_allowlisted') && gcv_is_admin_allowlisted($email)) {
        throw new RuntimeException('Não é possível bloquear um e-mail da administração.');
    }
    gcv_guide_email_block($email, $reason, $adminId);
    gcv_delete_unapproved_guide_account($userId);
    return $row + ['_reason' => $reason, '_kind' => 'blocked'];
}
