<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once dirname(__DIR__) . '/helpers/review_service.php';
require_once dirname(__DIR__) . '/helpers/rate_limiter.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    check_rate_limit('review_submit', 12, 60);
} catch (Throwable $e) {
    // rate table pode não existir
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
    echo json_encode(['ok' => false, 'state' => 'invalid', 'message' => 'Link inválido']);
    exit;
}

$loc = strtolower(trim((string)($raw['locale'] ?? 'pt')));
try {
    $row = gcv_review_submit($sale, $raw, $loc);
    echo json_encode([
        'ok' => true,
        'state' => 'already',
        'review' => gcv_review_tourist_payload($row),
        'message' => 'Avaliação registrada',
    ], JSON_UNESCAPED_UNICODE);
} catch (InvalidArgumentException $e) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'state' => 'scores', 'message' => 'Informe as 3 notas (1 a 5)']);
} catch (RuntimeException $e) {
    $code = $e->getMessage();
    $map = [
        'duplicate' => [409, 'Já existe avaliação para esta reserva'],
        'expired' => [403, 'O prazo de 1 ano para avaliar encerrou'],
        'too_early' => [403, 'O passeio ainda não ocorreu'],
        'not_paid' => [403, 'Reserva não está paga'],
        'invalid' => [404, 'Link inválido'],
    ];
    $pack = $map[$code] ?? [409, $code];
    http_response_code($pack[0]);
    echo json_encode(['ok' => false, 'state' => $code, 'message' => $pack[1]], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('review submit: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Não foi possível salvar']);
}
