<?php

declare(strict_types=1);

/**
 * GET /api/payment_quote.php?amount=100.00
 * Mostra no checkout quanto custa cada forma de pagamento (Pix, cartão nacional, internacional).
 * Só exibição: o valor cobrado é recalculado no servidor em mp_checkout / stripe_checkout.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/payments/pricing.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$amount = (float) str_replace(',', '.', (string) ($_GET['amount'] ?? '0'));
$cents = (int) round($amount * 100);
if (!is_finite($amount) || $cents < 100 || $cents > 10000000) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid amount']);
    exit;
}

echo json_encode([
    'success' => true,
    'base_cents' => $cents,
    'quotes' => gcv_pay_quote_all($cents),
    // Chave pública do Mercado Pago (pode ir ao navegador) para o formulário de cartão embutido.
    'mp_public_key' => (string) ($_ENV['MP_PUBLIC_KEY'] ?? getenv('MP_PUBLIC_KEY') ?: ''),
], JSON_UNESCAPED_UNICODE);
