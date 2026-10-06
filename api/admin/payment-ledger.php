<?php

declare(strict_types=1);

/**
 * Admin — Transações de pagamento (Pix Sicoob, Mercado Pago, Stripe).
 *
 * GET  ?from=&to=&gateway=&method=&status=&settlement_status=&q=&limit=&offset=
 *      → { summary, rows, mp_available, settlements }
 * GET  ?export=csv (mesmos filtros) → CSV para contabilidade
 * POST action=register_mp_transfer { amount, arrived_at?, ref?, notes? }
 *      → registra transferência Mercado Pago → Sicoob (quando não foi detectada sozinha)
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/payments/ledger.php';

$admin = require_admin();
gcv_ledger_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$filters = [
    'from' => (string) ($_GET['from'] ?? ''),
    'to' => (string) ($_GET['to'] ?? ''),
    'gateway' => (string) ($_GET['gateway'] ?? ''),
    'method' => (string) ($_GET['method'] ?? ''),
    'status' => (string) ($_GET['status'] ?? ''),
    'settlement_status' => (string) ($_GET['settlement_status'] ?? ''),
    'q' => (string) ($_GET['q'] ?? ''),
];

if ($method === 'GET' && ($_GET['export'] ?? '') === 'csv') {
    $rows = gcv_ledger_list($filters, 2000, 0);
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="transacoes-' . date('Y-m-d') . '.csv"');
    $fh = fopen('php://output', 'w');
    fwrite($fh, "\xEF\xBB\xBF"); // BOM para o Excel abrir com acento
    $cols = [
        'reservation_id' => 'Reserva', 'paid_at' => 'Pago em', 'gateway' => 'Plataforma', 'method' => 'Forma',
        'installments' => 'Parcelas', 'status' => 'Status', 'currency' => 'Moeda cobrada', 'charge_minor' => 'Valor cobrado (moeda)',
        'fx_rate' => 'Câmbio', 'base_cents' => 'Valor Pix/tarifário', 'surcharge_cents' => 'Acréscimo',
        'gross_cents' => 'Bruto (R$)', 'fee_cents' => 'Taxa (R$)', 'net_cents' => 'Líquido (R$)', 'fee_source' => 'Origem da taxa',
        'refunded_cents' => 'Estornado (R$)', 'available_at' => 'Disponível em', 'settlement_status' => 'Situação do dinheiro',
        'settlement_ref' => 'Repasse', 'settled_at' => 'Chegou no Sicoob', 'tourist_name' => 'Cliente', 'tourist_email' => 'E-mail',
        'excursion_title' => 'Passeio', 'guide_name' => 'Guia', 'guide_amount_cents' => 'Repasse guia (R$)',
        'payout_status' => 'Status repasse guia', 'guide_paid_at' => 'Guia pago em', 'external_id' => 'ID na plataforma',
        'price_review' => 'Preço a revisar',
    ];
    fputcsv($fh, array_values($cols), ';');
    foreach ($rows as $r) {
        $line = [];
        foreach (array_keys($cols) as $k) {
            $v = $r[$k] ?? '';
            if (str_ends_with($k, '_cents') && $v !== '' && $v !== null) {
                $v = number_format(((int) $v) / 100, 2, ',', '');
            } elseif ($k === 'charge_minor' && $v !== '') {
                $v = number_format(((int) $v) / 100, 2, ',', '');
            }
            $line[] = $v;
        }
        fputcsv($fh, $line, ';');
    }
    fclose($fh);
    exit;
}

if ($method === 'GET') {
    $limit = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));
    $settlements = db()->query(
        'SELECT id, gateway, external_id, amount_cents, status, expected_at, arrived_at, sicoob_confirmed, notes, created_at
         FROM gcv_gateway_settlements ORDER BY COALESCE(arrived_at, expected_at, created_at) DESC LIMIT 30'
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    json_response(true, [
        'summary' => gcv_ledger_summary($filters),
        'mp_available' => gcv_ledger_mp_available(),
        'rows' => gcv_ledger_list($filters, $limit, $offset),
        'settlements' => $settlements,
    ]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $body = is_array($body) ? $body : [];
    if (($body['action'] ?? '') === 'register_mp_transfer') {
        $cents = (int) round(((float) str_replace(',', '.', (string) ($body['amount'] ?? '0'))) * 100);
        if ($cents <= 0) {
            json_response(false, null, 'Informe o valor transferido', 422);
        }
        $at = gcv_ledger_dt((string) ($body['arrived_at'] ?? '')) ?: null;
        $out = gcv_ledger_register_mp_transfer(
            $cents,
            $at,
            trim((string) ($body['ref'] ?? '')),
            trim((string) ($body['notes'] ?? '')) ?: ('Registrado por ' . (string) ($admin['email'] ?? 'admin'))
        );
        if (empty($out['ok'])) {
            json_response(false, null, 'Não foi possível registrar a transferência', 500);
        }
        json_response(true, $out);
    }
    json_response(false, null, 'Ação inválida', 400);
}

json_response(false, null, 'Method not allowed', 405);
