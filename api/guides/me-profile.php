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

header('Content-Type: application/json; charset=utf-8');

$user = require_role('guide');
gcv_cms_ensure_schema();

$BIO_MAX = 800;
$BIO_RECOMMENDED = 600;

function gcv_digits(string $s): string
{
    return preg_replace('/\D+/', '', $s) ?? '';
}

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

function gcv_guide_profile_missing(array $p): array
{
    $missing = [];
    if (trim((string)($p['full_name'] ?? '')) === '') $missing[] = 'full_name';
    if (trim((string)($p['nickname'] ?? '')) === '') $missing[] = 'nickname';
    if (trim((string)($p['email'] ?? '')) === '') $missing[] = 'email';
    if (strlen(gcv_digits((string)($p['cpf'] ?? ''))) !== 11) $missing[] = 'cpf';
    if (trim((string)($p['pix_key'] ?? '')) === '') $missing[] = 'pix_key';
    if (trim((string)($p['pix_key_type'] ?? '')) === '') $missing[] = 'pix_key_type';
    $phone = gcv_digits((string)($p['phone'] ?? ''));
    if (strlen($phone) < 10) $missing[] = 'phone';
    if (empty($p['birth_date'])) $missing[] = 'birth_date';
    if (empty($p['id_document_url']) && empty($p['diploma_url'])) $missing[] = 'id_document_url';
    if (empty($p['base_city_id'])) $missing[] = 'base_city_id';
    if (empty($p['photo_3x4_url']) && empty($p['photo_url'])) $missing[] = 'photo_3x4_url';
    $bio = trim((string)($p['bio_pt'] ?? ''));
    if ($bio === '') $missing[] = 'bio_pt';
    return $missing;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $profile = gcv_guide_profile_row((int)$user['id']);
    if (!$profile) {
        db()->prepare('INSERT INTO gcv_guides (user_id) VALUES (?)')->execute([(int)$user['id']]);
        $profile = gcv_guide_profile_row((int)$user['id']);
    }
    $missing = gcv_guide_profile_missing($profile ?: []);
    $cities = db()->query(
        "SELECT id, name FROM gcv_cities WHERE status = 'active' ORDER BY name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);
    $cities = array_values(array_filter($cities, static function ($c) {
        return gcv_is_allowed_guide_base_city((string)$c['name']);
    }));

    json_response(true, [
        'profile' => $profile,
        'missing' => $missing,
        'complete' => count($missing) === 0,
        'limits' => [
            'bio_max' => $BIO_MAX,
            'bio_recommended' => $BIO_RECOMMENDED,
        ],
        'pix_key_types' => ['cpf', 'cnpj', 'email', 'phone', 'random'],
        'base_cities' => $cities,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = body_json();
    $pdo = db();

    // Garante linha
    $pdo->prepare('INSERT IGNORE INTO gcv_guides (user_id) VALUES (?)')->execute([(int)$user['id']]);

    $fullName = sanitize_text((string)($data['full_name'] ?? ''), 160);
    $nickname = sanitize_text((string)($data['nickname'] ?? ''), 80);
    $cpf = gcv_digits((string)($data['cpf'] ?? ''));
    $pixKey = sanitize_text((string)($data['pix_key'] ?? ''), 120);
    $pixType = strtolower(trim((string)($data['pix_key_type'] ?? '')));
    $phoneDdi = sanitize_text((string)($data['phone_ddi'] ?? '+55'), 8);
    $phone = gcv_digits((string)($data['phone'] ?? ''));
    $birth = trim((string)($data['birth_date'] ?? ''));
    $baseCityId = (int)($data['base_city_id'] ?? 0);
    $idDoc = sanitize_text((string)($data['id_document_url'] ?? ''), 500);
    $photo34 = sanitize_text((string)($data['photo_3x4_url'] ?? ''), 500);
    $bio = sanitize_text((string)($data['bio_pt'] ?? ''), $BIO_MAX);

    if (mb_strlen($fullName) < 2) json_response(false, null, 'Nome completo obrigatório', 422);
    if (mb_strlen($nickname) < 2) json_response(false, null, 'Apelido obrigatório', 422);
    if (strlen($cpf) !== 11) json_response(false, null, 'CPF inválido (11 dígitos)', 422);
    if ($pixKey === '') json_response(false, null, 'Chave PIX obrigatória', 422);
    if (!in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) {
        json_response(false, null, 'Tipo de chave PIX inválido', 422);
    }
    if (strlen($phone) < 10 || strlen($phone) > 13) json_response(false, null, 'Telefone inválido', 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $birth)) json_response(false, null, 'Data de nascimento inválida', 422);
    $birthDt = DateTimeImmutable::createFromFormat('Y-m-d', $birth);
    $adult = (new DateTimeImmutable('now'))->modify('-18 years');
    if (!$birthDt || $birthDt > $adult) json_response(false, null, 'É necessário ter 18 anos ou mais', 422);
    if ($baseCityId <= 0) json_response(false, null, 'Cidade obrigatória', 422);

    $cityStmt = $pdo->prepare('SELECT name FROM gcv_cities WHERE id = ? AND status = \'active\'');
    $cityStmt->execute([$baseCityId]);
    $cityName = (string)($cityStmt->fetchColumn() ?: '');
    if ($cityName === '' || !gcv_is_allowed_guide_base_city($cityName)) {
        json_response(false, null, 'Cidade deve ser Alto Paraíso, São Jorge ou Cavalcante', 422);
    }
    if ($idDoc === '') json_response(false, null, 'Documento de identificação obrigatório', 422);
    if ($photo34 === '') json_response(false, null, 'Foto 3x4 obrigatória', 422);
    if ($bio === '') json_response(false, null, 'Descrição obrigatória', 422);
    if (mb_strlen($bio) > $BIO_MAX) json_response(false, null, "Descrição: máximo {$BIO_MAX} caracteres", 422);

    $pdo->prepare(
        'UPDATE gcv_guides SET
            full_name = ?, nickname = ?, cpf = ?, pix_key = ?, pix_key_type = ?,
            phone = ?, phone_ddi = ?, birth_date = ?, base_city_id = ?,
            id_document_url = ?, photo_3x4_url = ?, bio_pt = ?, profile_complete = 1
         WHERE user_id = ?'
    )->execute([
        $fullName, $nickname, $cpf, $pixKey, $pixType,
        $phone, $phoneDdi, $birth, $baseCityId,
        $idDoc, $photo34, $bio, (int)$user['id'],
    ]);

    // Espelha nome no usuário
    $pdo->prepare('UPDATE gcv_users SET name = ? WHERE id = ?')->execute([$fullName, (int)$user['id']]);

    $profile = gcv_guide_profile_row((int)$user['id']);
    json_response(true, [
        'message' => 'Perfil atualizado',
        'profile' => $profile,
        'missing' => gcv_guide_profile_missing($profile ?: []),
        'complete' => true,
    ]);
}

json_response(false, null, 'Método não permitido', 405);
