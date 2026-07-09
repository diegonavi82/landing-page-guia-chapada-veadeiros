<?php

declare(strict_types=1);

/**
 * Diagnóstico Pix/Sicoob (protegido pelo pix_webhook_secret).
 * GET /api/diag_pix.php?secret=...
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers/sicoob_api.php';
require_once __DIR__ . '/helpers/pix_reservation_store.php';

$cfg = gcv_load_config();
$expected = (string)($cfg['pix_webhook_secret'] ?? '');
$secret = (string)($_SERVER['HTTP_X_GCV_WEBHOOK_SECRET'] ?? ($_GET['secret'] ?? ''));
if ($expected === '' || !hash_equals($expected, $secret)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Forbidden']);
    exit;
}

$sicoobCfg = gcv_sicoob_api_cfg();
$certPath = $sicoobCfg['cert_pfx'] !== ''
    ? gcv_sicoob_resolve_path($sicoobCfg['cert_pfx'])
    : '';

$out = [
    'ok' => true,
    'sicoob_configured' => gcv_sicoob_is_configured(),
    'client_id_set' => $sicoobCfg['client_id'] !== '',
    'pix_key' => $sicoobCfg['pix_key'],
    'api_base' => gcv_sicoob_api_base(),
    'cert_pfx' => $sicoobCfg['cert_pfx'],
    'cert_readable' => $certPath !== '' && is_readable($certPath),
    'token_ok' => false,
    'webhook_url' => $sicoobCfg['webhook_base_url'],
];

$token = gcv_sicoob_access_token();
$out['token_ok'] = $token !== null && $token !== '';

$reservationId = gcv_pix_safe_id((string)($_GET['reservation_id'] ?? ''));
if (preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
    $res = gcv_pix_read_reservation($reservationId);
    $out['reservation'] = $res ? [
        'reservation_id' => $res['reservation_id'] ?? null,
        'status' => gcv_pix_effective_status($res),
        'amount' => $res['amount'] ?? null,
        'txid' => $res['txid'] ?? null,
        'pix_mode' => $res['pix_mode'] ?? null,
        'has_brcode' => !empty($res['brcode']),
        'email' => $res['email'] ?? null,
        'created_at' => $res['created_at'] ?? null,
        'paid_at' => $res['paid_at'] ?? null,
        'paid_source' => $res['paid_source'] ?? null,
        'sicoob_cob_error' => $res['sicoob_cob_error'] ?? null,
    ] : null;
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
