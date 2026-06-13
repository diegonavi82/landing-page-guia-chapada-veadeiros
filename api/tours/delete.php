<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    json_response(false, null, 'Método não permitido', 405);
}

$user   = require_auth();
$data   = body_json();
$tourId = (int)($data['id'] ?? $_GET['id'] ?? 0);

if (!$tourId) json_response(false, null, 'ID do passeio não informado', 422);

$stmt = db()->prepare('SELECT id, guide_id FROM gcv_tours WHERE id = ?');
$stmt->execute([$tourId]);
$tour = $stmt->fetch();

if (!$tour) json_response(false, null, 'Passeio não encontrado', 404);
if ($user['role'] !== 'admin' && (int)$tour['guide_id'] !== (int)$user['id']) {
    json_response(false, null, 'Sem permissão para remover este passeio', 403);
}

// Verificar se há reservas pagas
$checkBookings = db()->prepare(
    'SELECT COUNT(*) FROM gcv_bookings WHERE tour_id = ? AND status IN (\'paid\',\'pending\')'
);
$checkBookings->execute([$tourId]);
if ((int)$checkBookings->fetchColumn() > 0) {
    json_response(false, null, 'Não é possível excluir passeio com reservas ativas', 409);
}

db()->prepare('UPDATE gcv_tours SET status = \'cancelled\' WHERE id = ?')->execute([$tourId]);

json_response(true, ['message' => 'Passeio cancelado']);
