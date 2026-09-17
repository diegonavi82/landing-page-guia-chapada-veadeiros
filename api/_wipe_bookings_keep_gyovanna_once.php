<?php
/**
 * ONE-SHOT: apaga todas as reservas e deixa só GCV-47MH8R (Gyovanna / Cataratas dos Couros).
 *
 * https://www.guiachapadaveadeiros.com/api/_wipe_bookings_keep_gyovanna_once.php?key=GCV-MKT-2026
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

const KEEP_CODE = 'GCV-47MH8R';

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

function run_sql(PDO $pdo, string $label, string $sql, array $params = []): int
{
    try {
        $st = $pdo->prepare($sql);
        $st->execute($params);
        $n = $st->rowCount();
        out('OK ' . $label . ' rows=' . $n);
        return $n;
    } catch (Throwable $e) {
        out('ERR ' . $label . ': ' . substr($e->getMessage(), 0, 240));
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

$keep = KEEP_CODE;
out('KEEP=' . $keep);

$keepSale = null;
if (table_exists($pdo, 'gcv_sales')) {
    $st = $pdo->prepare(
        'SELECT id, reservation_id, tourist_name, guide_name, excursion_title, sale_status, spots, sold_price_cents
         FROM gcv_sales WHERE UPPER(reservation_id) = ? LIMIT 1'
    );
    $st->execute([$keep]);
    $keepSale = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    out('sale_keep=' . ($keepSale ? json_encode($keepSale, JSON_UNESCAPED_UNICODE) : 'nao_encontrada_em_gcv_sales'));
}

$keepPix = gcv_pix_read_reservation($keep);
out('pix_json_keep=' . ($keepPix ? 'sim status=' . (string)($keepPix['status'] ?? '') : 'nao_encontrado'));

$saleIds = [];
if (table_exists($pdo, 'gcv_sales')) {
    $st = $pdo->prepare(
        'SELECT id FROM gcv_sales
         WHERE reservation_id IS NULL OR UPPER(reservation_id) <> ?'
    );
    $st->execute([$keep]);
    $saleIds = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
}
out('sales_para_apagar=' . count($saleIds));

$pdo->beginTransaction();
try {
    if ($saleIds) {
        $in = implode(',', array_fill(0, count($saleIds), '?'));
        if (table_exists($pdo, 'gcv_sale_payouts')) {
            run_sql($pdo, 'sale_payouts', "DELETE FROM gcv_sale_payouts WHERE sale_id IN ({$in})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_guide_reviews')) {
            run_sql($pdo, 'reviews by sale', "DELETE FROM gcv_guide_reviews WHERE sale_id IN ({$in})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_inbox')) {
            run_sql($pdo, 'inbox by sale', "DELETE FROM gcv_inbox WHERE sale_id IN ({$in})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_pix_payments')) {
            run_sql($pdo, 'pix_payments by sale', "DELETE FROM gcv_pix_payments WHERE sale_id IN ({$in})", $saleIds);
        }
        run_sql($pdo, 'sales', "DELETE FROM gcv_sales WHERE id IN ({$in})", $saleIds);
    }

    if (table_exists($pdo, 'gcv_pix_payments')) {
        run_sql(
            $pdo,
            'pix_payments by code',
            'DELETE FROM gcv_pix_payments WHERE reservation_id IS NULL OR UPPER(reservation_id) <> ?',
            [$keep]
        );
    }
    if (table_exists($pdo, 'gcv_guide_reviews')) {
        run_sql(
            $pdo,
            'reviews by code',
            'DELETE FROM gcv_guide_reviews WHERE reservation_id IS NULL OR UPPER(reservation_id) <> ?',
            [$keep]
        );
    }
    if (table_exists($pdo, 'gcv_pix_carousel_seat_applied')) {
        run_sql(
            $pdo,
            'seat_applied',
            'DELETE FROM gcv_pix_carousel_seat_applied WHERE UPPER(reservation_id) <> ?',
            [$keep]
        );
    }
    if (table_exists($pdo, 'gcv_bookings')) {
        run_sql($pdo, 'legacy bookings', 'DELETE FROM gcv_bookings');
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
$keptJson = 0;
foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
    $base = strtoupper(basename($path, '.json'));
    if ($base === $keep) {
        $keptJson++;
        continue;
    }
    if (@unlink($path)) {
        $deletedJson++;
    } else {
        out('ERR unlink ' . basename($path));
    }
}
out('pix_json_apagados=' . $deletedJson . ' pix_json_mantido=' . $keptJson);

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
        $pdo->exec('UPDATE gcv_excursions SET booked_people = 0');
        if ($keepSale && !empty($keepSale['id'])) {
            $pdo->prepare(
                'UPDATE gcv_excursions e
                 JOIN gcv_sales s ON s.excursion_id = e.id
                 SET e.booked_people = LEAST(255, GREATEST(0, CAST(s.spots AS SIGNED)))
                 WHERE s.id = ?'
            )->execute([(int)$keepSale['id']]);
        }
        out('OK booked_people recalculado');
    } catch (Throwable $e) {
        out('ERR booked_people: ' . $e->getMessage());
    }
}

$leftSales = 0;
if (table_exists($pdo, 'gcv_sales')) {
    $leftSales = (int)$pdo->query('SELECT COUNT(*) FROM gcv_sales')->fetchColumn();
}
$leftPix = count(glob($dir . '/GCV-*.json') ?: []);
out('restam_sales=' . $leftSales);
out('restam_pix_json=' . $leftPix);
out('FEITO: mantida apenas ' . $keep);
