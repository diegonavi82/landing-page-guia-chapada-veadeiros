<?php
declare(strict_types=1);

/**
 * Campanha de indicação.
 * O convite vai por telefone (DDI + número, como no perfil) ou por e-mail.
 * Os dois recebem a mesma URL. O ponto sai só para o guia; o valor por pessoa sai no primeiro passeio pago.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/validator.php';

function gcv_referral_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $file = dirname(__DIR__) . '/database/migration_indicacoes.sql';
    if (!is_file($file)) {
        $done = true;
        return;
    }
    try {
        $sql = (string)file_get_contents($file);
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
        foreach (preg_split('/;\s*\n/', $sql) ?: [] as $stmt) {
            $stmt = trim($stmt);
            if ($stmt === '' || str_starts_with($stmt, '--')) {
                continue;
            }
            db()->exec($stmt);
        }
        $done = true;
    } catch (Throwable $e) {
        error_log('referral schema: ' . $e->getMessage());
    }
    gcv_referral_ensure_columns();
    $done = true;
}

/** E-mail opcional e telefone que pode ficar vazio quando o convite vai só por e-mail. */
function gcv_referral_ensure_columns(): void
{
    try {
        $cols = db()->query('SHOW COLUMNS FROM gcv_referrals')->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return;
    }
    $have = [];
    $phoneNull = false;
    foreach ($cols as $col) {
        $name = strtolower((string) ($col['Field'] ?? ''));
        $have[$name] = true;
        if ($name === 'phone') {
            $phoneNull = strtoupper((string) ($col['Null'] ?? '')) === 'YES';
        }
    }
    try {
        if (empty($have['email'])) {
            db()->exec('ALTER TABLE gcv_referrals ADD COLUMN email VARCHAR(190) NULL AFTER phone');
            try {
                db()->exec('ALTER TABLE gcv_referrals ADD UNIQUE KEY uq_ref_email (email)');
            } catch (Throwable $e) {
                error_log('referral email unique: ' . $e->getMessage());
            }
        }
        if (!$phoneNull) {
            db()->exec('ALTER TABLE gcv_referrals MODIFY phone VARCHAR(20) NULL');
        }
        if (empty($have['earned_cents'])) {
            db()->exec('ALTER TABLE gcv_referrals ADD COLUMN earned_cents INT UNSIGNED NULL AFTER cashback_cents');
        }
        if (empty($have['people'])) {
            db()->exec('ALTER TABLE gcv_referrals ADD COLUMN people SMALLINT UNSIGNED NULL AFTER earned_cents');
        }
    } catch (Throwable $e) {
        error_log('referral columns: ' . $e->getMessage());
    }
}

function gcv_referral_lang(string $lang): string
{
    return in_array($lang, ['pt', 'en', 'es'], true) ? $lang : 'pt';
}

function gcv_referral_origin(): string
{
    if (!function_exists('gcv_saida_site_origin') && is_file(__DIR__ . '/saida_share.php')) {
        require_once __DIR__ . '/saida_share.php';
    }
    if (function_exists('gcv_saida_site_origin')) {
        return gcv_saida_site_origin();
    }
    return 'https://www.guiachapadaveadeiros.com';
}

/** Telefone no padrão do perfil: DDI + número nacional. Vazio se inválido. */
function gcv_referral_phone(string $raw, string $ddi = '+55', string $iso = 'br'): string
{
    $check = gcv_validate_contact_phone($raw, $ddi, $iso, true);
    if (empty($check['ok']) || ($check['phone'] ?? '') === '') {
        return '';
    }
    $ddiDigits = preg_replace('/\D+/', '', (string) ($check['ddi'] ?? $ddi)) ?: '55';
    return $ddiDigits . $check['phone'];
}

function gcv_referral_error(string $lang, string $key): string
{
    $all = [
        'pt' => [
            'role' => 'Entre como cliente ou guia para indicar.',
            'suspended' => 'Esta conta não pode indicar agora.',
            'need' => 'Informe o telefone ou o e-mail.',
            'phone' => 'Telefone: DDD (2 dígitos) + número (8 ou 9 dígitos)',
            'own_phone' => 'Não dá para indicar o próprio telefone.',
            'taken_phone' => 'Este telefone já tem conta no site.',
            'dup_phone' => 'Este telefone já foi indicado.',
            'email' => 'E-mail inválido.',
            'own_email' => 'Não dá para indicar o próprio e-mail.',
            'taken_email' => 'Este e-mail já tem conta no site.',
            'dup_email' => 'Este e-mail já foi indicado.',
        ],
        'en' => [
            'role' => 'Sign in as a client or guide to refer someone.',
            'suspended' => 'This account cannot refer anyone right now.',
            'need' => 'Enter a phone number or an email.',
            'phone' => 'Phone: area code (2 digits) + number (8 or 9 digits)',
            'own_phone' => 'You cannot refer your own phone number.',
            'taken_phone' => 'This phone number already has an account.',
            'dup_phone' => 'This phone number was already referred.',
            'email' => 'Invalid email.',
            'own_email' => 'You cannot refer your own email.',
            'taken_email' => 'This email already has an account.',
            'dup_email' => 'This email was already referred.',
        ],
        'es' => [
            'role' => 'Entra como cliente o guía para indicar.',
            'suspended' => 'Esta cuenta no puede indicar ahora.',
            'need' => 'Indica el teléfono o el correo.',
            'phone' => 'Teléfono: código de área (2 dígitos) + número (8 o 9 dígitos)',
            'own_phone' => 'No puedes indicar tu propio teléfono.',
            'taken_phone' => 'Este teléfono ya tiene cuenta en el sitio.',
            'dup_phone' => 'Este teléfono ya fue indicado.',
            'email' => 'Correo inválido.',
            'own_email' => 'No puedes indicar tu propio correo.',
            'taken_email' => 'Este correo ya tiene cuenta en el sitio.',
            'dup_email' => 'Este correo ya fue indicado.',
        ],
    ];
    $lang = gcv_referral_lang($lang);
    return $all[$lang][$key] ?? $all['pt'][$key] ?? $key;
}

/** @return array<string,true> */
function gcv_referral_user_phones(int $userId): array
{
    $out = [];
    $pull = static function (?array $row) use (&$out): void {
        if (!$row) {
            return;
        }
        $phone = trim((string)($row['phone'] ?? ''));
        if ($phone === '') {
            return;
        }
        $norm = gcv_referral_phone($phone, (string)($row['phone_ddi'] ?? '+55'));
        if ($norm === '') {
            $norm = gcv_referral_phone($phone);
        }
        if ($norm !== '') {
            $out[$norm] = true;
        }
    };
    try {
        $st = db()->prepare('SELECT phone, phone_ddi FROM gcv_client_profiles WHERE user_id = ? LIMIT 1');
        $st->execute([$userId]);
        $pull($st->fetch(PDO::FETCH_ASSOC) ?: null);
    } catch (Throwable $e) {
        error_log('referral phone client: ' . $e->getMessage());
    }
    try {
        $st = db()->prepare('SELECT phone, phone_ddi FROM gcv_guides WHERE user_id = ? LIMIT 1');
        $st->execute([$userId]);
        $pull($st->fetch(PDO::FETCH_ASSOC) ?: null);
    } catch (Throwable $e) {
        error_log('referral phone guide: ' . $e->getMessage());
    }
    return $out;
}

function gcv_referral_phone_owner(string $e164): int
{
    $national = str_starts_with($e164, '55') ? substr($e164, 2) : $e164;
    $cands = array_values(array_unique(array_filter([$e164, $national])));
    if (!$cands) {
        return 0;
    }
    $place = implode(',', array_fill(0, count($cands), '?'));
    foreach (['gcv_client_profiles', 'gcv_guides'] as $table) {
        try {
            $st = db()->prepare("SELECT user_id FROM {$table} WHERE phone IN ($place) LIMIT 1");
            $st->execute($cands);
            $id = (int)$st->fetchColumn();
            if ($id > 0) {
                return $id;
            }
        } catch (Throwable $e) {
            error_log('referral owner: ' . $e->getMessage());
        }
    }
    return 0;
}

function gcv_referral_new_code(): string
{
    $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $max = strlen($abc) - 1;
    $st = db()->prepare('SELECT id FROM gcv_referrals WHERE code = ? LIMIT 1');
    for ($n = 0; $n < 8; $n++) {
        $code = '';
        for ($i = 0; $i < 8; $i++) {
            $code .= $abc[random_int(0, $max)];
        }
        $st->execute([$code]);
        if (!$st->fetch()) {
            return $code;
        }
    }
    throw new RuntimeException('Não foi possível gerar o código da indicação.');
}

function gcv_referral_cashback_cents(string $role): int
{
    if (!function_exists('gcv_tarifario_regras_get')) {
        require_once __DIR__ . '/tarifarios.php';
    }
    $regras = gcv_tarifario_regras_get(db());
    $reais = $role === 'guide'
        ? (int)($regras['cashback_guia_reais'] ?? 0)
        : (int)($regras['cashback_cliente_reais'] ?? 0);
    return max(0, $reais) * 100;
}

/** @return array{0:?string,1:?string} */
function gcv_referral_dates(?string $from, ?string $to): array
{
    $parse = static function (?string $raw): ?string {
        $raw = trim((string)$raw);
        if ($raw === '') {
            return null;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            throw new InvalidArgumentException('Data inválida.');
        }
        $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $raw);
        if (!$dt || $dt->format('Y-m-d') !== $raw) {
            throw new InvalidArgumentException('Data inválida.');
        }
        return $raw;
    };
    $a = $parse($from);
    $b = $parse($to);
    if ($a === null && $b !== null) {
        $a = $b;
    }
    if ($a !== null && $b === null) {
        $b = $a;
    }
    if ($a !== null && $b !== null && $a > $b) {
        [$a, $b] = [$b, $a];
    }
    if ($a !== null) {
        $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
        if ($b < $today) {
            throw new InvalidArgumentException('A data da viagem precisa ser hoje ou depois.');
        }
    }
    return [$a, $b];
}

function gcv_referral_signup_path(string $lang): string
{
    if ($lang === 'en') {
        return '/en/register.html';
    }
    if ($lang === 'es') {
        return '/es/registro.html';
    }
    return '/cadastro.html';
}

function gcv_referral_confirm_path(string $lang): string
{
    if ($lang === 'en') {
        return '/en/confirmar-email.html';
    }
    if ($lang === 'es') {
        return '/es/confirmar-email.html';
    }
    return '/confirmar-email.html';
}

function gcv_referral_public_link(string $code, ?string $from, ?string $to, string $lang): string
{
    $lang = gcv_referral_lang($lang);
    $origin = gcv_referral_origin();
    if ($from) {
        $prefix = $lang === 'en' ? '/en/' : ($lang === 'es' ? '/es/' : '/');
        $q = 'ind=' . rawurlencode($code) . '&de=' . rawurlencode($from);
        if ($to && $to !== $from) {
            $q .= '&ate=' . rawurlencode($to);
        }
        return $origin . $prefix . '?' . $q;
    }
    return $origin . gcv_referral_signup_path($lang) . '?ind=' . rawurlencode($code);
}

function gcv_referral_format_date(string $iso, string $lang): string
{
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $iso);
    if (!$dt) {
        return $iso;
    }
    if ($lang === 'en') {
        return $dt->format('m/d/Y');
    }
    return $dt->format('d/m/Y');
}

function gcv_referral_message(string $name, string $link, ?string $from, ?string $to, string $lang): string
{
    $lang = gcv_referral_lang($lang);
    $fallback = $lang === 'en' ? 'Someone' : ($lang === 'es' ? 'Alguien' : 'Alguém');
    $who = trim($name) !== '' ? trim($name) : $fallback;
    $who = (preg_split('/\s+/u', $who) ?: [$who])[0];
    if ($from) {
        $de = gcv_referral_format_date($from, $lang);
        $ate = $to ? gcv_referral_format_date($to, $lang) : $de;
        if ($lang === 'en') {
            $when = $de === $ate ? $de : ($de . ' to ' . $ate);
            return $who . ' invited you to enjoy the upcoming tours from ' . $when . ': ' . $link;
        }
        if ($lang === 'es') {
            $when = $de === $ate ? $de : ($de . ' al ' . $ate);
            return $who . ' te indicó para disfrutar los próximos paseos del ' . $when . ': ' . $link;
        }
        $when = $de === $ate ? ('de ' . $de) : ('de ' . $de . ' a ' . $ate);
        return $who . ' te indicou para curtir os próximos passeios ' . $when . ': ' . $link;
    }
    if ($lang === 'en') {
        return $who . ' invited you to Chapada dos Veadeiros. Create your account with email and password, then confirm the email: ' . $link;
    }
    if ($lang === 'es') {
        return $who . ' te invitó a la Chapada dos Veadeiros. Crea tu cuenta con correo y contraseña y confirma el correo: ' . $link;
    }
    return $who . ' te convidou para a Chapada dos Veadeiros. Crie sua conta com e-mail e senha e confirme o e-mail: ' . $link;
}

/**
 * Convite por telefone (DDI + número, como no perfil) ou por e-mail.
 * Os dois recebem a mesma URL.
 *
 * @return array<string,mixed>
 */
function gcv_referral_create(
    array $user,
    string $phoneRaw,
    ?string $dateFrom,
    ?string $dateTo,
    string $ddi = '+55',
    string $iso = 'br',
    string $emailRaw = ''
): array {
    gcv_referral_ensure_schema();
    $lang = gcv_referral_lang((string)($user['lang'] ?? 'pt'));
    $role = (string)($user['active_role'] ?? $user['role'] ?? '');
    if (!in_array($role, ['client', 'guide'], true)) {
        throw new InvalidArgumentException(gcv_referral_error($lang, 'role'));
    }
    if (($user['status'] ?? '') === 'suspended' || ($user['status'] ?? '') === 'cancelled') {
        throw new InvalidArgumentException(gcv_referral_error($lang, 'suspended'));
    }

    $emailRaw = trim($emailRaw);
    $email = $emailRaw === '' ? '' : validate_email($emailRaw);
    if ($emailRaw !== '' && $email === '') {
        throw new InvalidArgumentException(gcv_referral_error($lang, 'email'));
    }

    $phoneDigits = preg_replace('/\D+/', '', $phoneRaw) ?? '';
    $phone = '';
    if ($phoneDigits !== '') {
        $check = gcv_validate_contact_phone($phoneRaw, $ddi, $iso, true);
        if (empty($check['ok']) || ($check['phone'] ?? '') === '') {
            $detail = (string)($check['error'] ?? '');
            throw new InvalidArgumentException($lang === 'pt' && $detail !== '' ? $detail : gcv_referral_error($lang, 'phone'));
        }
        $ddiDigits = preg_replace('/\D+/', '', (string)($check['ddi'] ?? $ddi)) ?: '55';
        $phone = $ddiDigits . $check['phone'];
    }
    if ($phone === '' && $email === '') {
        throw new InvalidArgumentException(gcv_referral_error($lang, 'need'));
    }

    $userId = (int)$user['id'];
    if ($phone !== '') {
        if (isset(gcv_referral_user_phones($userId)[$phone]) || gcv_referral_phone_owner($phone) === $userId) {
            throw new InvalidArgumentException(gcv_referral_error($lang, 'own_phone'));
        }
        if (gcv_referral_phone_owner($phone) > 0) {
            throw new InvalidArgumentException(gcv_referral_error($lang, 'taken_phone'));
        }
        $dup = db()->prepare('SELECT id FROM gcv_referrals WHERE phone = ? LIMIT 1');
        $dup->execute([$phone]);
        if ($dup->fetch()) {
            throw new InvalidArgumentException(gcv_referral_error($lang, 'dup_phone'));
        }
    }
    if ($email !== '') {
        $ownEmail = strtolower(trim((string)($user['email'] ?? '')));
        if ($ownEmail !== '' && $ownEmail === $email) {
            throw new InvalidArgumentException(gcv_referral_error($lang, 'own_email'));
        }
        $taken = db()->prepare('SELECT id FROM gcv_users WHERE LOWER(email) = ? LIMIT 1');
        $taken->execute([$email]);
        if ($taken->fetch()) {
            throw new InvalidArgumentException(gcv_referral_error($lang, 'taken_email'));
        }
        $dupMail = db()->prepare('SELECT id FROM gcv_referrals WHERE LOWER(email) = ? LIMIT 1');
        $dupMail->execute([$email]);
        if ($dupMail->fetch()) {
            throw new InvalidArgumentException(gcv_referral_error($lang, 'dup_email'));
        }
    }

    [$from, $to] = gcv_referral_dates($dateFrom, $dateTo);
    $code = gcv_referral_new_code();
    $cents = gcv_referral_cashback_cents($role);
    db()->prepare(
        'INSERT INTO gcv_referrals (code, referrer_user_id, referrer_role, phone, email, date_from, date_to, cashback_cents, status)
         VALUES (?,?,?,?,?,?,?,?,\'sent\')'
    )->execute([$code, $userId, $role, $phone !== '' ? $phone : null, $email !== '' ? $email : null, $from, $to, $cents]);
    $link = gcv_referral_public_link($code, $from, $to, $lang);
    $text = gcv_referral_message((string)($user['name'] ?? ''), $link, $from, $to, $lang);
    $sent = false;
    if ($phone !== '') {
        if (!function_exists('gcv_whatsapp_send_text')) {
            require_once __DIR__ . '/purchase_notify.php';
        }
        if (function_exists('gcv_whatsapp_send_text')) {
            try {
                $sent = gcv_whatsapp_send_text($phone, $text);
            } catch (Throwable $e) {
                error_log('referral whatsapp: ' . $e->getMessage());
            }
        }
    }
    $emailSent = false;
    if ($email !== '') {
        $emailSent = gcv_referral_send_email($email, $text, $link, $lang);
    }
    return [
        'code' => $code,
        'sent' => $sent,
        'email_sent' => $emailSent,
        'link' => $link,
        'wa_url' => $phone !== '' ? ('https://wa.me/' . $phone . '?text=' . rawurlencode($text)) : '',
        'cashback_cents' => $cents,
        'date_from' => $from,
        'date_to' => $to,
        'phone' => $phone,
        'email' => $email,
    ];
}

function gcv_referral_send_email(string $to, string $text, string $link, string $lang): bool
{
    if (!function_exists('send_mail')) {
        require_once __DIR__ . '/mailer.php';
    }
    if (!function_exists('send_mail')) {
        return false;
    }
    $safeText = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $body = '<p>' . $safeText . '</p><p><a href="' . $safeLink . '">' . $safeLink . '</a></p>';
    $subjects = [
        'pt' => 'Convite para a Chapada dos Veadeiros',
        'en' => 'Invitation to Chapada dos Veadeiros',
        'es' => 'Invitación a la Chapada dos Veadeiros',
    ];
    try {
        return send_mail($to, $subjects[gcv_referral_lang($lang)] ?? $subjects['pt'], $body);
    } catch (Throwable $e) {
        error_log('referral email: ' . $e->getMessage());
        return false;
    }
}

function gcv_referral_find_code(string $code): ?array
{
    gcv_referral_ensure_schema();
    $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    if ($code === '' || strlen($code) < 6 || strlen($code) > 12) {
        return null;
    }
    $st = db()->prepare('SELECT * FROM gcv_referrals WHERE code = ? LIMIT 1');
    $st->execute([$code]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_referral_has_paid_sale(int $userId, string $email): bool
{
    $email = strtolower(trim($email));
    try {
        $st = db()->prepare(
            "SELECT 1 FROM gcv_sales
             WHERE deleted_at IS NULL
               AND sale_status = 'PAID'
               AND (tourist_user_id = ? OR LOWER(tourist_email) = ?)
             LIMIT 1"
        );
        $st->execute([$userId, $email]);
        return (bool)$st->fetchColumn();
    } catch (Throwable $e) {
        error_log('referral paid sale: ' . $e->getMessage());
        return false;
    }
}

/**
 * Gruda o código na conta. Antes da confirmação do e-mail fica pendente.
 * Conta que já viajou não gera prêmio.
 */
function gcv_referral_attach(int $userId, string $code): ?array
{
    $row = gcv_referral_find_code($code);
    if (!$row || $userId <= 0) {
        return null;
    }
    if ((int)$row['referrer_user_id'] === $userId) {
        return $row;
    }
    $st = db()->prepare('SELECT id, email, email_verified FROM gcv_users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        return null;
    }
    $status = (string)$row['status'];
    $claimed = (int)($row['claim_user_id'] ?? 0);
    $referred = (int)($row['referred_user_id'] ?? 0);
    if (in_array($status, ['rewarded', 'nao_conta', 'linked'], true) && $referred > 0 && $referred !== $userId) {
        return $row;
    }
    if ($claimed > 0 && $claimed !== $userId && $referred !== $userId) {
        return $row;
    }
    $verified = !empty($user['email_verified']);
    $paid = gcv_referral_has_paid_sale($userId, (string)$user['email']);
    if (!$verified) {
        db()->prepare(
            "UPDATE gcv_referrals SET claim_user_id = ?, status = 'pending_email' WHERE id = ? AND status IN ('sent','pending_email')"
        )->execute([$userId, (int)$row['id']]);
        $row['claim_user_id'] = $userId;
        $row['status'] = 'pending_email';
        return $row;
    }
    if ($paid || $status === 'nao_conta') {
        db()->prepare(
            "UPDATE gcv_referrals
             SET claim_user_id = ?, referred_user_id = ?, status = 'nao_conta'
             WHERE id = ? AND status IN ('sent','pending_email','nao_conta')"
        )->execute([$userId, $userId, (int)$row['id']]);
        $row['status'] = 'nao_conta';
        $row['referred_user_id'] = $userId;
        return $row;
    }
    db()->prepare(
        "UPDATE gcv_referrals
         SET claim_user_id = ?, referred_user_id = ?, status = 'linked'
         WHERE id = ? AND status IN ('sent','pending_email','linked')"
    )->execute([$userId, $userId, (int)$row['id']]);
    $row['status'] = 'linked';
    $row['referred_user_id'] = $userId;
    return $row;
}

function gcv_referral_on_verified(int $userId): void
{
    gcv_referral_ensure_schema();
    if ($userId <= 0) {
        return;
    }
    try {
        $st = db()->prepare(
            "SELECT code FROM gcv_referrals WHERE claim_user_id = ? AND status IN ('pending_email','sent') ORDER BY id DESC LIMIT 1"
        );
        $st->execute([$userId]);
        $code = (string)$st->fetchColumn();
        if ($code !== '') {
            gcv_referral_attach($userId, $code);
        }
    } catch (Throwable $e) {
        error_log('referral on verified: ' . $e->getMessage());
    }
}

function gcv_wallet_balance(int $userId): int
{
    gcv_referral_ensure_schema();
    if ($userId <= 0) {
        return 0;
    }
    try {
        $st = db()->prepare('SELECT COALESCE(SUM(amount_cents),0) FROM gcv_wallet_ledger WHERE user_id = ?');
        $st->execute([$userId]);
        return (int)$st->fetchColumn();
    } catch (Throwable $e) {
        error_log('wallet balance: ' . $e->getMessage());
        return 0;
    }
}

function gcv_wallet_insert(PDO $pdo, int $userId, int $cents, string $kind, ?int $referralId, ?string $reservationId, ?int $withdrawalId, string $note): void
{
    $pdo->prepare(
        'INSERT INTO gcv_wallet_ledger (user_id, amount_cents, kind, referral_id, reservation_id, withdrawal_id, note)
         VALUES (?,?,?,?,?,?,?)'
    )->execute([
        $userId,
        $cents,
        $kind,
        $referralId ?: null,
        $reservationId !== null && $reservationId !== '' ? $reservationId : null,
        $withdrawalId ?: null,
        $note !== '' ? $note : null,
    ]);
}

/** Reserva saldo para um checkout. Devolve o quanto ficou retido (0 se não deu). */
function gcv_wallet_reserve(int $userId, string $reservationId, int $want): int
{
    gcv_referral_ensure_schema();
    $reservationId = strtoupper(trim($reservationId));
    $want = max(0, $want);
    if ($userId <= 0 || $reservationId === '' || $want < 1) {
        return 0;
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('SELECT id FROM gcv_users WHERE id = ? FOR UPDATE')->execute([$userId]);
        $have = $pdo->prepare("SELECT amount_cents FROM gcv_wallet_ledger WHERE kind = 'checkout' AND reservation_id = ? LIMIT 1");
        $have->execute([$reservationId]);
        $existing = $have->fetchColumn();
        if ($existing !== false) {
            $pdo->commit();
            return abs((int)$existing);
        }
        $sum = $pdo->prepare('SELECT COALESCE(SUM(amount_cents),0) FROM gcv_wallet_ledger WHERE user_id = ?');
        $sum->execute([$userId]);
        $balance = (int)$sum->fetchColumn();
        $take = min($want, max(0, $balance));
        if ($take < 1) {
            $pdo->commit();
            return 0;
        }
        gcv_wallet_insert($pdo, $userId, -$take, 'checkout', null, $reservationId, null, 'Uso no site');
        $pdo->commit();
        return $take;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('wallet reserve: ' . $e->getMessage());
        return 0;
    }
}

function gcv_wallet_reserve_for_email(string $email, string $reservationId, int $fullCents): int
{
    if (!function_exists('current_user')) {
        require_once __DIR__ . '/auth.php';
    }
    $user = current_user();
    if (!$user) {
        return 0;
    }
    if (strcasecmp((string)($user['email'] ?? ''), trim($email)) !== 0) {
        return 0;
    }
    return gcv_wallet_reserve((int)$user['id'], $reservationId, $fullCents);
}

function gcv_wallet_release(string $reservationId): void
{
    gcv_referral_ensure_schema();
    $reservationId = strtoupper(trim($reservationId));
    if ($reservationId === '') {
        return;
    }
    $pdo = db();
    try {
        $st = $pdo->prepare(
            "SELECT user_id, amount_cents FROM gcv_wallet_ledger WHERE kind = 'checkout' AND reservation_id = ? LIMIT 1"
        );
        $st->execute([$reservationId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return;
        }
        $done = $pdo->prepare(
            "SELECT id FROM gcv_wallet_ledger WHERE kind = 'checkout_release' AND reservation_id = ? LIMIT 1"
        );
        $done->execute([$reservationId]);
        if ($done->fetch()) {
            return;
        }
        $back = abs((int)$row['amount_cents']);
        if ($back < 1) {
            return;
        }
        gcv_wallet_insert($pdo, (int)$row['user_id'], $back, 'checkout_release', null, $reservationId, null, 'Checkout não pago');
    } catch (Throwable $e) {
        error_log('wallet release: ' . $e->getMessage());
    }
}

function gcv_wallet_arm(string $reservationId): void
{
    $GLOBALS['gcv_wallet_armed'] = strtoupper(trim($reservationId));
}

function gcv_wallet_disarm(): void
{
    unset($GLOBALS['gcv_wallet_armed']);
}

function gcv_wallet_release_armed(): void
{
    $id = (string)($GLOBALS['gcv_wallet_armed'] ?? '');
    unset($GLOBALS['gcv_wallet_armed']);
    if ($id !== '') {
        gcv_wallet_release($id);
    }
}

function gcv_wallet_release_expired(int $limit = 40): int
{
    gcv_referral_ensure_schema();
    if (!function_exists('gcv_pix_read_reservation')) {
        require_once __DIR__ . '/pix_reservation_store.php';
    }
    $n = 0;
    try {
        $rows = db()->query(
            "SELECT reservation_id FROM gcv_wallet_ledger
             WHERE kind = 'checkout' AND reservation_id IS NOT NULL
               AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
               AND created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)
             ORDER BY id DESC LIMIT 200"
        )->fetchAll(PDO::FETCH_COLUMN) ?: [];
    } catch (Throwable $e) {
        error_log('wallet expire list: ' . $e->getMessage());
        return 0;
    }
    foreach ($rows as $rid) {
        if ($n >= $limit) {
            break;
        }
        $rid = (string)$rid;
        $res = gcv_pix_read_reservation($rid);
        if ($res) {
            $status = gcv_pix_effective_status($res);
            if (in_array($status, ['PAID', 'AUTHORIZED', 'CARD_SAVED'], true)) {
                continue;
            }
            if ($status === 'PENDING') {
                continue;
            }
        }
        gcv_wallet_release($rid);
        $n++;
    }
    return $n;
}

/**
 * @return array{points:int,position:?int,rows:list<array<string,mixed>>}
 */
function gcv_referral_ranking(int $limit = 20): array
{
    gcv_referral_ensure_schema();
    try {
        $rows = db()->query(
            "SELECT r.referrer_user_id AS user_id, u.name,
                    COUNT(*) AS points, MIN(r.rewarded_at) AS first_at
             FROM gcv_referrals r
             INNER JOIN gcv_users u ON u.id = r.referrer_user_id
             WHERE r.status = 'rewarded' AND r.referrer_role = 'guide'
             GROUP BY r.referrer_user_id, u.name
             ORDER BY points DESC, first_at ASC, user_id ASC"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('referral ranking: ' . $e->getMessage());
        $rows = [];
    }
    $out = [];
    $i = 0;
    foreach ($rows as $row) {
        $i++;
        $out[] = [
            'position' => $i,
            'user_id' => (int)$row['user_id'],
            'name' => (string)$row['name'],
            'points' => (int)$row['points'],
        ];
    }
    return ['rows' => array_slice($out, 0, max(1, $limit)), 'all' => $out];
}

function gcv_referral_tail(string $raw): string
{
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if (strlen($digits) < 8) {
        return '';
    }
    return substr($digits, -8);
}

/**
 * Primeira compra paga de cada convite, para mostrar o check e as pessoas.
 *
 * @param list<array<string,mixed>> $items
 * @return array<int,array{people:int}>
 */
function gcv_referral_purchase_index(array $items): array
{
    $ids = [];
    $emails = [];
    $tails = [];
    foreach ($items as $item) {
        $uid = (int)($item['referred_user_id'] ?? 0);
        if ($uid > 0) {
            $ids[$uid] = true;
        }
        $email = strtolower(trim((string)($item['email'] ?? '')));
        if ($email !== '') {
            $emails[$email] = true;
        }
        $tail = gcv_referral_tail((string)($item['phone'] ?? ''));
        if ($tail !== '') {
            $tails[$tail] = true;
        }
    }
    if (!$ids && !$emails && !$tails) {
        return [];
    }
    $where = [];
    $params = [];
    if ($ids) {
        $where[] = 's.tourist_user_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
        foreach (array_keys($ids) as $id) {
            $params[] = $id;
        }
    }
    if ($emails) {
        $where[] = 'LOWER(s.tourist_email) IN (' . implode(',', array_fill(0, count($emails), '?')) . ')';
        foreach (array_keys($emails) as $email) {
            $params[] = $email;
        }
    }
    if ($tails) {
        $expr = "RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(s.tourist_phone,''),'+',''),' ',''),'-',''),'(',''),')',''), 8)";
        $where[] = $expr . ' IN (' . implode(',', array_fill(0, count($tails), '?')) . ')';
        foreach (array_keys($tails) as $tail) {
            $params[] = $tail;
        }
    }
    try {
        $st = db()->prepare(
            'SELECT s.tourist_user_id, s.tourist_email, s.tourist_phone, s.spots, e.date_iso
             FROM gcv_sales s
             LEFT JOIN gcv_excursions e ON e.id = s.excursion_id
             WHERE s.deleted_at IS NULL AND s.sale_status = \'PAID\'
               AND (' . implode(' OR ', $where) . ')
             ORDER BY e.date_iso ASC, s.id ASC
             LIMIT 400'
        );
        $st->execute($params);
        $sales = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('referral purchases: ' . $e->getMessage());
        return [];
    }
    $out = [];
    foreach ($items as $item) {
        $rid = (int)$item['id'];
        $uid = (int)($item['referred_user_id'] ?? 0);
        $email = strtolower(trim((string)($item['email'] ?? '')));
        $tail = gcv_referral_tail((string)($item['phone'] ?? ''));
        foreach ($sales as $sale) {
            $match = $uid > 0 && (int)$sale['tourist_user_id'] === $uid;
            $saleEmail = strtolower(trim((string)($sale['tourist_email'] ?? '')));
            if ($email !== '' && $saleEmail === $email) {
                $match = true;
            }
            $saleTail = gcv_referral_tail((string)($sale['tourist_phone'] ?? ''));
            if ($tail !== '' && $saleTail !== '' && $saleTail === $tail) {
                $match = true;
            }
            if (!$match) {
                continue;
            }
            $out[$rid] = ['people' => max(1, (int)($sale['spots'] ?? 1))];
            break;
        }
    }
    return $out;
}

/** @return array<string,mixed> */
function gcv_referral_panel(int $userId): array
{
    gcv_referral_ensure_schema();
    $st = db()->prepare(
        'SELECT id, code, phone, email, referred_user_id, referrer_role, date_from, date_to, cashback_cents, earned_cents, people, status, rewarded_at, created_at
         FROM gcv_referrals WHERE referrer_user_id = ? ORDER BY id DESC LIMIT 50'
    );
    $st->execute([$userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $purchases = gcv_referral_purchase_index($rows);
    $items = [];
    foreach ($rows as $row) {
        $id = (int)$row['id'];
        $status = (string)$row['status'];
        $purchase = $purchases[$id] ?? null;
        $earned = $row['earned_cents'];
        $people = null;
        if ($row['people'] !== null && $row['people'] !== '') {
            $people = (int)$row['people'];
        } elseif ($purchase && $status !== 'rewarded') {
            $people = (int)$purchase['people'];
        }
        $items[] = [
            'id' => $id,
            'code' => (string)$row['code'],
            'phone' => (string)($row['phone'] ?? ''),
            'email' => (string)($row['email'] ?? ''),
            'date_from' => $row['date_from'] ? (string)$row['date_from'] : null,
            'date_to' => $row['date_to'] ? (string)$row['date_to'] : null,
            'unit_cents' => (int)$row['cashback_cents'],
            'earned_cents' => $earned === null || $earned === '' ? null : (int)$earned,
            'people' => $people,
            'purchased' => $status === 'rewarded' || ($purchase && $status !== 'nao_conta'),
            'status' => $status,
            'rewarded_at' => $row['rewarded_at'] ? (string)$row['rewarded_at'] : null,
            'created_at' => (string)$row['created_at'],
        ];
    }
    $points = 0;
    foreach ($rows as $row) {
        if ((string)$row['status'] === 'rewarded' && (string)($row['referrer_role'] ?? '') === 'guide') {
            $points++;
        }
    }
    $rank = gcv_referral_ranking(20);
    $position = null;
    foreach ($rank['all'] as $row) {
        if ((int)$row['user_id'] === $userId) {
            $position = (int)$row['position'];
            $points = (int)$row['points'];
            break;
        }
    }
    $public = [];
    foreach ($rank['rows'] as $row) {
        $public[] = [
            'position' => $row['position'],
            'name' => $row['name'],
            'points' => $row['points'],
            'mine' => (int)$row['user_id'] === $userId,
        ];
    }
    return [
        'balance_cents' => gcv_wallet_balance($userId),
        'points' => $points,
        'position' => $position,
        'referrals' => $items,
        'ranking' => $public,
    ];
}

function gcv_referral_reward_row(array $ref, int $excursionId): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $lock = $pdo->prepare('SELECT status, cashback_cents, referrer_user_id FROM gcv_referrals WHERE id = ? FOR UPDATE');
        $lock->execute([(int)$ref['id']]);
        $row = $lock->fetch(PDO::FETCH_ASSOC);
        if (!$row || (string)$row['status'] !== 'linked') {
            $pdo->rollBack();
            return;
        }
        $people = max(1, (int)($ref['spots'] ?? 1));
        $unit = max(0, (int)$row['cashback_cents']);
        $total = $unit * $people;
        $pdo->prepare(
            "UPDATE gcv_referrals
             SET status = 'rewarded', excursion_id = ?, rewarded_at = NOW(), earned_cents = ?, people = ?
             WHERE id = ? AND status = 'linked'"
        )->execute([$excursionId, $total, $people, (int)$ref['id']]);
        if ($total > 0) {
            gcv_wallet_insert(
                $pdo,
                (int)$row['referrer_user_id'],
                $total,
                'referral_credit',
                (int)$ref['id'],
                null,
                null,
                'Indicação concluída'
            );
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('referral reward: ' . $e->getMessage());
    }
}

function gcv_referral_settle_due(int $limit = 30): int
{
    gcv_referral_ensure_schema();
    if (!function_exists('gcv_resolve_excursion_lifecycle')) {
        require_once __DIR__ . '/excursion_status.php';
    }
    if (!function_exists('gcv_ranking_ja_fechou')) {
        require_once __DIR__ . '/ranking.php';
    }
    $done = 0;
    try {
        $refs = db()->query(
            "SELECT r.id, r.referred_user_id, r.cashback_cents, u.email
             FROM gcv_referrals r
             INNER JOIN gcv_users u ON u.id = r.referred_user_id
             WHERE r.status = 'linked' AND r.referred_user_id IS NOT NULL
             ORDER BY r.id ASC
             LIMIT 80"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('referral settle list: ' . $e->getMessage());
        return 0;
    }
    $saleSt = db()->prepare(
        "SELECT s.excursion_id, s.spots, e.date_iso, e.departure_time
         FROM gcv_sales s
         INNER JOIN gcv_excursions e ON e.id = s.excursion_id
         WHERE s.deleted_at IS NULL AND s.sale_status = 'PAID'
           AND (s.tourist_user_id = ? OR LOWER(s.tourist_email) = ?)
         ORDER BY e.date_iso ASC, e.departure_time ASC, s.id ASC"
    );
    $excSt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
    foreach ($refs as $ref) {
        if ($done >= $limit) {
            break;
        }
        $uid = (int)$ref['referred_user_id'];
        $email = strtolower((string)$ref['email']);
        try {
            $saleSt->execute([$uid, $email]);
            $sales = $saleSt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) {
            error_log('referral settle sales: ' . $e->getMessage());
            continue;
        }
        foreach ($sales as $sale) {
            $excId = (int)($sale['excursion_id'] ?? 0);
            if ($excId <= 0) {
                continue;
            }
            $excSt->execute([$excId]);
            $exc = $excSt->fetch(PDO::FETCH_ASSOC);
            if (!$exc) {
                continue;
            }
            $life = gcv_resolve_excursion_lifecycle($exc);
            if (in_array($life, ['cancelada', 'rejeitada'], true)) {
                continue;
            }
            if (!in_array($life, ['concluida', 'confirmada'], true)) {
                break;
            }
            $data = gcv_ranking_data_contabil(
                substr((string)($exc['date_iso'] ?? ''), 0, 10),
                (string)($exc['departure_time'] ?? '')
            );
            if (!gcv_ranking_ja_fechou($data)) {
                break;
            }
            $ref['spots'] = max(1, (int)($sale['spots'] ?? 1));
            gcv_referral_reward_row($ref, $excId);
            $done++;
            break;
        }
    }
    return $done;
}

/** @return array<string,mixed> */
function gcv_wallet_withdraw(int $userId, string $pixKey, int $amountCents): array
{
    gcv_referral_ensure_schema();
    $pixKey = trim($pixKey);
    if ($userId <= 0) {
        throw new InvalidArgumentException('Conta inválida.');
    }
    if ($pixKey === '' || mb_strlen($pixKey) < 5 || mb_strlen($pixKey) > 140) {
        throw new InvalidArgumentException('Informe a chave Pix.');
    }
    if ($amountCents < 1) {
        throw new InvalidArgumentException('Informe o valor do saque.');
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('SELECT id FROM gcv_users WHERE id = ? FOR UPDATE')->execute([$userId]);
        $sum = $pdo->prepare('SELECT COALESCE(SUM(amount_cents),0) FROM gcv_wallet_ledger WHERE user_id = ?');
        $sum->execute([$userId]);
        $balance = (int)$sum->fetchColumn();
        if ($amountCents > $balance) {
            throw new InvalidArgumentException('O saldo não cobre esse saque.');
        }
        $pdo->prepare(
            "INSERT INTO gcv_wallet_withdrawals (user_id, amount_cents, pix_key, status) VALUES (?,?,?,'pending')"
        )->execute([$userId, $amountCents, $pixKey]);
        $wid = (int)$pdo->lastInsertId();
        gcv_wallet_insert($pdo, $userId, -$amountCents, 'withdraw', null, null, $wid, 'Saque Pix');
        $ledgerId = (int)$pdo->lastInsertId();
        $pdo->prepare('UPDATE gcv_wallet_withdrawals SET ledger_id = ? WHERE id = ?')->execute([$ledgerId, $wid]);
        $pdo->commit();
        return ['id' => $wid, 'amount_cents' => $amountCents, 'status' => 'pending', 'balance_cents' => $balance - $amountCents];
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('wallet withdraw: ' . $e->getMessage());
        throw new RuntimeException('Não foi possível pedir o saque.');
    }
}

function gcv_wallet_withdraw_decide(int $id, string $status): void
{
    gcv_referral_ensure_schema();
    if (!in_array($status, ['paid', 'rejected'], true)) {
        throw new InvalidArgumentException('Decisão inválida.');
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('SELECT * FROM gcv_wallet_withdrawals WHERE id = ? FOR UPDATE');
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row || (string)$row['status'] !== 'pending') {
            throw new InvalidArgumentException('Este saque já foi decidido.');
        }
        $pdo->prepare('UPDATE gcv_wallet_withdrawals SET status = ?, decided_at = NOW() WHERE id = ?')->execute([$status, $id]);
        if ($status === 'rejected') {
            $have = $pdo->prepare("SELECT id FROM gcv_wallet_ledger WHERE kind = 'withdraw_reversal' AND withdrawal_id = ? LIMIT 1");
            $have->execute([$id]);
            if (!$have->fetch()) {
                gcv_wallet_insert(
                    $pdo,
                    (int)$row['user_id'],
                    (int)$row['amount_cents'],
                    'withdraw_reversal',
                    null,
                    null,
                    $id,
                    'Saque recusado'
                );
            }
        }
        $pdo->commit();
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('wallet decide: ' . $e->getMessage());
        throw new RuntimeException('Não foi possível atualizar o saque.');
    }
}

/** @return list<array<string,mixed>> */
function gcv_wallet_withdrawals_admin(int $limit = 80): array
{
    gcv_referral_ensure_schema();
    $lim = max(1, min(200, $limit));
    try {
        $rows = db()->query(
            "SELECT w.id, w.user_id, w.amount_cents, w.pix_key, w.status, w.created_at, w.decided_at, u.name, u.email
             FROM gcv_wallet_withdrawals w
             INNER JOIN gcv_users u ON u.id = w.user_id
             ORDER BY FIELD(w.status, 'pending', 'paid', 'rejected'), w.id DESC
             LIMIT {$lim}"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('wallet admin list: ' . $e->getMessage());
        return [];
    }
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'name' => (string)$row['name'],
            'email' => (string)$row['email'],
            'amount_cents' => (int)$row['amount_cents'],
            'pix_key' => (string)$row['pix_key'],
            'status' => (string)$row['status'],
            'created_at' => (string)$row['created_at'],
            'decided_at' => $row['decided_at'] ? (string)$row['decided_at'] : null,
        ];
    }
    return $out;
}
