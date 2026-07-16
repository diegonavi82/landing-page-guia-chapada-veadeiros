<?php
declare(strict_types=1);

/**
 * Perfil do cliente (GET/PUT).
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/cms_schema.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
if (($user['role'] ?? '') !== 'client') {
    json_response(false, null, 'Apenas clientes', 403);
}
gcv_cms_ensure_schema();

function gcv_digits_only(string $s): string
{
    return preg_replace('/\D+/', '', $s) ?? '';
}

function gcv_client_row(int $userId): array
{
    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.avatar_url, u.lang,
                p.phone, p.phone_ddi, p.cpf, p.birth_date, p.photo_url, p.notes
         FROM gcv_users u
         LEFT JOIN gcv_client_profiles p ON p.user_id = u.id
         WHERE u.id = ?
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: [];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $pdo = db();
    $pdo->prepare('INSERT IGNORE INTO gcv_client_profiles (user_id) VALUES (?)')->execute([(int)$user['id']]);
    json_response(true, [
        'profile' => gcv_client_row((int)$user['id']),
        'limits' => [
            'name_max' => 120,
            'phone_max' => 20,
            'notes_max' => 500,
        ],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = body_json();
    $name = validate_name((string)($data['name'] ?? ''));
    if ($name === '') {
        json_response(false, null, 'Nome obrigatório (2–120)', 422);
    }
    $phoneDdi = sanitize_text((string)($data['phone_ddi'] ?? '+55'), 8);
    $phone = gcv_digits_only((string)($data['phone'] ?? ''));
    if ($phone !== '' && (strlen($phone) < 10 || strlen($phone) > 13)) {
        json_response(false, null, 'Telefone inválido', 422);
    }
    $cpf = gcv_digits_only((string)($data['cpf'] ?? ''));
    if ($cpf !== '' && strlen($cpf) !== 11) {
        json_response(false, null, 'CPF inválido', 422);
    }
    $birth = trim((string)($data['birth_date'] ?? ''));
    if ($birth !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birth)) {
        json_response(false, null, 'Data de nascimento inválida', 422);
    }
    $photo = sanitize_text((string)($data['photo_url'] ?? ''), 500);
    $notes = sanitize_text((string)($data['notes'] ?? ''), 500);

    $pdo = db();
    $pdo->prepare('UPDATE gcv_users SET name = ? WHERE id = ?')->execute([$name, (int)$user['id']]);
    $pdo->prepare('INSERT IGNORE INTO gcv_client_profiles (user_id) VALUES (?)')->execute([(int)$user['id']]);
    $pdo->prepare(
        'UPDATE gcv_client_profiles SET phone=?, phone_ddi=?, cpf=?, birth_date=?, photo_url=?, notes=? WHERE user_id=?'
    )->execute([
        $phone !== '' ? $phone : null,
        $phoneDdi,
        $cpf !== '' ? $cpf : null,
        $birth !== '' ? $birth : null,
        $photo !== '' ? $photo : null,
        $notes !== '' ? $notes : null,
        (int)$user['id'],
    ]);

    json_response(true, [
        'message' => 'Perfil atualizado',
        'profile' => gcv_client_row((int)$user['id']),
    ]);
}

json_response(false, null, 'Método não permitido', 405);
