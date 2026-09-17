<?php
declare(strict_types=1);

/**
 * Perfil completo do guia (GET/PUT) — campos obrigatórios das regras de negócio.
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';
require_once __DIR__ . '/../helpers/marketplace/guide_financial_service.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';
require_once __DIR__ . '/../helpers/guide_languages.php';
require_once __DIR__ . '/../helpers/guide_profile.php';
require_once __DIR__ . '/../helpers/diego_navi_stash.php';
require_once __DIR__ . '/../helpers/guide_registration.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_held_role('guide');
require_once __DIR__ . '/../helpers/email_verify.php';
gcv_require_guide_email_verified($user);
gcv_cms_ensure_schema();

$BIO_MAX = 800;
$BIO_RECOMMENDED = 600;

function gcv_guide_profile_row(int $userId): ?array
{
    $stmt = db()->prepare(
        'SELECT g.*, u.name AS user_name, u.email, u.avatar_url, u.status AS user_status,
                c.name AS base_city_name
         FROM gcv_guides g
         JOIN gcv_users u ON u.id = g.user_id
         LEFT JOIN gcv_cities c ON c.id = g.base_city_id
         WHERE g.user_id = ?
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_guide_profile_payload(int $userId): array
{
    $profile = gcv_guide_profile_row($userId);
    if (!$profile) {
        return ['profile' => null, 'financial' => null, 'missing' => ['full_name'], 'complete' => false];
    }
    $profile['languages'] = gcv_guide_languages_normalize($profile['languages_json'] ?? null);
    $financial = gcv_guide_financial_get($userId);
    $merged = gcv_guide_profile_merge_financial($profile, $financial);
    $missing = gcv_guide_profile_missing($merged);
    return [
        'profile' => $profile,
        'financial' => $financial,
        'missing' => $missing,
        'complete' => $missing === [],
        'financial_ready' => gcv_guide_financial_is_ready($userId),
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $profile = gcv_guide_profile_row((int)$user['id']);
        if (!$profile) {
            db()->prepare('INSERT IGNORE INTO gcv_guides (user_id) VALUES (?)')->execute([(int)$user['id']]);
        }
        try {
            gcv_diego_navi_stash_apply_if_needed((int)$user['id'], (string)($user['email'] ?? ''));
        } catch (Throwable $e) {
            error_log('me-profile stash: ' . $e->getMessage());
        }
        $pack = gcv_guide_profile_payload((int)$user['id']);
        $cities = db()->query(
            "SELECT id, name FROM gcv_cities WHERE status = 'active' ORDER BY name ASC"
        )->fetchAll(PDO::FETCH_ASSOC);
        $cities = array_values(array_filter($cities, static function ($c) {
            return gcv_is_allowed_guide_base_city((string)$c['name']);
        }));
        $rejection = gcv_guide_submit_cooldown($pack['profile'] ?? null);

        json_response(true, [
            'profile' => $pack['profile'],
            'financial' => $pack['financial'],
            'missing' => $pack['missing'],
            'complete' => $pack['complete'],
            'financial_ready' => $pack['financial_ready'],
            'rejection' => $rejection,
            'limits' => [
                'bio_max' => $BIO_MAX,
                'bio_recommended' => $BIO_RECOMMENDED,
            ],
            'base_cities' => $cities,
        ]);
    } catch (Throwable $e) {
        error_log('me-profile GET: ' . $e->getMessage());
        json_response(false, null, 'Erro ao carregar perfil', 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = body_json();
    $pdo = db();
    $userId = (int)$user['id'];

    $pdo->prepare('INSERT IGNORE INTO gcv_guides (user_id) VALUES (?)')->execute([$userId]);

    $before = gcv_guide_profile_payload($userId);
    $wasComplete = !empty($before['complete']);
    $userStatus = (string)(($before['profile']['user_status'] ?? $user['status'] ?? ''));
    $cooldown = gcv_guide_submit_cooldown($before['profile'] ?? null);
    $wantSubmit = !empty($data['submit_for_approval']);

    if ($wantSubmit && !empty($cooldown['rejected']) && empty($cooldown['can_submit'])) {
        $n = (int)$cooldown['days_left'];
        json_response(
            false,
            null,
            'Você poderá solicitar nova aprovação em ' . $n . ' dia' . ($n === 1 ? '' : 's') . '.',
            423
        );
    }

    $fullName = sanitize_text((string)($data['full_name'] ?? ''), 160);
    $nickname = sanitize_text((string)($data['nickname'] ?? ''), 80);
    $phoneCheck = gcv_validate_contact_phone(
        (string)($data['phone'] ?? ''),
        (string)($data['phone_ddi'] ?? '+55'),
        (string)($data['phone_iso'] ?? 'br'),
        true
    );
    if (!$phoneCheck['ok']) {
        json_response(false, null, $phoneCheck['error'] ?: 'Telefone inválido', 422);
    }
    $phoneDdi = $phoneCheck['ddi'];
    $phone = $phoneCheck['phone'];
    $phoneIso = $phoneCheck['iso'];
    $birth = trim((string)($data['birth_date'] ?? ''));
    $sexo = gcv_normalize_sexo($data['sexo'] ?? '');
    $baseCityId = (int)($data['base_city_id'] ?? 0);
    $idDoc = sanitize_text((string)($data['id_document_url'] ?? ''), 500);
    $photo34 = sanitize_text((string)($data['photo_3x4_url'] ?? ''), 500);
    $bio = sanitize_text((string)($data['bio_pt'] ?? ''), $BIO_MAX);

    if (mb_strlen($fullName) < 2) {
        json_response(false, null, 'Nome completo obrigatório', 422);
    }
    if ($nickname !== '' && mb_strlen($nickname) < 2) {
        json_response(false, null, 'Apelido deve ter pelo menos 2 caracteres', 422);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $birth)) {
        json_response(false, null, 'Data de nascimento inválida', 422);
    }
    $birthDt = DateTimeImmutable::createFromFormat('Y-m-d', $birth);
    $adult = (new DateTimeImmutable('now'))->modify('-18 years');
    if (!$birthDt || $birthDt > $adult) {
        json_response(false, null, 'É necessário ter 18 anos ou mais', 422);
    }
    if ($sexo === '') {
        json_response(false, null, 'Sexo obrigatório', 422);
    }
    if ($baseCityId <= 0) {
        json_response(false, null, 'Cidade obrigatória', 422);
    }

    $cityStmt = $pdo->prepare('SELECT name FROM gcv_cities WHERE id = ? AND status = \'active\'');
    $cityStmt->execute([$baseCityId]);
    $cityName = (string)($cityStmt->fetchColumn() ?: '');
    if ($cityName === '' || !gcv_is_allowed_guide_base_city($cityName)) {
        json_response(false, null, gcv_guide_base_city_error(), 422);
    }
    if ($photo34 === '') {
        json_response(false, null, 'Foto 3x4 obrigatória', 422);
    }
    if (mb_strlen($bio) > $BIO_MAX) {
        json_response(false, null, "Descrição: máximo {$BIO_MAX} caracteres", 422);
    }

    $legalName = sanitize_text((string)($data['legal_name'] ?? ''), 160);
    $personType = strtoupper(trim((string)($data['person_type'] ?? 'PF')));
    if ($personType === 'CPF') {
        $personType = 'PF';
    }
    if ($personType === 'CNPJ') {
        $personType = 'PJ';
    }
    if (!in_array($personType, ['PF', 'PJ'], true)) {
        $personType = 'PF';
    }
    $cpf = preg_replace('/\D+/', '', (string)($data['cpf'] ?? '')) ?: '';
    $cnpj = preg_replace('/\D+/', '', (string)($data['cnpj'] ?? '')) ?: '';
    $pixKey = trim((string)($data['pix_key'] ?? ''));
    $pixType = strtolower(trim((string)($data['pix_key_type'] ?? '')));

    if (mb_strlen($legalName) < 2) {
        json_response(false, null, 'Nome / razão social obrigatório', 422);
    }
    if ($pixKey === '' || !in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) {
        json_response(false, null, 'Tipo de chave e chave PIX obrigatórios', 422);
    }

    $langJson = gcv_guide_languages_json($data['languages'] ?? $data['languages_json'] ?? ['pt']);
    $resubmitted = false;

    try {
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE gcv_guides SET
                    full_name = ?, nickname = ?,
                    phone = ?, phone_ddi = ?, phone_iso = ?, birth_date = ?, sexo = ?, base_city_id = ?,
                    id_document_url = ?, photo_3x4_url = ?, photo_url = ?, bio_pt = ?,
                    languages_json = ?
                 WHERE user_id = ?'
            )->execute([
                $fullName, $nickname,
                $phone, $phoneDdi, $phoneIso, $birth, $sexo, $baseCityId,
                $idDoc, $photo34, $photo34, $bio, $langJson, $userId,
            ]);
        } catch (Throwable $e) {
            $pdo->prepare(
                'UPDATE gcv_guides SET
                    full_name = ?, nickname = ?,
                    phone = ?, phone_ddi = ?, birth_date = ?, sexo = ?, base_city_id = ?,
                    id_document_url = ?, photo_3x4_url = ?, photo_url = ?, bio_pt = ?,
                    languages_json = ?
                 WHERE user_id = ?'
            )->execute([
                $fullName, $nickname,
                $phone, $phoneDdi, $birth, $sexo, $baseCityId,
                $idDoc, $photo34, $photo34, $bio, $langJson, $userId,
            ]);
        }

        if ($photo34 !== '') {
            $pdo->prepare('UPDATE gcv_users SET name = ?, avatar_url = ? WHERE id = ?')
                ->execute([$fullName, $photo34, $userId]);
        } else {
            $pdo->prepare('UPDATE gcv_users SET name = ? WHERE id = ?')
                ->execute([$fullName, $userId]);
        }

        gcv_guide_financial_upsert($userId, [
            'legal_name' => $legalName,
            'person_type' => $personType,
            'cpf' => $personType === 'PJ' ? '' : $cpf,
            'cnpj' => $personType === 'PJ' ? $cnpj : '',
            'pix_key' => $pixKey,
            'pix_key_type' => $pixType,
            'pix_holder_name' => $legalName,
        ], $userId, GcvCreatedBy::GUIDE);

        $pack = gcv_guide_profile_payload($userId);
        $complete = !empty($pack['complete']);
        $pdo->prepare('UPDATE gcv_guides SET profile_complete = ? WHERE user_id = ?')
            ->execute([$complete ? 1 : 0, $userId]);

        if (!$complete) {
            $pdo->rollBack();
            $labels = [
                'full_name' => 'nome completo',
                'email' => 'e-mail',
                'phone' => 'telefone',
                'birth_date' => 'nascimento',
                'sexo' => 'sexo',
                'base_city_id' => 'cidade',
                'photo_3x4_url' => 'foto',
                'legal_name' => 'nome / razão social',
                'cpf_cnpj' => 'CPF/CNPJ',
                'pix_key' => 'chave PIX',
            ];
            $faltam = array_map(static function ($k) use ($labels) {
                return $labels[$k] ?? $k;
            }, $pack['missing']);
            json_response(false, null, 'Preencha os campos obrigatórios: ' . implode(', ', $faltam), 422);
        }

        $resubmitted = false;
        if ($wantSubmit && !empty($cooldown['rejected']) && !empty($cooldown['can_submit'])) {
            $pdo->prepare('UPDATE gcv_users SET status = \'pending\' WHERE id = ? AND status = \'suspended\'')
                ->execute([$userId]);
            $resubmitted = true;
        }

        $pdo->commit();
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(false, null, $e->getMessage(), 422);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('me-profile PUT: ' . $e->getMessage());
        json_response(false, null, 'Erro ao salvar perfil', 500);
    }

    $submitted = false;
    if ($userStatus === 'pending' && !$wasComplete) {
        $submitted = true;
    }
    if (!empty($resubmitted)) {
        $submitted = true;
    }

    $pack = gcv_guide_profile_payload($userId);
    $out = [
        'message' => $submitted ? 'Cadastro enviado para aprovação' : 'Perfil atualizado',
        'profile' => $pack['profile'],
        'financial' => $pack['financial'],
        'missing' => $pack['missing'],
        'complete' => $pack['complete'],
        'financial_ready' => $pack['financial_ready'],
        'submitted_for_approval' => $submitted,
        'rejection' => gcv_guide_submit_cooldown($pack['profile'] ?? null),
    ];

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'data' => $out], JSON_UNESCAPED_UNICODE);
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        ignore_user_abort(true);
        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();
    }

    if ($submitted) {
        $notifyName = $fullName !== '' ? $fullName : (string)($user['name'] ?? 'Guia');
        $notifyEmail = (string)($user['email'] ?? '');
        try {
            require_once __DIR__ . '/../helpers/mailer.php';
            mail_guide_pending_admin($notifyName, $notifyEmail);
        } catch (Throwable $e) {
            error_log('me-profile mail_guide_pending_admin: ' . $e->getMessage());
        }
        try {
            require_once __DIR__ . '/../helpers/purchase_notify.php';
            $guideText = "✅ Recebemos seu cadastro de guia.\n\n"
                . 'Olá, ' . $notifyName . "!\n\n"
                . "Seus dados foram enviados para análise. Você recebe outro WhatsApp neste número quando for aprovado, com o link para publicar sua primeira excursão.\n\n"
                . 'Enquanto isso, acompanhe o status no perfil do painel.';
            $guidePhone = gcv_whatsapp_normalize_phone($phone, preg_replace('/\D+/', '', $phoneDdi) ?: '55');
            if ($guidePhone !== '') {
                gcv_whatsapp_send_text($guidePhone, $guideText);
            }
            $adminPhone = gcv_admin_whatsapp_phone();
            $adminText = "⏳ Novo guia aguardando aprovação\n\n"
                . 'Nome: ' . $notifyName . "\n"
                . 'Email: ' . $notifyEmail . "\n"
                . ($guidePhone !== '' ? 'WhatsApp: ' . $guidePhone . "\n" : '')
                . "\nAbrir painel:\n"
                . rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/') . '/dashboard/';
            if ($adminPhone !== '') {
                gcv_whatsapp_send_text($adminPhone, $adminText);
            }
        } catch (Throwable $e) {
            error_log('me-profile notify registration: ' . $e->getMessage());
        }
    }
    exit;
}

json_response(false, null, 'Método não permitido', 405);
