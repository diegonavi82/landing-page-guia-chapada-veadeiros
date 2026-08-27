<?php
declare(strict_types=1);

/**
 * Autocomplete de locais (admin ou guia autenticado).
 * GET ?q=Padaria+Santa+Maria
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

$q = trim((string)($_GET['q'] ?? ''));
$cityId = (int)($_GET['city_id'] ?? 0);
$bias = null;
if ($cityId > 0) {
    try {
        $st = db()->prepare('SELECT name, lat, lng FROM gcv_cities WHERE id = ? AND status = \'active\' LIMIT 1');
        $st->execute([$cityId]);
        $city = $st->fetch(PDO::FETCH_ASSOC);
        if ($city) {
            $bias = [
                'city' => (string)($city['name'] ?? ''),
                'lat' => isset($city['lat']) && $city['lat'] !== null && $city['lat'] !== '' ? (float)$city['lat'] : null,
                'lng' => isset($city['lng']) && $city['lng'] !== null && $city['lng'] !== '' ? (float)$city['lng'] : null,
            ];
        }
    } catch (Throwable $e) {
        $bias = null;
    }
}
$result = gcv_places_autocomplete($q, 'pt-BR', $bias);
if (!$result['ok']) {
    http_response_code(isset($result['detail']) ? 502 : 503);
    echo json_encode(['ok' => false, 'error' => $result['error'] ?? 'erro', 'detail' => $result['detail'] ?? null], JSON_UNESCAPED_UNICODE);
    exit;
}
echo json_encode(['ok' => true, 'data' => ['predictions' => $result['predictions'] ?? []]], JSON_UNESCAPED_UNICODE);
