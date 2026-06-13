<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->prepare('SELECT id, key_name, value, label, type, updated_at FROM gcv_settings ORDER BY id ASC');
    $stmt->execute();
    json_response(true, ['settings' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data    = body_json();
    $keyName = sanitize_text($data['key_name'] ?? '', 100);
    $value   = sanitize_text($data['value'] ?? '', 500);

    if (!$keyName) json_response(false, null, 'key_name obrigatório', 422);

    $stmt = db()->prepare('SELECT id, type FROM gcv_settings WHERE key_name = ?');
    $stmt->execute([$keyName]);
    $setting = $stmt->fetch();

    if (!$setting) json_response(false, null, 'Configuração não encontrada', 404);

    // Validar por tipo
    if (in_array($setting['type'], ['percent', 'integer'], true)) {
        if (!is_numeric($value) || (float)$value < 0) {
            json_response(false, null, 'Valor numérico inválido', 422);
        }
        if ($setting['type'] === 'percent' && (float)$value > 100) {
            json_response(false, null, 'Percentual não pode ser maior que 100', 422);
        }
    }

    db()->prepare(
        'UPDATE gcv_settings SET value = ?, updated_by = ? WHERE key_name = ?'
    )->execute([$value, $admin['id'], $keyName]);

    json_response(true, ['message' => 'Configuração salva']);
}

json_response(false, null, 'Método não permitido', 405);
