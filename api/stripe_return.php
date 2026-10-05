<?php

declare(strict_types=1);

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/stripe_api.php';

function gcv_stripe_confirm_path(string $locale): string
{
    if ($locale === 'en') {
        return '/en/confirmacao.html';
    }
    if ($locale === 'es') {
        return '/es/confirmacao.html';
    }
    return '/confirmacao.html';
}

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

$data = $session['data'];
$meta = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];
$reservationId = gcv_pix_safe_id((string) ($meta['reservation_id'] ?? $data['client_reference_id'] ?? ''));
$locale = in_array($meta['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $meta['locale'] : 'pt';

$reservation = preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)
    ? gcv_pix_read_reservation($reservationId)
    : null;

$cancel = '/';
if ($reservation && !empty($reservation['return_path'])) {
    $cancel = gcv_stripe_safe_return_path((string) $reservation['return_path']);
}

if (($data['payment_status'] ?? '') !== 'paid' || !$reservation) {
    gcv_stripe_redirect($cancel);
}

$expected = (int) ($reservation['amount_cents'] ?? round(((float) ($reservation['amount'] ?? 0)) * 100));
$paidCents = (int) ($data['amount_total'] ?? 0);
if ($expected < 50 || $paidCents !== $expected) {
    error_log('stripe_return amount mismatch ' . $reservationId);
    gcv_stripe_redirect($cancel);
}

$marked = gcv_pix_mark_paid($reservationId, 'stripe');
if (!$marked) {
    $again = gcv_pix_read_reservation($reservationId);
    if (!$again || gcv_pix_effective_status($again) !== 'PAID') {
        gcv_stripe_redirect($cancel);
    }
    $marked = $again;
}

if (!empty($data['payment_intent']) && empty($marked['stripe_payment_intent'])) {
    $marked['stripe_payment_intent'] = (string) $data['payment_intent'];
    $marked['stripe_session_id'] = $sessionId;
    gcv_pix_write_reservation($marked);
}

try {
    require_once __DIR__ . '/helpers/purchase_notify.php';
    gcv_notify_admin_purchase($marked);
} catch (Throwable $e) {
    error_log('stripe_return notify: ' . $e->getMessage());
}

gcv_stripe_redirect(gcv_stripe_confirm_path($locale) . '?id=' . rawurlencode($reservationId));
