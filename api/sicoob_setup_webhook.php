<?php

declare(strict_types=1);

/**
 * Registra webhook PIX no Sicoob (executar uma vez após configurar certificado).
 * Protegido por pix_webhook_secret — acesse via CLI ou:
 *   POST /api/sicoob_setup_webhook.php?secret=SEU_SEGREDO
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers/sicoob_api.php';

$cfg = gcv_load_config();
$expected = (string)($cfg['pix_webhook_secret'] ?? '');

$isCli = PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg';
if (!$isCli) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'POST required']);
        exit;
    }
    $secret = (string)($_SERVER['HTTP_X_GCV_WEBHOOK_SECRET'] ?? ($_GET['secret'] ?? ''));
    if ($expected === '' || !hash_equals($expected, $secret)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden']);
        exit;
    }
}

$result = gcv_sicoob_register_webhook();
http_response_code($result['success'] ? 200 : 500);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
