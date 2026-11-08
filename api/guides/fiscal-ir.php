<?php

declare(strict_types=1);

/**
 * Guia — informe de rendimentos de cada ano, inclusive sem depósito.
 * GET ?year=2025
 * GET ?year=2025&export=csv
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/fiscal_ir.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_role('guide');
if (($user['status'] ?? '') !== 'active') {
    json_response(false, null, 'Guia ainda não aprovado', 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

$guideId = (int)$user['id'];
$year = isset($_GET['year']) && $_GET['year'] !== '' ? (int)$_GET['year'] : null;

try {
    $data = gcv_fiscal_guide_statement($guideId, $year);
} catch (Throwable $e) {
    error_log('fiscal guide: ' . $e->getMessage());
    json_response(false, null, 'Erro ao montar o informe', 500);
}

if (($_GET['export'] ?? '') === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="informe-rendimentos-' . (int)$data['year'] . '.csv"');
    echo gcv_fiscal_csv((int)$data['year'], $data['lines'], false);
    exit;
}

json_response(true, $data);
