<?php

declare(strict_types=1);

/**
 * Mapa público de vagas Pix confirmadas no carrossel.
 * GET /api/excursions/pix_seats.php
 * Resposta: { success: true, seats: { cartId: qty } }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

require_once __DIR__ . '/../helpers/pix_reservation_store.php';
require_once __DIR__ . '/../helpers/pix_seats_store.php';

gcv_pix_cors_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$store = gcv_pix_seats_sync_from_paid_reservations();
$seats = $store['seats'];
if (function_exists('gcv_pix_seats_without_cms_tours')) {
    $seats = gcv_pix_seats_without_cms_tours($seats);
}
$storage = gcv_pix_seats_db() ? 'mysql' : 'json';

echo json_encode([
    'success' => true,
    'seats' => $seats,
    'storage' => $storage,
], JSON_UNESCAPED_UNICODE);
