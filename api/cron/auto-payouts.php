<?php
declare(strict_types=1);

/**
 * Cron — envia PIX automático aos guias (vendas elegíveis).
 * Auth: header X-GCV-Webhook-Secret ou ?secret= (pix_webhook_secret)
 *
 * Hostinger: a cada 15 min
 * wget -q -O - "https://www.guiachapadaveadeiros.com/api/cron/auto-payouts.php?secret=SEU_SEGREDO"
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/marketplace/payout_service.php';

header('Content-Type: application/json; charset=utf-8');

$cfg = gcv_load_config();
$expected = (string)($cfg['pix_webhook_secret'] ?? '');
$secret = (string)($_SERVER['HTTP_X_GCV_WEBHOOK_SECRET'] ?? ($_GET['secret'] ?? ''));
if ($expected === '' || !hash_equals($expected, $secret)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$ops = ['reminders' => 0, 'noshow' => 0];
try {
    require_once __DIR__ . '/../helpers/notify_ops.php';
    $ops = gcv_ops_cron_tick();
} catch (Throwable $e) {
    error_log('ops cron: ' . $e->getMessage());
}
$referrals = ['rewarded' => 0, 'released' => 0];
try {
    require_once __DIR__ . '/../helpers/indicacoes.php';
    $referrals['rewarded'] = gcv_referral_settle_due(30);
    $referrals['released'] = gcv_wallet_release_expired(40);
} catch (Throwable $e) {
    error_log('referral cron: ' . $e->getMessage());
}
$out = gcv_payout_process_due(null, 25);
$fiscal = ['sent' => 0, 'skipped' => 0, 'failed' => 0];
try {
    require_once __DIR__ . '/../helpers/fiscal_ir.php';
    $fiscal = gcv_fiscal_send_year_notices();
} catch (Throwable $e) {
    error_log('fiscal notices: ' . $e->getMessage());
}
echo json_encode([
    'success' => true,
    'processed' => $out['processed'],
    'paid' => $out['paid'],
    'skipped' => $out['skipped'],
    'failed' => $out['failed'],
    'ops' => $ops,
    'referrals' => $referrals,
    'fiscal_notices' => $fiscal,
], JSON_UNESCAPED_UNICODE);
