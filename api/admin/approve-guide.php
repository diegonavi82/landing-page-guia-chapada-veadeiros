<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/mailer.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

$admin  = require_admin();
$data   = body_json();
$userId = (int)($data['user_id'] ?? 0);

if (!$userId) json_response(false, null, 'user_id obrigatório', 422);

$stmt = db()->prepare('SELECT id, name, email, role, status FROM gcv_users WHERE id = ? AND role = \'guide\'');
$stmt->execute([$userId]);
$guide = $stmt->fetch();

if (!$guide) json_response(false, null, 'Guia não encontrado', 404);

db()->prepare(
    'UPDATE gcv_users SET status = \'active\' WHERE id = ?'
)->execute([$userId]);

db()->prepare(
    'UPDATE gcv_guides SET approved_at = NOW(), approved_by = ? WHERE user_id = ?'
)->execute([$admin['id'], $userId]);

mail_guide_approved($guide['email'], $guide['name']);

json_response(true, ['message' => 'Guia aprovado com sucesso']);
