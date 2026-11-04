<?php

declare(strict_types=1);

/**
 * GET /api/mp_saved_cards.php?email=
 * Cartões nacionais já salvos neste e-mail, para o Brick preencher e pedir só o CVV.
 * Não devolve número, nome nem final do cartão — só o id do cliente e os ids dos cartões.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/payments/mercadopago_api.php';
require_once __DIR__ . '/helpers/payments/rate_limit.php';

gcv_pix_cors_headers();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

gcv_rate_limit_or_fail('mp_saved_cards', 20, 600);

$email = strtolower(trim((string) ($_GET['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 180) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid email']);
    exit;
}

$saved = gcv_mp_token() === ''
    ? ['customer_id' => '', 'card_ids' => [], 'methods' => []]
    : gcv_mp_saved_cards($email);

echo json_encode([
    'success' => true,
    'customer_id' => $saved['customer_id'],
    'card_ids' => $saved['card_ids'],
    'methods' => $saved['methods'],
], JSON_UNESCAPED_UNICODE);
