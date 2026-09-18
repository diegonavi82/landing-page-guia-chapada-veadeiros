<?php
/**
 * ONE-SHOT: apaga as excursões 10, 11 e 12 e TODO o histórico de publicação
 * do guia Diego Navi (diegonavi82). Hard delete (some do site e do admin).
 *
 * Preserva a reserva GCV-47MH8R (Gyovanna) se não estiver nesses passeios.
 * Não mexe no admin diegocsp82.
 *
 * https://www.guiachapadaveadeiros.com/api/_wipe_diego_tours_10_12_once.php?key=GCV-MKT-2026
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
const TARGET_IDS = [10, 11, 12];
const GUIDE_EMAIL = 'diegonavi82@gmail.com';
const KEEP_ADMIN = 'diegocsp82@gmail.com';

function out(string $m): void
{
    echo $m . "\n";
    @ob_flush();
    @flush();
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

try {
    $pdo = db();
    out('OK: conectado');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

$diegoIds = [];
$st = $pdo->prepare(
    "SELECT DISTINCT u.id, u.email, u.name, u.status, g.nickname, g.full_name
     FROM gcv_users u
     LEFT JOIN gcv_guides g ON g.user_id = u.id
     WHERE LOWER(u.email) = ?
        OR LOWER(TRIM(COALESCE(g.nickname,''))) IN ('diego navi', 'diego navi marques carvalho')
        OR LOWER(TRIM(COALESCE(g.full_name,''))) = 'diego navi marques carvalho'
        OR LOWER(TRIM(COALESCE(u.name,''))) LIKE 'diego navi%'"
);
$st->execute([GUIDE_EMAIL]);
$diegoRows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
foreach ($diegoRows as $r) {
    $id = (int)($r['id'] ?? 0);
    if ($id > 0 && strtolower((string)($r['email'] ?? '')) !== KEEP_ADMIN) {
        $diegoIds[$id] = $id;
        out('guia ' . json_encode($r, JSON_UNESCAPED_UNICODE));
    }
}
$diegoIds = array_values($diegoIds);
out('diego_user_ids=' . implode(',', $diegoIds) ?: '(nenhum)');

out('');
out('--- alvo 10/11/12 ---');
if (table_exists($pdo, 'gcv_excursions')) {
    $rows = $pdo->query(
        'SELECT e.id, e.status, e.date_iso, e.departure_time, e.deleted_at, e.guide_user_id,
                e.created_by, e.approved_at, e.cart_slug, e.price_cents,
                u.email AS guide_email, u.name AS guide_user_name,
                g.nickname
         FROM gcv_excursions e
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         WHERE e.id IN (10,11,12)
         ORDER BY e.id'
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    if (!$rows) {
        out('gcv_excursions 10/11/12: nenhum registro');
    }
    foreach ($rows as $r) {
        out('EXC ' . json_encode($r, JSON_UNESCAPED_UNICODE));
    }
}

if (table_exists($pdo, 'gcv_tours')) {
    $rows = $pdo->query(
        'SELECT id, title_pt, status, departure_date, guide_id FROM gcv_tours WHERE id IN (10,11,12) ORDER BY id'
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    if (!$rows) {
        out('gcv_tours 10/11/12: nenhum registro');
    }
    foreach ($rows as $r) {
        out('TOUR ' . json_encode($r, JSON_UNESCAPED_UNICODE));
    }
}

$excIds = TARGET_IDS;
if ($diegoIds && table_exists($pdo, 'gcv_excursions')) {
    $inU = implode(',', array_fill(0, count($diegoIds), '?'));
    $q = $pdo->prepare(
        "SELECT id FROM gcv_excursions
         WHERE id IN (10,11,12)
            OR guide_user_id IN ({$inU})
            OR created_by IN ({$inU})
            OR approved_by IN ({$inU})"
    );
    $q->execute(array_merge($diegoIds, $diegoIds, $diegoIds));
    foreach ($q->fetchAll(PDO::FETCH_COLUMN) ?: [] as $id) {
        $excIds[] = (int)$id;
    }
}
$excIds = array_values(array_unique(array_filter(array_map('intval', $excIds))));
sort($excIds);
out('excursões a apagar: ' . implode(',', $excIds));

$keepSale = null;
if (table_exists($pdo, 'gcv_sales')) {
    $ks = $pdo->prepare('SELECT id, reservation_id, excursion_id, tourist_name, sale_status FROM gcv_sales WHERE UPPER(reservation_id) = ? LIMIT 1');
    $ks->execute([KEEP_CODE]);
    $keepSale = $ks->fetch(PDO::FETCH_ASSOC) ?: null;
    out('keep_sale=' . ($keepSale ? json_encode($keepSale, JSON_UNESCAPED_UNICODE) : 'nao'));
}

$saleIds = [];
$codes = [];
if ($excIds && table_exists($pdo, 'gcv_sales')) {
    $inE = implode(',', array_fill(0, count($excIds), '?'));
    $q = $pdo->prepare("SELECT id, reservation_id, excursion_id, tourist_name, sold_price_cents FROM gcv_sales WHERE excursion_id IN ({$inE})");
    $q->execute($excIds);
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) ?: [] as $s) {
        $code = strtoupper(trim((string)($s['reservation_id'] ?? '')));
        out('SALE ' . json_encode($s, JSON_UNESCAPED_UNICODE));
        if ($code === KEEP_CODE) {
            out('  (mantida GCV-47MH8R — só desvincula do passeio)');
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
            run_sql($pdo, 'reviews by sale', "DELETE FROM gcv_guide_reviews WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_inbox') && table_has($pdo, 'gcv_inbox', 'sale_id')) {
            run_sql($pdo, 'inbox by sale', "DELETE FROM gcv_inbox WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_pix_payments') && table_has($pdo, 'gcv_pix_payments', 'sale_id')) {
            run_sql($pdo, 'pix_payments by sale', "DELETE FROM gcv_pix_payments WHERE sale_id IN ({$inS})", $saleIds);
        }
        if (table_exists($pdo, 'gcv_transfer_offers')) {
            run_sql($pdo, 'transfer_offers by sale', "DELETE FROM gcv_transfer_offers WHERE sale_id IN ({$inS})", $saleIds);
        }
        run_sql($pdo, 'sales', "DELETE FROM gcv_sales WHERE id IN ({$inS})", $saleIds);
    }

    if ($keepSale && in_array((int)$keepSale['excursion_id'], $excIds, true)) {
        run_sql($pdo, 'detach Gyovanna sale', 'UPDATE gcv_sales SET excursion_id = NULL WHERE UPPER(reservation_id) = ?', [KEEP_CODE]);
    }

    if ($excIds) {
        $inE = implode(',', array_fill(0, count($excIds), '?'));
        if (table_exists($pdo, 'gcv_excursion_attractions')) {
            run_sql($pdo, 'excursion_attractions', "DELETE FROM gcv_excursion_attractions WHERE excursion_id IN ({$inE})", $excIds);
        }
        if (table_exists($pdo, 'gcv_inbox') && table_has($pdo, 'gcv_inbox', 'excursion_id')) {
            run_sql($pdo, 'inbox by excursion', "DELETE FROM gcv_inbox WHERE excursion_id IN ({$inE})", $excIds);
        }
        if (table_exists($pdo, 'gcv_guide_reviews') && table_has($pdo, 'gcv_guide_reviews', 'excursion_id')) {
            run_sql($pdo, 'reviews by excursion', "DELETE FROM gcv_guide_reviews WHERE excursion_id IN ({$inE})", $excIds);
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
                'audit excursion',
                "DELETE FROM gcv_audit_log WHERE entity_type IN ('excursion','excursions') AND entity_id IN ({$inE})",
                $excIds
            );
        }
        run_sql($pdo, 'HARD DELETE gcv_excursions', "DELETE FROM gcv_excursions WHERE id IN ({$inE})", $excIds);
    }

    $tourIds = TARGET_IDS;
    if ($diegoIds && table_exists($pdo, 'gcv_tours') && table_has($pdo, 'gcv_tours', 'guide_id')) {
        $inU = implode(',', array_fill(0, count($diegoIds), '?'));
        $q = $pdo->prepare("SELECT id FROM gcv_tours WHERE id IN (10,11,12) OR guide_id IN ({$inU})");
        $q->execute($diegoIds);
        foreach ($q->fetchAll(PDO::FETCH_COLUMN) ?: [] as $id) {
            $tourIds[] = (int)$id;
        }
    }
    $tourIds = array_values(array_unique(array_filter(array_map('intval', $tourIds))));
    if ($tourIds && table_exists($pdo, 'gcv_tours')) {
        $inT = implode(',', array_fill(0, count($tourIds), '?'));
        if (table_exists($pdo, 'gcv_bookings') && table_has($pdo, 'gcv_bookings', 'tour_id')) {
            run_sql($pdo, 'bookings of gcv_tours', "DELETE FROM gcv_bookings WHERE tour_id IN ({$inT})", $tourIds);
        }
        run_sql($pdo, 'HARD DELETE gcv_tours', "DELETE FROM gcv_tours WHERE id IN ({$inT})", $tourIds);
    }

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
            out('OK pix json removed ' . $code);
        }
    } catch (Throwable $e) {
        out('ERR pix json ' . $code . ': ' . $e->getMessage());
    }
}

out('');
out('--- restante público ---');
if (table_exists($pdo, 'gcv_excursions')) {
    $live = $pdo->query(
        "SELECT e.id, e.status, e.date_iso, e.deleted_at, e.guide_user_id, u.email, g.nickname
         FROM gcv_excursions e
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         WHERE e.deleted_at IS NULL AND e.status IN ('published','soldout')
         ORDER BY e.id"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    out('publicadas=' . count($live));
    foreach ($live as $r) {
        out('LIVE ' . json_encode($r, JSON_UNESCAPED_UNICODE));
    }

    $leftDiego = 0;
    if ($diegoIds) {
        $inU = implode(',', array_fill(0, count($diegoIds), '?'));
        $q = $pdo->prepare("SELECT COUNT(*) FROM gcv_excursions WHERE guide_user_id IN ({$inU}) OR created_by IN ({$inU})");
        $q->execute(array_merge($diegoIds, $diegoIds));
        $leftDiego = (int)$q->fetchColumn();
    }
    out('diego_excursions_restantes=' . $leftDiego);

    foreach (TARGET_IDS as $id) {
        $q = $pdo->prepare('SELECT COUNT(*) FROM gcv_excursions WHERE id = ?');
        $q->execute([$id]);
        out('ainda_existe_excursao_' . $id . '=' . (int)$q->fetchColumn());
    }
}

out('FEITO');
