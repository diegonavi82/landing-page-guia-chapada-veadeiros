<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_role('guide');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->prepare(
        'SELECT g.*, u.name, u.email, u.avatar_url, u.lang
         FROM gcv_guides g
         JOIN gcv_users u ON u.id = g.user_id
         WHERE g.user_id = ?'
    );
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();
    json_response(true, $profile ?: []);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data   = body_json();
    $fields = [];
    $params = [];

    $textFields = ['bio_pt', 'bio_en', 'bio_es', 'phone', 'photo_url', 'cadastur'];
    foreach ($textFields as $f) {
        if (isset($data[$f])) {
            $fields[] = "{$f} = ?";
            $params[] = sanitize_text($data[$f], 500);
        }
    }
    if (empty($fields)) json_response(false, null, 'Nenhum campo para atualizar', 422);

    $params[] = $user['id'];
    db()->prepare('UPDATE gcv_guides SET ' . implode(', ', $fields) . ' WHERE user_id = ?')->execute($params);

    json_response(true, ['message' => 'Perfil atualizado']);
}

json_response(false, null, 'Método não permitido', 405);
