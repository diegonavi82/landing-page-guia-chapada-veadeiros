<?php
declare(strict_types=1);

/**
 * Painel financeiro do guia: passeios, pessoas e recebimentos PIX.
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/marketplace/guide_earnings_service.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_role('guide');
if (($user['status'] ?? '') !== 'active') {
    json_response(false, null, 'Guia ainda não aprovado', 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

try {
    json_response(true, gcv_guide_earnings_dashboard((int)$user['id']));
} catch (Throwable $e) {
    error_log('guide_earnings: ' . $e->getMessage());
    json_response(false, null, 'Erro ao carregar financeiro', 500);
}
