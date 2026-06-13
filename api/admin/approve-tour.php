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
$tourId = (int)($data['tour_id'] ?? 0);

if (!$tourId) json_response(false, null, 'tour_id obrigatório', 422);

$stmt = db()->prepare(
    'SELECT t.id, t.title_pt, t.status, u.name AS guide_name, u.email AS guide_email
     FROM gcv_tours t JOIN gcv_users u ON u.id = t.guide_id WHERE t.id = ?'
);
$stmt->execute([$tourId]);
$tour = $stmt->fetch();
if (!$tour) json_response(false, null, 'Passeio não encontrado', 404);

db()->prepare(
    'UPDATE gcv_tours SET status = \'approved\', approved_at = NOW(), approved_by = ? WHERE id = ?'
)->execute([$admin['id'], $tourId]);

mail_tour_approved($tour['guide_email'], $tour['guide_name'], $tour['title_pt']);

json_response(true, ['message' => 'Passeio aprovado']);
