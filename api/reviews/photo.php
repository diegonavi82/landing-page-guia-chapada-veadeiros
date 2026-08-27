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

$token = gcv_review_normalize_token((string)($_POST['token'] ?? $_POST['t'] ?? ''));
$sale = $token !== '' ? gcv_review_load_by_token($token) : null;
if (!$sale) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'message' => 'Link inválido']);
    exit;
}
$ctx = gcv_review_context_from_sale($sale);
if ($ctx['state'] !== 'form') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'state' => $ctx['state'], 'message' => 'Não é possível enviar foto']);
    exit;
}
if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Arquivo obrigatório']);
    exit;
}

try {
    $saved = gcv_review_save_photo($_FILES['file']);
    echo json_encode(['ok' => true, 'data' => $saved], JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $e) {
    $map = [
        'too_large' => 'Arquivo maior que 8MB',
        'type' => 'Use JPG, PNG ou WEBP',
        'upload' => 'Falha no upload',
        'mkdir' => 'Não foi possível salvar',
        'save' => 'Falha ao salvar arquivo',
    ];
    $code = $e->getMessage();
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => $map[$code] ?? $code]);
}
