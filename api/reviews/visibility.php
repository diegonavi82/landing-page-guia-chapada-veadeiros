<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once dirname(__DIR__) . '/helpers/review_service.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($raw)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'JSON inválido']);
    exit;
}

$token = gcv_review_normalize_token((string)($raw['token'] ?? $raw['t'] ?? ''));
$sale = $token !== '' ? gcv_review_load_by_token($token) : null;
if (!$sale) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'message' => 'Link inválido']);
    exit;
}
$existing = gcv_review_find_for_sale((int)$sale['id']);
if (!$existing) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'message' => 'Avaliação não encontrada']);
    exit;
}

$hidden = !empty($raw['hidden']);
gcv_review_set_tourist_hidden($existing, $hidden);
$fresh = gcv_review_find_for_sale((int)$sale['id']);
echo json_encode([
    'ok' => true,
    'review' => $fresh ? gcv_review_tourist_payload($fresh) : null,
    'message' => $hidden ? 'Avaliação ocultada' : 'Avaliação visível novamente',
], JSON_UNESCAPED_UNICODE);
