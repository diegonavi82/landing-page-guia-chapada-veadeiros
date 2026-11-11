<?php

declare(strict_types=1);

/**
 * Proposta de guiagem para o guia logado. O token do WhatsApp não basta.
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/guide_queue_offer.php';
require_once __DIR__ . '/../helpers/notify_ops.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
$me = (int)($user['id'] ?? 0);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$token = '';
$action = '';
if ($method === 'POST') {
    $body = json_decode((string)file_get_contents('php://input'), true);
    $body = is_array($body) ? $body : [];
    $token = strtolower(trim((string)($body['t'] ?? '')));
    $action = strtolower(trim((string)($body['action'] ?? '')));
} else {
    $token = strtolower(trim((string)($_GET['t'] ?? '')));
}

if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
    json_response(false, null, 'Link inválido', 404);
}

gcv_guiagem_ensure_schema();
$st = db()->prepare(
    "SELECT excursion_id, guide_user_id, status, kind
     FROM gcv_guide_queue_offers
     WHERE accept_token = ?
     ORDER BY id DESC LIMIT 1"
);
$st->execute([$token]);
$offer = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$offer) {
    json_response(false, null, 'Esta proposta não existe mais', 404);
}
if ((int)$offer['guide_user_id'] !== $me) {
    json_response(false, null, 'Entre com a conta do guia que recebeu o WhatsApp', 403);
}

$excursionId = (int)$offer['excursion_id'];
if ($method === 'POST') {
    if ($action === 'accept') {
        $result = gcv_guiagem_accept($excursionId, $user);
    } elseif ($action === 'decline') {
        $result = gcv_guiagem_decline($excursionId, $me);
    } else {
        json_response(false, null, 'Ação inválida', 422);
    }
    if (empty($result['ok'])) {
        json_response(false, null, (string)($result['error'] ?? 'Não foi possível concluir'), (int)($result['status'] ?? 409));
    }
    json_response(true, [
        'result' => (string)($result['result'] ?? $action),
        'message' => (string)($result['message'] ?? ''),
    ]);
}

$tour = gcv_substitution_load_excursion($excursionId) ?: [];
$status = (string)($offer['status'] ?? '');
if ($status === 'pending' && gcv_guiagem_taken_by_other($excursionId, $me)) {
    $status = 'taken';
}
$sales = gcv_ops_paid_sales_for_excursion($excursionId);
$sale = $sales[0] ?? [];
$people = 0;
$cents = 0;
foreach ($sales as $row) {
    $people += max(1, (int)($row['spots'] ?? 1));
    $cents += max(0, (int)($row['sold_price_cents'] ?? 0));
}
if ($people < 1) {
    $people = max(1, (int)($tour['booked_people'] ?? 1));
}
$when = trim(gcv_ops_date_br((string)($tour['date_iso'] ?? '')) . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5));
$city = trim((string)($tour['departure_city_name'] ?? ''));
if ($city === '') {
    $city = 'Alto Paraíso de Goiás';
}
$code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
if ($code === '') {
    $code = gcv_ops_reserva_codigo($excursionId);
}
$private = gcv_excursion_is_private($tour);
$test = gcv_guiagem_tour_is_teste($tour);

json_response(true, [
    'status' => $status,
    'title' => gcv_ops_excursion_title($tour),
    'when' => $when,
    'city' => $city,
    'meeting_point' => gcv_ops_ponto_encontro($tour),
    'people' => $people,
    'price' => gcv_ops_brl($cents),
    'code' => $private ? ('Privativo ' . $code) : $code,
    'private' => $private,
    'test' => $test,
    'client_name' => trim((string)($sale['tourist_name'] ?? '')),
]);
