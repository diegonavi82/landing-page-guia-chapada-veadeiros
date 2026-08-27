<?php
declare(strict_types=1);

/**
 * Detalhes do local (lat/lng/maps) — admin ou guia.
 * GET ?place_id=places/ChIJ...
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

$placeId = trim((string)($_GET['place_id'] ?? ''));
$result = gcv_places_details($placeId);
if (!$result['ok']) {
    http_response_code(isset($result['detail']) ? 502 : 400);
    echo json_encode(['ok' => false, 'error' => $result['error'] ?? 'erro', 'detail' => $result['detail'] ?? null], JSON_UNESCAPED_UNICODE);
    exit;
}
echo json_encode(['ok' => true, 'data' => $result['place']], JSON_UNESCAPED_UNICODE);
