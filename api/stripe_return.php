<?php

declare(strict_types=1);

/**
 * GET /api/stripe_return.php?session_id=cs_… — volta do Stripe Checkout.
 * Consulta a sessão na API (nunca confia na URL), marca como paga e grava as taxas.
 * O webhook (stripe_webhook.php) faz o mesmo caso o cliente feche a aba antes de voltar.
 */

require_once __DIR__ . '/helpers/mailer.php'; // escopo global: e-mails de aviso
require_once __DIR__ . '/helpers/payments/stripe_ledger.php';

function gcv_stripe_redirect(string $path): void
{
    header('Location: ' . $path, true, 302);
    exit;
}

$sessionId = (string) ($_GET['session_id'] ?? '');
if (!preg_match('/^cs_[A-Za-z0-9_]+$/', $sessionId)) {
    gcv_stripe_redirect('/');
}

$session = gcv_stripe_request('GET', '/v1/checkout/sessions/' . rawurlencode($sessionId));
if (empty($session['ok']) || !is_array($session['data'] ?? null)) {
    gcv_stripe_redirect('/');
}

$out = gcv_stripe_apply_session($session['data']);
$rid = (string) ($out['reservation_id'] ?? '');
$locale = (string) ($out['locale'] ?? 'pt');

if (!empty($out['ok'])) {
    gcv_stripe_redirect(gcv_checkout_confirm_path($locale) . '?id=' . rawurlencode($rid));
}

$rec = $rid !== '' ? gcv_pix_read_reservation($rid) : null;
gcv_stripe_redirect($rec && !empty($rec['return_path']) ? gcv_checkout_safe_return_path((string) $rec['return_path']) : '/');
