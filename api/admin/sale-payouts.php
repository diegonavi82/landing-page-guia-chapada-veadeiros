<?php
declare(strict_types=1);

/**
 * Admin — REGISTRAR REPASSE PIX (manual) vinculado a venda (snapshot).
 * GET  — lista vendas pendentes de repasse + payouts
 * POST — action=register_pix | eligibility | auto_stub
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/marketplace/payout_service.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_marketplace_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $status = strtoupper(trim((string)($_GET['payout_status'] ?? 'PAYOUT_PENDING')));
    $params = [];
    $sql = "SELECT s.*,
              u.email AS guide_email,
              gf.pix_key AS guide_pix_key,
              gf.pix_key_type AS guide_pix_key_type
            FROM gcv_sales s
            LEFT JOIN gcv_users u ON u.id = s.guide_user_id
            LEFT JOIN gcv_guide_financial gf ON gf.guide_user_id = s.guide_user_id AND gf.deleted_at IS NULL
            WHERE s.deleted_at IS NULL AND s.sale_status = 'PAID'";
    if ($status !== '' && $status !== 'ALL') {
        $sql .= ' AND s.payout_status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY s.scheduled_payout_at ASC, s.sold_at DESC LIMIT 200';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $payouts = db()->query(
        "SELECT p.*, u.name AS guide_name, a.name AS responsible_name, s.reservation_id, s.excursion_title
         FROM gcv_sale_payouts p
         JOIN gcv_users u ON u.id = p.guide_user_id
         JOIN gcv_users a ON a.id = p.responsible_user_id
         LEFT JOIN gcv_sales s ON s.id = p.sale_id
         WHERE p.deleted_at IS NULL
         ORDER BY p.created_at DESC LIMIT 100"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];

    json_response(true, [
        'sales' => $sales,
        'payouts' => $payouts,
        'payout_statuses' => GcvPayoutStatus::all(),
    ]);
}

if ($method !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$body = body_json();
$action = strtolower(trim((string)($body['action'] ?? 'register_pix')));

try {
    if ($action === 'register_pix' || $action === 'register') {
        $payout = gcv_payout_register_manual($body, (int)$admin['id']);
        json_response(true, [
            'message' => 'Repasse PIX registrado',
            'payout' => $payout,
        ]);
    }
    if ($action === 'eligibility') {
        $saleId = (int)($body['sale_id'] ?? 0);
        json_response(true, gcv_payout_auto_eligibility($saleId));
    }
    if ($action === 'auto_stub') {
        $saleId = (int)($body['sale_id'] ?? 0);
        json_response(true, gcv_payout_auto_execute_stub($saleId));
    }
    json_response(false, null, 'Ação inválida', 422);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (RuntimeException $e) {
    json_response(false, null, $e->getMessage(), 409);
} catch (Throwable $e) {
    json_response(false, null, $e->getMessage(), 500);
}
