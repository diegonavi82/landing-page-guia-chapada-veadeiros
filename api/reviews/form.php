<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once dirname(__DIR__) . '/helpers/review_service.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$token = gcv_review_normalize_token((string)($_GET['t'] ?? $_GET['token'] ?? ''));
if ($token === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'state' => 'invalid', 'message' => 'Token inválido']);
    exit;
}

$sale = gcv_review_load_by_token($token);
if (!$sale) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'state' => 'invalid', 'message' => 'Link inválido']);
    exit;
}

$ctx = gcv_review_context_from_sale($sale);
$win = $ctx['window'];
$existing = $ctx['existing'];
$out = [
    'ok' => true,
    'state' => $ctx['state'],
    'tour' => [
        'reservation_id' => strtoupper(trim((string)($sale['reservation_id'] ?? ''))),
        'title' => $ctx['title'],
        'guide_name' => $ctx['guide_name'],
        'tour_date' => $win['tour_date'],
        'deadline' => $win['deadline'],
        'time' => substr((string)($sale['departure_time'] ?? ''), 0, 5),
    ],
    'review' => null,
];
if ($existing) {
    $out['review'] = gcv_review_tourist_payload($existing);
}
echo json_encode($out, JSON_UNESCAPED_UNICODE);
