<?php
declare(strict_types=1);

/**
 * Reverse geocode (GPS do dispositivo → endereço).
 * GET ?lat=&lng=
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/google_places.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
$roles = $user['roles'] ?? [];
$active = (string)($user['active_role'] ?? $user['role'] ?? '');
$allowed = ($active === 'admin' && in_array('admin', $roles, true))
    || ($active === 'guide' && in_array('guide', $roles, true));
if (!$allowed) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acesso negado']);
    exit;
}

$latRaw = $_GET['lat'] ?? '';
$lngRaw = $_GET['lng'] ?? '';
if (!is_numeric($latRaw) || !is_numeric($lngRaw)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'lat e lng obrigatórios'], JSON_UNESCAPED_UNICODE);
    exit;
}
$lat = (float)$latRaw;
$lng = (float)$lngRaw;

$result = gcv_places_reverse($lat, $lng);
if (!$result['ok']) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $result['error'] ?? 'erro'], JSON_UNESCAPED_UNICODE);
    exit;
}
echo json_encode(['ok' => true, 'data' => $result['place']], JSON_UNESCAPED_UNICODE);
