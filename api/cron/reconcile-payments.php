<?php

declare(strict_types=1);

/**
 * Cron — conciliação de pagamentos (a cada 15 min, junto com auto-payouts).
 * Auth: header X-GCV-Webhook-Secret ou ?secret= (pix_webhook_secret)
 *
 * Hostinger:
 *   wget -q -O - "https://www.guiachapadaveadeiros.com/api/cron/reconcile-payments.php?secret=SEU_SEGREDO"
 *
 * 1. Mercado Pago: confere pagamentos sem retorno/webhook e atualiza taxas reais.
 * 1b. Pré-autorização: reserva no cartão na janela, cobra com quórum + guia, libera se não confirmar.
 * 2. Stripe: idem + repasses recentes Stripe → Sicoob.
 * 3. Marca o saldo MP liberado e procura no extrato Pix do Sicoob a transferência do MP.
 * 4. Uma vez por dia: resumo por e-mail (saldo a transferir, a caminho, contestações).
 */

require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/payments/ledger.php';
require_once __DIR__ . '/../helpers/payments/mercadopago_api.php';
require_once __DIR__ . '/../helpers/payments/stripe_ledger.php';

header('Content-Type: application/json; charset=utf-8');

$cfg = gcv_load_config();
$expected = (string) ($cfg['pix_webhook_secret'] ?? '');
$secret = (string) ($_SERVER['HTTP_X_GCV_WEBHOOK_SECRET'] ?? ($_GET['secret'] ?? ''));
if ($expected === '' || !hash_equals($expected, $secret)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

gcv_ledger_ensure_schema();
$out = ['mp_checked' => 0, 'stripe_checked' => 0, 'payouts' => 0, 'mp_transfers_found' => 0, 'digest' => false];

// 1) Mercado Pago — pendentes há mais de 10 min (até 2 dias) e pagos com taxa estimada
$rows = db()->query(
    "SELECT reservation_id FROM gcv_payment_transactions
     WHERE gateway = 'mercadopago'
       AND ((status = 'PENDING' AND created_at < NOW() - INTERVAL 10 MINUTE AND created_at > NOW() - INTERVAL 2 DAY)
            OR (status = 'PAID' AND fee_source = 'estimate'))
     ORDER BY id DESC LIMIT 30"
)->fetchAll(PDO::FETCH_COLUMN) ?: [];
foreach ($rows as $rid) {
    $r = gcv_mp_request('GET', '/v1/payments/search?sort=date_created&criteria=desc&external_reference=' . rawurlencode((string) $rid));
    foreach ((array) ($r['data']['results'] ?? []) as $p) {
        if (is_array($p)) {
            gcv_mp_apply_payment($p);
        }
    }
    $out['mp_checked']++;
}

// 2) Stripe — sessões pendentes e pagos com taxa estimada
$rows = db()->query(
    "SELECT reservation_id, status, external_id, checkout_ref FROM gcv_payment_transactions
     WHERE gateway = 'stripe'
       AND ((status = 'PENDING' AND checkout_ref IS NOT NULL AND created_at < NOW() - INTERVAL 10 MINUTE AND created_at > NOW() - INTERVAL 2 DAY)
            OR (status = 'PAID' AND fee_source = 'estimate'))
     ORDER BY id DESC LIMIT 30"
)->fetchAll(PDO::FETCH_ASSOC) ?: [];
foreach ($rows as $row) {
    if ($row['status'] === 'PENDING') {
        $s = gcv_stripe_request('GET', '/v1/checkout/sessions/' . rawurlencode((string) $row['checkout_ref']));
        if (!empty($s['ok'])) {
            gcv_stripe_apply_session($s['data']);
        }
    } elseif (!empty($row['external_id'])) {
        $rec = gcv_pix_read_reservation((string) $row['reservation_id']) ?: ['reservation_id' => $row['reservation_id']];
        gcv_stripe_ledger_from_intent($rec, (string) $row['external_id'], (string) ($row['checkout_ref'] ?? ''));
    }
    $out['stripe_checked']++;
}

if (gcv_stripe_secret() !== '') {
    $p = gcv_stripe_request('GET', '/v1/payouts?limit=10');
    foreach ((array) ($p['data']['data'] ?? []) as $po) {
        if (is_array($po)) {
            gcv_stripe_apply_payout($po);
            $out['payouts']++;
        }
    }
}

// 2b) Cartão com pré-autorização: reservar na janela, cobrar com quórum + guia, liberar se não confirmar
require_once __DIR__ . '/../helpers/payments/authorization.php';
$out['auth'] = [];
foreach (gcv_auth_open_reservations(80) as $rid) {
    try {
        $res = gcv_auth_process_reservation((string) $rid);
        if ($res !== 'waiting' && $res !== 'waiting_window') {
            $out['auth'][$rid] = $res;
        }
    } catch (Throwable $e) {
        error_log('auth process ' . $rid . ': ' . $e->getMessage());
    }
}
$out['guide_alerts'] = gcv_auth_guide_alerts();

// 3) Saldo MP liberado → procura a transferência no extrato Pix do Sicoob (últimos 3 dias)
$mpAvail = gcv_ledger_mp_available();
if ($mpAvail['cents'] > 0) {
    try {
        require_once __DIR__ . '/../helpers/sicoob_api.php';
        if (gcv_sicoob_is_configured()) {
            $payload = gcv_sicoob_api_get('/pix', [
                'inicio' => gcv_sicoob_format_dt(time() - 3 * 86400),
                'fim' => gcv_sicoob_format_dt(time()),
            ]);
            foreach (gcv_sicoob_extract_pix_list($payload) as $item) {
                if (gcv_ledger_match_incoming_transfer(['pix' => [$item]])) {
                    $out['mp_transfers_found']++;
                }
            }
            $mpAvail = gcv_ledger_mp_available();
        }
    } catch (Throwable $e) {
        error_log('reconcile sicoob scan: ' . $e->getMessage());
    }
}
$out['mp_available_cents'] = $mpAvail['cents'];

// 4) Resumo diário (depois das 9h, uma vez por dia)
$stateFile = dirname(__DIR__) . '/storage/payments_reconcile.json';
$state = is_readable($stateFile) ? (json_decode((string) file_get_contents($stateFile), true) ?: []) : [];
$now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
$today = $now->format('Y-m-d');
if ((int) $now->format('G') >= 9 && ($state['digest_on'] ?? '') !== $today) {
    $inTransit = (int) db()->query(
        "SELECT COALESCE(SUM(net_cents),0) FROM gcv_payment_transactions
         WHERE status IN ('PAID','PARTIALLY_REFUNDED') AND settlement_status IN ('IN_GATEWAY','IN_TRANSIT') AND gateway = 'stripe'"
    )->fetchColumn();
    $disputes = (int) db()->query(
        "SELECT COUNT(*) FROM gcv_payment_transactions WHERE status = 'CHARGEBACK' AND updated_at > NOW() - INTERVAL 30 DAY"
    )->fetchColumn();
    $review = (int) db()->query(
        "SELECT COUNT(*) FROM gcv_payment_transactions WHERE price_review = 1 AND status = 'PAID' AND paid_at > NOW() - INTERVAL 1 DAY"
    )->fetchColumn();
    $brl = static fn (int $c): string => 'R$ ' . number_format($c / 100, 2, ',', '.');

    if ($mpAvail['cents'] > 0 || $inTransit > 0 || $disputes > 0 || $review > 0) {
        $html = '<p>Resumo financeiro de ' . $now->format('d/m/Y') . ':</p><ul>'
            . '<li><strong>Mercado Pago liberado, aguardando ir para o Sicoob:</strong> ' . $brl($mpAvail['cents'])
            . ' (' . $mpAvail['count'] . ' venda(s)).' . ($mpAvail['cents'] > 0 ? ' Se a transferência automática não estiver ligada, transfira pelo app do Mercado Pago para a conta Sicoob — o sistema reconhece quando chegar.' : '') . '</li>'
            . '<li><strong>Stripe a caminho do Sicoob:</strong> ' . $brl($inTransit) . '</li>'
            . '<li><strong>Contestações (30 dias):</strong> ' . $disputes . '</li>'
            . '<li><strong>Vendas de ontem com preço não conferido:</strong> ' . $review . '</li>'
            . '</ul><p>Detalhes: painel admin → Financeiro → Transações.</p>';
        gcv_ledger_alert_admin('Resumo de pagamentos ' . $now->format('d/m'), $html);
        $out['digest'] = true;
    }
    $state['digest_on'] = $today;
    @file_put_contents($stateFile, json_encode($state), LOCK_EX);
}

echo json_encode(['success' => true] + $out, JSON_UNESCAPED_UNICODE);
