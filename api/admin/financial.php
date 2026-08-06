<?php
declare(strict_types=1);

/**
 * Compat: /api/admin/financial.php
 * Agora delega ao dashboard de snapshots (gcv_sales). Mantém shape legado + dados novos.
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/marketplace/finance_dashboard_service.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

$month = $_GET['month'] ?? date('Y-m');
$from = $_GET['from'] ?? ($month . '-01');
$to = $_GET['to'] ?? null;
if ($to === null && preg_match('/^\d{4}-\d{2}$/', (string)$month)) {
    try {
        $to = (new DateTimeImmutable($month . '-01'))->modify('last day of this month')->format('Y-m-d');
    } catch (Throwable $e) {
        $to = date('Y-m-d');
    }
}

$filters = array_merge($_GET, [
    'from' => $from,
    'to' => $to,
    'month' => $month,
]);

try {
    $data = gcv_finance_dashboard($filters);
    $s = $data['summary'] ?? [];

    // Shape legado (dashboard antigo)
    $legacySummary = [
        'total_bookings' => (int)($s['sales_count'] ?? 0),
        'paid_bookings' => (int)($s['sales_count'] ?? 0),
        'gross_cents' => (int)($s['gross_revenue_cents'] ?? 0),
        'commission_cents' => (int)($s['platform_commission_cents'] ?? 0),
        'guide_cents' => (int)($s['guides_amount_cents'] ?? 0),
        'net_revenue_cents' => (int)($s['net_revenue_cents'] ?? 0),
        'paid_out_cents' => (int)($s['paid_out_cents'] ?? 0),
        'pending_payout_cents' => (int)($s['pending_payout_cents'] ?? 0),
        'avg_ticket_cents' => (int)round((float)($s['avg_ticket_cents'] ?? 0)),
    ];

    json_response(true, [
        'summary' => $legacySummary,
        'dashboard' => $data,
        'transactions' => $data['sales'] ?? [],
    ]);
} catch (Throwable $e) {
    // Fallback legado gcv_bookings se schema novo ainda não disponível
    $stmt = db()->prepare(
        'SELECT
           COUNT(*) AS total_bookings,
           SUM(CASE WHEN b.status = \'paid\' THEN 1 ELSE 0 END) AS paid_bookings,
           SUM(CASE WHEN b.status = \'paid\' THEN b.total_cents ELSE 0 END) AS gross_cents,
           SUM(CASE WHEN b.status = \'paid\' THEN b.mp_marketplace_fee_cents ELSE 0 END) AS commission_cents,
           SUM(CASE WHEN b.status = \'paid\' THEN b.mp_guide_amount_cents ELSE 0 END) AS guide_cents
         FROM gcv_bookings b
         WHERE DATE_FORMAT(b.created_at, \'%Y-%m\') = ?'
    );
    $stmt->execute([$month]);
    $summary = $stmt->fetch() ?: [];
    json_response(true, [
        'summary' => $summary,
        'transactions' => [],
        'warning' => 'marketplace_fallback: ' . $e->getMessage(),
    ]);
}
