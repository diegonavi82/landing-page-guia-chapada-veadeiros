<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/helpers/pix_reservation_store.php';
require_once dirname(__DIR__) . '/helpers/marketplace/sale_service.php';
require_once dirname(__DIR__) . '/helpers/payments/pix_refund.php';
require_once dirname(__DIR__) . '/helpers/excursion_status.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($raw)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON']);
    exit;
}

$code = gcv_pix_safe_id((string)($raw['reservation_id'] ?? $raw['code'] ?? ''));
$email = strtolower(trim((string)($raw['email'] ?? '')));
if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $code) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Dados inválidos']);
    exit;
}

$indexes = null;
if (array_key_exists('trip_indexes', $raw)) {
    if (!is_array($raw['trip_indexes'])) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'message' => 'Dados inválidos']);
        exit;
    }
    $indexes = [];
    foreach ($raw['trip_indexes'] as $n) {
        if (is_int($n) || (is_string($n) && preg_match('/^\d+$/', (string)$n))) {
            $indexes[] = (int)$n;
        }
    }
    $indexes = array_values(array_unique($indexes));
}

try {
    $out = gcv_sale_cancel_reservation($code, $email, true, $indexes);
    echo json_encode([
        'ok' => true,
        'reservation_id' => $code,
        'status' => $out['status'] ?? 'PAID',
        'partial' => !empty($out['partial']),
        'full' => !empty($out['full']),
        'refunded_cents' => (int)($out['refunded_cents'] ?? 0),
        'refunded_trips' => $out['refunded_trips'] ?? [],
        'kept' => $out['kept'] ?? [],
        'lifecycle' => $out['lifecycle'] ?? '',
        'message' => (string)($out['message'] ?? ''),
    ], JSON_UNESCAPED_UNICODE);
} catch (GcvPixRefundException $e) {
    $codeHttp = match ($e->errorCode) {
        'email' => 403,
        'not_found' => 404,
        'bank' => 502,
        default => 409,
    };
    http_response_code($codeHttp);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage(),
        'error_code' => $e->errorCode,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    $codeHttp = str_contains($msg, 'não encontrada') ? 404 : (str_contains($msg, 'E-mail') ? 403 : 409);
    http_response_code($codeHttp);
    echo json_encode(['ok' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE);
}
