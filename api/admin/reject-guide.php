<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/mailer.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(false, null, 'Método não permitido', 405);

require_admin();
$data   = body_json();
$userId = (int)($data['user_id'] ?? 0);
$reason = sanitize_text($data['reason'] ?? '', 500);

if (!$userId) json_response(false, null, 'user_id obrigatório', 422);

$stmt = db()->prepare('SELECT id, name, email FROM gcv_users WHERE id = ? AND role = \'guide\'');
$stmt->execute([$userId]);
$guide = $stmt->fetch();
if (!$guide) json_response(false, null, 'Guia não encontrado', 404);

db()->prepare('UPDATE gcv_users SET status = \'suspended\' WHERE id = ?')->execute([$userId]);
mail_guide_rejected($guide['email'], $guide['name'], $reason);

json_response(true, ['message' => 'Guia rejeitado']);
