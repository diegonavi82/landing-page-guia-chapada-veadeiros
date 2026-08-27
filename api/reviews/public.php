<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

require_once dirname(__DIR__) . '/helpers/review_service.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$guideId = (int)($_GET['guide_user_id'] ?? $_GET['guide_id'] ?? 0);
if ($guideId <= 0) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'guide_user_id obrigatório']);
    exit;
}

gcv_marketplace_ensure_schema();
$stats = gcv_review_guide_stats($guideId);
echo json_encode([
    'ok' => true,
    'data' => [
        'guide_user_id' => $guideId,
        'count' => $stats['count'],
        'avg' => $stats['avg'],
        'reviews' => gcv_review_list_public($guideId, (int)($_GET['limit'] ?? 20)),
    ],
], JSON_UNESCAPED_UNICODE);
