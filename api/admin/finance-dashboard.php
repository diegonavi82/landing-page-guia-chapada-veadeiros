<?php
declare(strict_types=1);

/**
 * Admin > Financeiro — dashboard, relatório contábil e exportações.
 * GET ?export=csv|xlsx|pdf|json&accounting=1
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/marketplace/finance_dashboard_service.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

$filters = [
    'from' => $_GET['from'] ?? $_GET['date_from'] ?? null,
    'to' => $_GET['to'] ?? $_GET['date_to'] ?? null,
    'guide_user_id' => $_GET['guide_user_id'] ?? null,
    'cpf' => $_GET['cpf'] ?? null,
    'cnpj' => $_GET['cnpj'] ?? null,
    'excursion_id' => $_GET['excursion_id'] ?? null,
    'city_id' => $_GET['city_id'] ?? null,
    'status' => $_GET['status'] ?? null,
    'payout_status' => $_GET['payout_status'] ?? null,
    'origin' => $_GET['origin'] ?? $_GET['created_by_origin'] ?? null,
    'business_mode' => $_GET['business_mode'] ?? null,
    'limit' => $_GET['limit'] ?? 500,
];

$export = strtolower(trim((string)($_GET['export'] ?? '')));
$accounting = !empty($_GET['accounting']);

try {
    if ($accounting || in_array($export, ['csv', 'xlsx', 'pdf'], true)) {
        $rows = gcv_finance_accounting_report($filters);
        if ($export === 'csv' || $export === 'xlsx') {
            // XLSX: CSV compatível (Excel abre diretamente)
            $csv = gcv_finance_export_csv($rows);
            $filename = 'gcv-financeiro-' . date('Ymd-His') . ($export === 'xlsx' ? '.csv' : '.csv');
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            echo $csv;
            exit;
        }
        if ($export === 'pdf') {
            // PDF textual simples (sem lib externa) — suficiente para contabilidade / impressão
            header('Content-Type: text/html; charset=utf-8');
            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Financeiro GCV</title>';
            echo '<style>body{font-family:Segoe UI,Arial,sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}@media print{button{display:none}}</style></head><body>';
            echo '<button onclick="window.print()">Imprimir / Salvar PDF</button>';
            echo '<h1>Relatório Contábil — Guia Chapada Veadeiros</h1>';
            echo '<table><thead><tr>';
            if ($rows) {
                foreach (array_keys($rows[0]) as $h) {
                    echo '<th>' . htmlspecialchars((string)$h) . '</th>';
                }
                echo '</tr></thead><tbody>';
                foreach ($rows as $r) {
                    echo '<tr>';
                    foreach ($r as $v) {
                        echo '<td>' . htmlspecialchars((string)($v ?? '')) . '</td>';
                    }
                    echo '</tr>';
                }
            } else {
                echo '<th>sem_dados</th></tr></thead><tbody><tr><td>Nenhum registro</td></tr>';
            }
            echo '</tbody></table></body></html>';
            exit;
        }
        json_response(true, ['rows' => $rows]);
    }

    $data = gcv_finance_dashboard($filters);
    json_response(true, $data);
} catch (Throwable $e) {
    json_response(false, null, $e->getMessage(), 500);
}
