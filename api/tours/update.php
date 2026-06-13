<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    json_response(false, null, 'Método não permitido', 405);
}

$user   = require_auth();
$data   = body_json();
$tourId = (int)($data['id'] ?? 0);

if (!$tourId) json_response(false, null, 'ID do passeio não informado', 422);

$stmt = db()->prepare('SELECT id, guide_id, status FROM gcv_tours WHERE id = ?');
$stmt->execute([$tourId]);
$tour = $stmt->fetch();

if (!$tour) json_response(false, null, 'Passeio não encontrado', 404);
if ($user['role'] !== 'admin' && (int)$tour['guide_id'] !== (int)$user['id']) {
    json_response(false, null, 'Sem permissão para editar este passeio', 403);
}

$fields = [];
$params = [];

$map = [
    'title_pt' => 200, 'title_en' => 200, 'title_es' => 200,
    'description_pt' => 5000, 'description_en' => 5000, 'description_es' => 5000,
    'meeting_point' => 300, 'cover_url' => 500,
];
foreach ($map as $field => $max) {
    if (isset($data[$field])) {
        $fields[] = "{$field} = ?";
        $params[]  = sanitize_text($data[$field], $max);
    }
}
if (isset($data['departure_date'])) {
    $fields[] = 'departure_date = ?';
    $params[] = $data['departure_date'];
}
if (isset($data['departure_time'])) {
    $fields[] = 'departure_time = ?';
    $params[] = $data['departure_time'];
}
if (isset($data['region'])) {
    $fields[] = 'region = ?';
    $params[] = validate_region($data['region']);
}
if (isset($data['difficulty'])) {
    $fields[] = 'difficulty = ?';
    $params[] = validate_difficulty($data['difficulty']);
}
if (isset($data['max_spots'])) {
    $fields[] = 'max_spots = ?';
    $params[] = validate_positive_int($data['max_spots']);
}
if (isset($data['price'])) {
    $fields[] = 'price_cents = ?';
    $params[] = validate_price($data['price']);
}

if (empty($fields)) json_response(false, null, 'Nenhum campo para atualizar', 422);

$params[] = $tourId;
db()->prepare('UPDATE gcv_tours SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

json_response(true, ['message' => 'Passeio atualizado']);
