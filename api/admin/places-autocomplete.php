<?php
declare(strict_types=1);

/**
 * Proxy Places Autocomplete (compat admin).
 * Preferir /api/places/autocomplete.php (admin + guia).
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/google_places.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

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
    echo json_encode([
        'ok' => false,
        'error' => $result['error'] ?? 'erro',
        'how' => 'https://developers.google.com/maps/documentation/places/web-service/autocomplete',
        'detail' => $result['detail'] ?? null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
echo json_encode(['ok' => true, 'data' => ['predictions' => $result['predictions'] ?? []]], JSON_UNESCAPED_UNICODE);
