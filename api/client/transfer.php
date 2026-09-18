<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace/transfer_service.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$data = body_json();
$action = strtolower(trim((string)($data['action'] ?? '')));

try {
    if ($action === 'accept') {
        $offerId = (int)($data['offer_id'] ?? 0);
        if ($offerId <= 0) {
            json_response(false, null, 'Oferta inválida', 422);
        }
        $out = gcv_transfer_accept_offer($offerId, $user);
        json_response(true, $out);
    }
    if ($action === 'refund') {
        $saleId = (int)($data['sale_id'] ?? 0);
        if ($saleId <= 0) {
            json_response(false, null, 'Reserva inválida', 422);
        }
        $out = gcv_transfer_refund_sale($saleId, $user);
        json_response(true, $out);
    }
    json_response(false, null, 'Ação inválida', 422);
} catch (Throwable $e) {
    json_response(false, null, $e->getMessage(), 409);
}
