<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/constants.php';

/**
 * Dashboard financeiro admin — agregações somente a partir de snapshots (gcv_sales).
 *
 * @param array<string,mixed> $filters
 * @return array<string,mixed>
 */
function gcv_finance_dashboard(array $filters = []): array
{
    gcv_marketplace_ensure_schema();
    [$where, $params] = gcv_finance_build_where($filters);

    $pdo = db();
    $summarySql = "SELECT
        COUNT(*) AS sales_count,
        COALESCE(SUM(sold_price_cents),0) AS total_sold_cents,
        COALESCE(SUM(sold_price_cents),0) AS gross_revenue_cents,
        COALESCE(SUM(platform_revenue_cents),0) AS platform_commission_cents,
        COALESCE(SUM(guide_amount_cents),0) AS guides_amount_cents,
        COALESCE(SUM(CASE WHEN payout_status = 'PAYOUT_PAID' THEN guide_amount_cents ELSE 0 END),0) AS paid_out_cents,
        COALESCE(SUM(CASE WHEN payout_status = 'PAYOUT_PENDING' THEN guide_amount_cents ELSE 0 END),0) AS pending_payout_cents,
        COALESCE(AVG(sold_price_cents),0) AS avg_ticket_cents
      FROM gcv_sales
      WHERE deleted_at IS NULL AND sale_status = 'PAID' {$where}";
    $stmt = $pdo->prepare($summarySql);
    $stmt->execute($params);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $net = (int)($summary['platform_commission_cents'] ?? 0); // receita líquida plataforma = comissão snapshot
    $summary['net_revenue_cents'] = $net;
    $summary['gross_revenue_cents'] = (int)($summary['gross_revenue_cents'] ?? 0);
    $summary['total_sold_cents'] = (int)($summary['total_sold_cents'] ?? 0);

    return [
        'summary' => $summary,
        'by_guide' => gcv_finance_group_by('guide_user_id', 'guide_name', $where, $params),
        'by_city' => gcv_finance_group_by('city_id', 'city_name', $where, $params),
        'by_excursion' => gcv_finance_group_by('excursion_id', 'excursion_title', $where, $params),
        'by_category' => gcv_finance_group_by('category_key', 'category_key', $where, $params),
        'sales' => gcv_finance_list_sales($where, $params, (int)($filters['limit'] ?? 200)),
        'filters' => $filters,
    ];
}

/**
 * @return array{0:string,1:list<mixed>}
 */
function gcv_finance_build_where(array $filters): array
{
    $where = '';
    $params = [];

    $from = trim((string)($filters['from'] ?? $filters['date_from'] ?? ''));
    $to = trim((string)($filters['to'] ?? $filters['date_to'] ?? ''));
    if ($from !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
        $where .= ' AND DATE(sold_at) >= ?';
        $params[] = $from;
    }
    if ($to !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
        $where .= ' AND DATE(sold_at) <= ?';
        $params[] = $to;
    }
    if (!empty($filters['guide_user_id'])) {
        $where .= ' AND guide_user_id = ?';
        $params[] = (int)$filters['guide_user_id'];
    }
    if (!empty($filters['cpf'])) {
        $where .= ' AND guide_cpf = ?';
        $params[] = preg_replace('/\D+/', '', (string)$filters['cpf']);
    }
    if (!empty($filters['cnpj'])) {
        $where .= ' AND guide_cnpj = ?';
        $params[] = preg_replace('/\D+/', '', (string)$filters['cnpj']);
    }
    if (!empty($filters['excursion_id'])) {
        $where .= ' AND excursion_id = ?';
        $params[] = (int)$filters['excursion_id'];
    }
    if (!empty($filters['city_id'])) {
        $where .= ' AND city_id = ?';
        $params[] = (int)$filters['city_id'];
    }
    if (!empty($filters['status'])) {
        $where .= ' AND sale_status = ?';
        $params[] = strtoupper((string)$filters['status']);
    }
    if (!empty($filters['payout_status'])) {
        $where .= ' AND payout_status = ?';
        $params[] = strtoupper((string)$filters['payout_status']);
    }
    if (!empty($filters['origin']) || !empty($filters['created_by_origin'])) {
        $where .= ' AND created_by_origin = ?';
        $params[] = strtoupper((string)($filters['origin'] ?? $filters['created_by_origin']));
    }
    if (!empty($filters['business_mode'])) {
        $where .= ' AND business_mode = ?';
        $params[] = strtoupper((string)$filters['business_mode']);
    }

    return [$where, $params];
}

/**
 * @param list<mixed> $params
 * @return list<array<string,mixed>>
 */
function gcv_finance_group_by(string $idCol, string $labelCol, string $where, array $params): array
{
    $pdo = db();
    $sql = "SELECT
        {$idCol} AS group_id,
        {$labelCol} AS group_label,
        COUNT(*) AS sales_count,
        COALESCE(SUM(sold_price_cents),0) AS total_sold_cents,
        COALESCE(SUM(platform_revenue_cents),0) AS platform_revenue_cents,
        COALESCE(SUM(guide_amount_cents),0) AS guide_amount_cents
      FROM gcv_sales
      WHERE deleted_at IS NULL AND sale_status = 'PAID' {$where}
      GROUP BY {$idCol}, {$labelCol}
      ORDER BY total_sold_cents DESC
      LIMIT 100";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/**
 * @param list<mixed> $params
 * @return list<array<string,mixed>>
 */
function gcv_finance_list_sales(string $where, array $params, int $limit = 200): array
{
    $limit = max(1, min(2000, $limit));
    $sql = "SELECT s.*,
        (SELECT p.txid FROM gcv_pix_payments p WHERE p.sale_id = s.id AND p.deleted_at IS NULL LIMIT 1) AS pix_txid,
        (SELECT p.end_to_end_id FROM gcv_pix_payments p WHERE p.sale_id = s.id AND p.deleted_at IS NULL LIMIT 1) AS pix_end_to_end_id,
        (SELECT sp.paid_at FROM gcv_sale_payouts sp WHERE sp.sale_id = s.id AND sp.deleted_at IS NULL AND sp.status='PAYOUT_PAID' ORDER BY sp.id DESC LIMIT 1) AS payout_paid_at,
        (SELECT sp.txid FROM gcv_sale_payouts sp WHERE sp.sale_id = s.id AND sp.deleted_at IS NULL ORDER BY sp.id DESC LIMIT 1) AS payout_txid,
        (SELECT sp.end_to_end_id FROM gcv_sale_payouts sp WHERE sp.sale_id = s.id AND sp.deleted_at IS NULL ORDER BY sp.id DESC LIMIT 1) AS payout_end_to_end_id
      FROM gcv_sales s
      WHERE s.deleted_at IS NULL AND s.sale_status = 'PAID' {$where}
      ORDER BY s.sold_at DESC
      LIMIT {$limit}";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/**
 * Relatório contábil / fiscal futuro.
 *
 * @param array<string,mixed> $filters
 * @return list<array<string,mixed>>
 */
function gcv_finance_accounting_report(array $filters = []): array
{
    $data = gcv_finance_dashboard($filters);
    $rows = [];
    foreach ($data['sales'] as $s) {
        $rows[] = [
            'guide_cpf' => $s['guide_cpf'] ?? null,
            'guide_cnpj' => $s['guide_cnpj'] ?? null,
            'guide_name' => $s['guide_name'] ?? null,
            'gross_received_cents' => (int)($s['sold_price_cents'] ?? 0),
            'guide_amount_cents' => (int)($s['guide_amount_cents'] ?? 0),
            'platform_revenue_cents' => (int)($s['platform_revenue_cents'] ?? 0),
            'commission_pct_applied' => $s['commission_pct_applied'] ?? null,
            'sale_date' => $s['sold_at'] ?? null,
            'payout_date' => $s['payout_paid_at'] ?? null,
            'txid' => $s['pix_txid'] ?? $s['payout_txid'] ?? null,
            'end_to_end_id' => $s['pix_end_to_end_id'] ?? $s['payout_end_to_end_id'] ?? null,
            'status' => $s['sale_status'] ?? null,
            'payout_status' => $s['payout_status'] ?? null,
            'business_mode' => $s['business_mode'] ?? null,
            'created_by_origin' => $s['created_by_origin'] ?? null,
            'reservation_id' => $s['reservation_id'] ?? null,
            'excursion_title' => $s['excursion_title'] ?? null,
            'city_name' => $s['city_name'] ?? null,
        ];
    }
    return $rows;
}

/**
 * Exporta CSV (UTF-8 BOM) — XLSX/PDF podem consumir o mesmo dataset no client.
 *
 * @param list<array<string,mixed>> $rows
 */
function gcv_finance_export_csv(array $rows): string
{
    $out = fopen('php://temp', 'r+');
    if ($out === false) {
        return '';
    }
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
    if ($rows === []) {
        fputcsv($out, ['sem_dados'], ';');
        rewind($out);
        $csv = stream_get_contents($out) ?: '';
        fclose($out);
        return $csv;
    }
    fputcsv($out, array_keys($rows[0]), ';');
    foreach ($rows as $row) {
        fputcsv($out, array_values($row), ';');
    }
    rewind($out);
    $csv = stream_get_contents($out) ?: '';
    fclose($out);
    return $csv;
}
