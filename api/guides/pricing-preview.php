<?php
declare(strict_types=1);

/**
 * Preview do preço final a partir do valor líquido desejado pelo guia.
 * GET ?guide_net_cents=20000&city_id=1
 * POST { guide_net_cents | guide_net, city_id?, category_key? }
 *
 * Nunca calcula no frontend — este endpoint é a fonte da verdade.
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace/pricing_service.php';

header('Content-Type: application/json; charset=utf-8');
$user = require_role('guide');

$data = $_SERVER['REQUEST_METHOD'] === 'GET' ? $_GET : body_json();
$guideNet = isset($data['guide_net_cents'])
    ? (int)$data['guide_net_cents']
    : (int)round(((float)($data['guide_net'] ?? 0)) * 100);

try {
    $pricing = gcv_pricing_preview_guide_net(
        $guideNet,
        (int)$user['id'],
        isset($data['category_key']) ? (string)$data['category_key'] : null,
        !empty($data['city_id']) ? (int)$data['city_id'] : null,
        !empty($data['excursion_id']) ? (int)$data['excursion_id'] : null
    );
    json_response(true, ['pricing' => $pricing]);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (Throwable $e) {
    json_response(false, null, $e->getMessage(), 500);
}
