<?php
/**
 * ONE-SHOT: apaga TODOS os passeios/pedidos do guia Diego Navi (testes).
 * Não mexe em Gyovanna/Flip nem na reserva GCV-47MH8R.
 *
 * https://www.guiachapadaveadeiros.com/api/_wipe_diego_test_tours_once.php?key=GCV-MKT-2026
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

const KEEP_CODE = 'GCV-47MH8R';
const GUIDE_EMAIL = 'diegonavi82@gmail.com';
const KEEP_ADMIN = 'diegocsp82@gmail.com';

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

function table_has(PDO $pdo, string $table, string $column): bool
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

$pdo = db();
out('OK: conectado');

$st = $pdo->prepare(
    "SELECT DISTINCT u.id
     FROM gcv_users u
     LEFT JOIN gcv_guides g ON g.user_id = u.id
     WHERE LOWER(u.email) = ?
        OR LOWER(TRIM(COALESCE(g.nickname,''))) IN ('diego navi', 'diego navi marques carvalho')
        OR LOWER(TRIM(COALESCE(g.full_name,''))) = 'diego navi marques carvalho'
        OR LOWER(TRIM(COALESCE(u.name,''))) LIKE 'diego navi%'"
);
$st->execute([GUIDE_EMAIL]);
$diegoIds = [];
foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
    $id = (int)($r['id'] ?? 0);
    if ($id > 0) {
        $diegoIds[] = $id;
    }
}
$diegoIds = array_values(array_unique($diegoIds));
out('diego_user_ids=' . implode(',', $diegoIds));
if (!$diegoIds) {
    out('Nenhum usuário Diego. FIM');
    exit;
}

$inU = implode(',', array_fill(0, count($diegoIds), '?'));
$list = $pdo->prepare(
    "SELECT e.id, e.status, e.date_iso, e.departure_time, e.deleted_at, e.price_cents,
            a.title_pt AS attraction
     FROM gcv_excursions e
     LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
     WHERE e.guide_user_id IN ({$inU}) OR e.created_by IN ({$inU})
     ORDER BY e.id"
);
$list->execute(array_merge($diegoIds, $diegoIds));
$rows = $list->fetchAll(PDO::FETCH_ASSOC) ?: [];
out('encontrados=' . count($rows));
$excIds = [];
foreach ($rows as $r) {
    out('EXC ' . json_encode($r, JSON_UNESCAPED_UNICODE));
    $excIds[] = (int)$r['id'];
}
$excIds = array_values(array_unique(array_filter($excIds)));
if (!$excIds) {
    out('Nada para apagar. FIM');
    exit;
}

$saleIds = [];
$codes = [];
if (table_exists($pdo, 'gcv_sales')) {
    $inE = implode(',', array_fill(0, count($excIds), '?'));
    $q = $pdo->prepare("SELECT id, reservation_id, excursion_id, tourist_name, sold_price_cents FROM gcv_sales WHERE excursion_id IN ({$inE})");
    $q->execute($excIds);
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) ?: [] as $s) {
        $code = strtoupper(trim((string)($s['reservation_id'] ?? '')));
        out('SALE ' . json_encode($s, JSON_UNESCAPED_UNICODE));
        if ($code === KEEP_CODE) {
            out('  (mantida GCV-47MH8R)');
            continue;
        }
        $saleIds[] = (int)$s['id'];
        if ($code !== '') {
            $codes[] = $code;
        }
    }
}

$pdo->beginTransaction();
try {
    if ($saleIds) {
        $inS = implode(',', array_fill(0, count($saleIds), '?'));
        if (table_exists($pdo, 'gcv_sale_payouts')) {
            run_sql($pdo, 'sale_payouts', "DELETE FROM gcv_sale_payouts WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_guide_reviews') && table_has($pdo, 'gcv_guide_reviews', 'sale_id')) {
            run_sql($pdo, 'reviews', "DELETE FROM gcv_guide_reviews WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_inbox') && table_has($pdo, 'gcv_inbox', 'sale_id')) {
            run_sql($pdo, 'inbox sale', "DELETE FROM gcv_inbox WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_pix_payments') && table_has($pdo, 'gcv_pix_payments', 'sale_id')) {
            run_sql($pdo, 'pix_payments', "DELETE FROM gcv_pix_payments WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_transfer_offers')) {
            run_sql($pdo, 'transfer_offers', "DELETE FROM gcv_transfer_offers WHERE sale_id IN ({$inS})", $saleIds);
        }
        run_sql($pdo, 'sales', "DELETE FROM gcv_sales WHERE id IN ({$inS})", $saleIds);
    }

    $inE = implode(',', array_fill(0, count($excIds), '?'));
    if (table_exists($pdo, 'gcv_excursion_attractions')) {
        run_sql($pdo, 'attractions', "DELETE FROM gcv_excursion_attractions WHERE excursion_id IN ({$inE})", $excIds);
    }
    if (table_exists($pdo, 'gcv_inbox') && table_has($pdo, 'gcv_inbox', 'excursion_id')) {
        run_sql($pdo, 'inbox exc', "DELETE FROM gcv_inbox WHERE excursion_id IN ({$inE})", $excIds);
    }
    if (table_exists($pdo, 'gcv_guide_reviews') && table_has($pdo, 'gcv_guide_reviews', 'excursion_id')) {
        run_sql($pdo, 'reviews exc', "DELETE FROM gcv_guide_reviews WHERE excursion_id IN ({$inE})", $excIds);
    }
    if (table_exists($pdo, 'gcv_transfer_offers')) {
        if (table_has($pdo, 'gcv_transfer_offers', 'from_excursion_id')) {
            run_sql($pdo, 'transfer from', "DELETE FROM gcv_transfer_offers WHERE from_excursion_id IN ({$inE})", $excIds);
        }
        if (table_has($pdo, 'gcv_transfer_offers', 'to_excursion_id')) {
            run_sql($pdo, 'transfer to', "DELETE FROM gcv_transfer_offers WHERE to_excursion_id IN ({$inE})", $excIds);
        }
    }
    if (table_exists($pdo, 'gcv_audit_log') && table_has($pdo, 'gcv_audit_log', 'entity_id')) {
        run_sql(
            $pdo,
            'audit',
            "DELETE FROM gcv_audit_log WHERE entity_type IN ('excursion','excursions') AND entity_id IN ({$inE})",
            $excIds
        );
    }
    run_sql($pdo, 'HARD DELETE excursions', "DELETE FROM gcv_excursions WHERE id IN ({$inE})", $excIds);

    $pdo->commit();
    out('COMMIT');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    out('ROLLBACK: ' . $e->getMessage());
    exit;
}

foreach (array_unique($codes) as $code) {
    try {
        $path = gcv_pix_reservation_path($code);
        if (is_file($path)) {
            @unlink($path);
            out('OK pix json ' . $code);
        }
    } catch (Throwable $e) {
        out('ERR pix ' . $code . ': ' . $e->getMessage());
    }
}

$left = $pdo->prepare("SELECT COUNT(*) FROM gcv_excursions WHERE guide_user_id IN ({$inU}) OR created_by IN ({$inU})");
$left->execute(array_merge($diegoIds, $diegoIds));
out('diego_restantes=' . (int)$left->fetchColumn());
out('FEITO');
