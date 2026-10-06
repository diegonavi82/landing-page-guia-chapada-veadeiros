<?php

declare(strict_types=1);

/**
 * POST /api/stripe_webhook.php — eventos da Stripe.
 * Painel Stripe → Desenvolvedores → Webhooks → endpoint
 *   https://www.guiachapadaveadeiros.com/api/stripe_webhook.php
 * Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
 *          charge.refunded, charge.dispute.created, charge.dispute.closed,
 *          payment_intent.canceled, payout.created, payout.updated, payout.paid, payout.failed
 * Copie o "Signing secret" (whsec_…) para STRIPE_WEBHOOK_SECRET no api/.env.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/mailer.php'; // escopo global: e-mails de aviso
require_once __DIR__ . '/helpers/payments/stripe_ledger.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

$payload = file_get_contents('php://input') ?: '';
if (!gcv_stripe_valid_signature($payload, (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''))) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_signature']);
    exit;
}

$event = json_decode($payload, true);
$type = (string) ($event['type'] ?? '');
$obj = is_array($event['data']['object'] ?? null) ? $event['data']['object'] : [];

try {
    switch ($type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
            $out = gcv_stripe_apply_session($obj);
            echo json_encode(['ok' => true, 'applied' => !empty($out['ok']), 'reservation_id' => $out['reservation_id'] ?? null]);
            break;

        case 'charge.refunded':
        case 'charge.dispute.created':
        case 'charge.dispute.closed':
            $pi = (string) ($obj['payment_intent'] ?? '');
            if ($pi === '' && !empty($obj['charge'])) {
                $ch = gcv_stripe_request('GET', '/v1/charges/' . rawurlencode((string) $obj['charge']));
                $pi = (string) ($ch['data']['payment_intent'] ?? '');
            }
            $row = $pi !== '' ? gcv_ledger_find_external('stripe', $pi) : null;
            if ($row) {
                $rec = gcv_pix_read_reservation((string) $row['reservation_id']) ?: ['reservation_id' => $row['reservation_id']];
                gcv_stripe_ledger_from_intent($rec, $pi, (string) ($row['checkout_ref'] ?? ''));
            }
            echo json_encode(['ok' => true, 'found' => (bool) $row]);
            break;

        case 'payment_intent.canceled':
            // Reserva no cartão venceu/foi cancelada fora do nosso fluxo: volta a "cartão salvo"
            // para o cron tentar reservar de novo (ou liberar a vaga se não der tempo).
            $pi = (string) ($obj['id'] ?? '');
            $rid = gcv_pix_safe_id((string) ($obj['metadata']['reservation_id'] ?? ''));
            $rec = $rid !== '' ? gcv_pix_read_reservation($rid) : null;
            if ($rec && strtoupper((string) ($rec['status'] ?? '')) === 'AUTHORIZED' && (string) ($rec['card_auth']['id'] ?? '') === $pi) {
                require_once __DIR__ . '/helpers/payments/authorization.php';
                $rec['status'] = 'CARD_SAVED';
                unset($rec['card_auth']);
                gcv_pix_write_reservation($rec);
                gcv_ledger_upsert(['reservation_id' => $rid, 'gateway' => 'stripe', 'status' => 'CARD_SAVED']);
            }
            echo json_encode(['ok' => true]);
            break;

        case 'payout.created':
        case 'payout.updated':
        case 'payout.paid':
        case 'payout.failed':
        case 'payout.canceled':
            gcv_stripe_apply_payout($obj);
            echo json_encode(['ok' => true]);
            break;

        default:
            echo json_encode(['ok' => true, 'ignored' => $type]);
    }
} catch (Throwable $e) {
    error_log('stripe_webhook ' . $type . ': ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false]);
}
