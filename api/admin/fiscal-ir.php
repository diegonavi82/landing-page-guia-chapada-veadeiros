<?php

declare(strict_types=1);

/**
 * Admin — Imposto de renda.
 * GET  ?year=2026            resumo, prestadores e depósitos
 * GET  ?year=2026&export=csv planilha do ano
 * POST action=correct       corrige o CPF/CNPJ vinculado a um Pix
 * POST action=send_notices  envia o informe de um ano já fechado
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/fiscal_ir.php';

$admin = require_admin();
gcv_fiscal_ensure_schema();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $year = (int)($_GET['year'] ?? gcv_fiscal_now_year());
    if (($_GET['export'] ?? '') === 'csv') {
        $lines = gcv_fiscal_paid_lines($year);
        $csv = gcv_fiscal_csv($year, $lines, true);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="informe-ir-' . $year . '.csv"');
        echo $csv;
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    try {
        json_response(true, gcv_fiscal_admin_year($year));
    } catch (Throwable $e) {
        error_log('fiscal admin: ' . $e->getMessage());
        json_response(false, null, 'Erro ao montar o informe', 500);
    }
}

if ($method !== 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    json_response(false, null, 'Método não permitido', 405);
}

header('Content-Type: application/json; charset=utf-8');
$body = body_json();
$action = strtolower(trim((string)($body['action'] ?? '')));

try {
    if ($action === 'correct') {
        gcv_fiscal_correct(
            (int)$admin['id'],
            strtolower(trim((string)($body['source'] ?? ''))),
            (int)($body['payout_id'] ?? 0),
            $body
        );
        json_response(true, ['message' => 'Documento do Pix atualizado']);
    }
    if ($action === 'send_notices') {
        $year = (int)($body['year'] ?? 0);
        $result = gcv_fiscal_send_year_notices($year, true, 80);
        if (($result['reason'] ?? '') === 'ano_aberto') {
            json_response(false, $result, 'O informe desse ano ainda está em andamento', 422);
        }
        json_response(true, $result);
    }
    json_response(false, null, 'Ação inválida', 422);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (RuntimeException $e) {
    json_response(false, null, $e->getMessage(), 404);
} catch (Throwable $e) {
    error_log('fiscal admin post: ' . $e->getMessage());
    json_response(false, null, 'Erro ao gravar o informe', 500);
}
