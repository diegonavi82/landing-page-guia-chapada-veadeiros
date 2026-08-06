<?php
declare(strict_types=1);

/**
 * Cadastro financeiro obrigatório do guia.
 * GET / PUT
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace/guide_financial_service.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';

header('Content-Type: application/json; charset=utf-8');
$user = require_role('guide');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $profile = gcv_guide_financial_get((int)$user['id']);
    json_response(true, [
        'profile' => $profile,
        'ready_for_payout' => gcv_guide_financial_is_ready((int)$user['id']),
    ]);
}

if ($method === 'PUT' || $method === 'POST') {
    try {
        $profile = gcv_guide_financial_upsert(
            (int)$user['id'],
            body_json(),
            (int)$user['id'],
            GcvCreatedBy::GUIDE
        );
        json_response(true, [
            'message' => 'Perfil financeiro salvo',
            'profile' => $profile,
            'ready_for_payout' => gcv_guide_financial_is_ready((int)$user['id']),
        ]);
    } catch (InvalidArgumentException $e) {
        json_response(false, null, $e->getMessage(), 422);
    } catch (Throwable $e) {
        json_response(false, null, $e->getMessage(), 500);
    }
}

json_response(false, null, 'Método não permitido', 405);
