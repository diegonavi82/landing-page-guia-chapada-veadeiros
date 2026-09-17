<?php
/**
 * ONE-SHOT: apaga de vez as reservas de teste listadas (JSON + vendas + PIX + assentos).
 *
 * https://www.guiachapadaveadeiros.com/api/_wipe_listed_test_bookings_once.php?key=GCV-MKT-2026
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/pix_reservation_store.php';
require_once __DIR__ . '/helpers/pix_seats_store.php';

const CODES = [
    'GCV-KCD8UY', 'GCV-9U4C4S', 'GCV-S53K4Z', 'GCV-3AKC72', 'GCV-F4XJJR',
    'GCV-UHU6US', 'GCV-GACV8H', 'GCV-EGD2UU', 'GCV-P32MZP', 'GCV-QN4ADR',
    'GCV-YEZWUA', 'GCV-X55PWA', 'GCV-SL4TEU', 'GCV-4DKFVS', 'GCV-JZA96K',
    'GCV-FT37W9', 'GCV-69JN7E', 'GCV-PWSBMR', 'GCV-82HXHR', 'GCV-8N5YAZ',
    'GCV-AX3NL7', 'GCV-7KWDQM', 'GCV-X92BVE', 'GCV-7N2MPR', 'GCV-ZUK9J5',
    'GCV-M74V6E', 'GCV-ADQYG7', 'GCV-2XUPRX', 'GCV-AVWERD', 'GCV-9LFHM6',
    'GCV-74TT4L', 'GCV-GLXALE', 'GCV-5UFNXY', 'GCV-RK6LEG',
];

function out(string $m): void
{
    echo $m . "\n";
}

function table_exists(PDO $pdo, string $table): bool
{
    $st = $pdo->prepare(
        'SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1'
    );
    $st->execute([$table]);
    return (bool)$st->fetchColumn();
}

function table_has_column(PDO $pdo, string $table, string $column): bool
{
    $st = $pdo->prepare(
        'SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1'
    );
    $st->execute([$table, $column]);
    return (bool)$st->fetchColumn();
}

function run_sql(PDO $pdo, string $label, string $sql, array $params = []): int
{
    try {
        $st = $pdo->prepare($sql);
        $st->execute($params);
        $n = $st->rowCount();
        out('OK ' . $label . ' rows=' . $n);
        return $n;
    } catch (Throwable $e) {
        out('ERR ' . $label . ': ' . substr($e->getMessage(), 0, 280));
        return 0;
    }
}

try {
    $pdo = db();
    out('OK: conectado');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

$codes = array_values(array_unique(array_map(static function ($c) {
    return strtoupper(trim((string)$c));
}, CODES)));
out('codes=' . count($codes));
$in = implode(',', array_fill(0, count($codes), '?'));

$saleIds = [];
$excIds = [];
if (table_exists($pdo, 'gcv_sales')) {
    $st = $pdo->prepare("SELECT id, reservation_id, excursion_id, sale_status, spots FROM gcv_sales WHERE UPPER(reservation_id) IN ({$in})");
    $st->execute($codes);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $saleIds[] = (int)$row['id'];
        if (!empty($row['excursion_id'])) {
            $excIds[(int)$row['excursion_id']] = true;
        }
        out('sale ' . $row['reservation_id'] . ' id=' . $row['id'] . ' status=' . ($row['sale_status'] ?? '') . ' spots=' . ($row['spots'] ?? ''));
    }
}
out('sales_encontradas=' . count($saleIds));

$pdo->beginTransaction();
try {
    if ($saleIds) {
        $saleIn = implode(',', array_fill(0, count($saleIds), '?'));
        if (table_exists($pdo, 'gcv_sale_payouts')) {
            run_sql($pdo, 'sale_payouts', "DELETE FROM gcv_sale_payouts WHERE sale_id IN ({$saleIn})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_guide_reviews')) {
            run_sql($pdo, 'reviews by sale', "DELETE FROM gcv_guide_reviews WHERE sale_id IN ({$saleIn})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_inbox')) {
            run_sql($pdo, 'inbox by sale', "DELETE FROM gcv_inbox WHERE sale_id IN ({$saleIn})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_pix_payments')) {
            run_sql($pdo, 'pix_payments by sale', "DELETE FROM gcv_pix_payments WHERE sale_id IN ({$saleIn})", $saleIds);
        }
        run_sql($pdo, 'sales', "DELETE FROM gcv_sales WHERE id IN ({$saleIn})", $saleIds);
    }

    if (table_exists($pdo, 'gcv_pix_payments')) {
        run_sql($pdo, 'pix_payments by code', "DELETE FROM gcv_pix_payments WHERE UPPER(reservation_id) IN ({$in})", $codes);
    }
    if (table_exists($pdo, 'gcv_guide_reviews')) {
        run_sql($pdo, 'reviews by code', "DELETE FROM gcv_guide_reviews WHERE UPPER(reservation_id) IN ({$in})", $codes);
    }
    if (table_exists($pdo, 'gcv_pix_carousel_seat_applied')) {
        run_sql($pdo, 'seat_applied', "DELETE FROM gcv_pix_carousel_seat_applied WHERE UPPER(reservation_id) IN ({$in})", $codes);
    }
    if (table_exists($pdo, 'gcv_audit_log')) {
        run_sql(
            $pdo,
            'audit_log',
            "DELETE FROM gcv_audit_log WHERE entity_type IN ('sale','sales','reservation','pix') AND UPPER(entity_id) IN ({$in})",
            $codes
        );
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    out('ERRO transacao: ' . $e->getMessage());
    exit;
}

$dir = gcv_pix_storage_dir();
$deletedJson = 0;
$missingJson = 0;
foreach ($codes as $code) {
    $path = $dir . '/' . $code . '.json';
    if (!is_file($path)) {
        $missingJson++;
        continue;
    }
    if (@unlink($path)) {
        $deletedJson++;
        out('json_apagado ' . $code);
    } else {
        out('ERR unlink ' . $code);
    }
}
out('pix_json_apagados=' . $deletedJson . ' pix_json_ausentes=' . $missingJson);

if (table_exists($pdo, 'gcv_pix_carousel_seats')) {
    run_sql($pdo, 'seats reset', 'DELETE FROM gcv_pix_carousel_seats');
}
if (table_exists($pdo, 'gcv_pix_carousel_seat_applied')) {
    run_sql($pdo, 'seat_applied reset', 'DELETE FROM gcv_pix_carousel_seat_applied');
}
$altSeats = __DIR__ . '/storage/pix_seats.json';
if (is_file($altSeats)) {
    @unlink($altSeats);
    out('OK pix_seats.json removido');
}
try {
    $store = gcv_pix_seats_sync_from_paid_reservations();
    out('seats_sync=' . json_encode($store['seats'] ?? [], JSON_UNESCAPED_UNICODE));
} catch (Throwable $e) {
    out('ERR seats_sync: ' . $e->getMessage());
}

if (table_exists($pdo, 'gcv_excursions')) {
    try {
        $hasTransport = table_has_column($pdo, 'gcv_excursions', 'booked_people_transport');
        $pdo->exec('UPDATE gcv_excursions SET booked_people = 0' . ($hasTransport ? ', booked_people_transport = 0' : ''));
        if (table_exists($pdo, 'gcv_sales')) {
            $pdo->exec(
                "UPDATE gcv_excursions e
                 JOIN (
                   SELECT excursion_id, SUM(spots) AS qty
                   FROM gcv_sales
                   WHERE deleted_at IS NULL
                     AND sale_status = 'PAID'
                     AND excursion_id IS NOT NULL
                   GROUP BY excursion_id
                 ) x ON x.excursion_id = e.id
                 SET e.booked_people = LEAST(255, GREATEST(0, CAST(x.qty AS SIGNED)))"
            );
        }
        out('OK booked_people recalculado');
    } catch (Throwable $e) {
        out('ERR booked_people: ' . $e->getMessage());
    }
}

$leftListed = 0;
if (table_exists($pdo, 'gcv_sales')) {
    $st = $pdo->prepare("SELECT COUNT(*) FROM gcv_sales WHERE UPPER(reservation_id) IN ({$in})");
    $st->execute($codes);
    $leftListed = (int)$st->fetchColumn();
}
$leftJson = 0;
foreach ($codes as $code) {
    if (is_file($dir . '/' . $code . '.json')) {
        $leftJson++;
    }
}
out('restam_sales_listadas=' . $leftListed);
out('restam_pix_json_listados=' . $leftJson);
out('FEITO: ' . count($codes) . ' reservas de teste eliminadas');
