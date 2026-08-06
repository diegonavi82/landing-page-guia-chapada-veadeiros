<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace/commission_service.php';
require_once __DIR__ . '/../helpers/marketplace/audit_service.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $includeInactive = !empty($_GET['all']);
    json_response(true, [
        'rules' => gcv_commission_list_rules($includeInactive),
        'priority' => ['excursion', 'guide', 'category', 'city', 'global'],
    ]);
}

$body = body_json();

if ($method === 'POST' || $method === 'PUT') {
    try {
        $row = gcv_commission_upsert_rule($body, (int)$admin['id']);
        gcv_audit_log(
            'commission_rule',
            (int)$row['id'],
            'upsert',
            (int)$admin['id'],
            null,
            null,
            $row,
            GcvCreatedBy::ADMIN
        );
        json_response(true, ['rule' => $row]);
    } catch (InvalidArgumentException $e) {
        json_response(false, null, $e->getMessage(), 422);
    } catch (Throwable $e) {
        json_response(false, null, $e->getMessage(), 500);
    }
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        json_response(false, null, 'id obrigatório', 422);
    }
    $ok = gcv_commission_soft_delete_rule($id, (int)$admin['id']);
    if (!$ok) {
        json_response(false, null, 'Regra não encontrada', 404);
    }
    gcv_audit_log('commission_rule', $id, 'soft_delete', (int)$admin['id'], null, null, null, GcvCreatedBy::ADMIN);
    json_response(true, ['deleted' => $id]);
}

json_response(false, null, 'Método não permitido', 405);
