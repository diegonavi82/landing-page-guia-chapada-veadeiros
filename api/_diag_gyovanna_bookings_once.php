<?php
/**
 * ONE-SHOT: diagnostica a reserva da Gyovanna e recaptura a venda se o PIX estiver pago.
 *
 * https://www.guiachapadaveadeiros.com/api/_diag_gyovanna_bookings_once.php?key=GCV-MKT-2026
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
require_once __DIR__ . '/helpers/marketplace/sale_service.php';

function out(string $m): void
{
    echo $m . "\n";
}

$keep = 'GCV-47MH8R';
out('KEEP=' . $keep);

try {
    $pdo = db();
    out('OK db');
} catch (Throwable $e) {
    out('ERRO db: ' . $e->getMessage());
    exit;
}

try {
    gcv_marketplace_ensure_schema();
    out('OK marketplace_schema');
} catch (Throwable $e) {
    out('ERRO marketplace_schema: ' . $e->getMessage());
}

out('');
out('--- gcv_sales ---');
try {
    $rows = $pdo->query(
        "SELECT id, reservation_id, tourist_name, tourist_email, guide_name, excursion_title,
                sale_status, spots, sold_price_cents, deleted_at, paid_at, sold_at
         FROM gcv_sales
         ORDER BY id DESC
         LIMIT 30"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    out('count=' . count($rows));
    foreach ($rows as $r) {
        out(json_encode($r, JSON_UNESCAPED_UNICODE));
    }
} catch (Throwable $e) {
    out('ERRO sales: ' . $e->getMessage());
}

out('');
out('--- sales Gyovanna ---');
try {
    $st = $pdo->prepare(
        "SELECT id, reservation_id, tourist_name, guide_name, excursion_title, sale_status, deleted_at
         FROM gcv_sales
         WHERE tourist_name LIKE ? OR guide_name LIKE ? OR reservation_id = ?
         ORDER BY id DESC"
    );
    $st->execute(['%Gyovanna%', '%Gyovanna%', $keep]);
    $g = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    out('count=' . count($g));
    foreach ($g as $r) {
        out(json_encode($r, JSON_UNESCAPED_UNICODE));
    }
} catch (Throwable $e) {
    out('ERRO sales gyovanna: ' . $e->getMessage());
}

out('');
out('--- pix files ---');
$dir = gcv_pix_storage_dir();
out('dir=' . $dir);
$pixHits = [];
foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
    $raw = (string)file_get_contents($path);
    $res = json_decode($raw, true);
    if (!is_array($res)) {
        continue;
    }
    $blob = strtolower($raw);
    $rid = strtoupper((string)($res['reservation_id'] ?? basename($path, '.json')));
    if ($rid === $keep || str_contains($blob, 'gyovanna')) {
        $pixHits[] = $res;
        out('HIT ' . $rid . ' status=' . (string)($res['status'] ?? '') . ' email=' . (string)($res['email'] ?? '') . ' name=' . (string)($res['name'] ?? $res['nome'] ?? ''));
        out('  guide=' . (string)($res['guide_name'] ?? ($res['trips'][0]['guiaNome'] ?? '')));
        out('  amount=' . (string)($res['amount'] ?? ''));
    }
}
out('pix_hits=' . count($pixHits));

$keepPix = gcv_pix_read_reservation($keep);
out('pix_keep=' . ($keepPix ? ('sim status=' . ($keepPix['status'] ?? '') . ' effective=' . gcv_pix_effective_status($keepPix)) : 'nao'));

$toCapture = [];
if ($keepPix && gcv_pix_effective_status($keepPix) === 'PAID') {
    $toCapture[] = $keepPix;
}
foreach ($pixHits as $res) {
    $rid = strtoupper((string)($res['reservation_id'] ?? ''));
    if ($rid === '' || ($keepPix && $rid === $keep)) {
        continue;
    }
    if (gcv_pix_effective_status($res) === 'PAID') {
        $toCapture[] = $res;
    }
}

out('');
out('--- capture ---');
foreach ($toCapture as $res) {
    $rid = strtoupper((string)($res['reservation_id'] ?? ''));
    try {
        $outCap = gcv_sale_capture_from_pix_reservation($res, 'diag-gyovanna');
        out('CAPTURE ' . $rid . ' ' . json_encode($outCap, JSON_UNESCAPED_UNICODE));
    } catch (Throwable $e) {
        out('CAPTURE_ERR ' . $rid . ': ' . $e->getMessage());
    }
}

out('');
out('--- bookings sql ---');
try {
    $sql = "SELECT s.id, s.reservation_id, s.tourist_name, s.guide_name, s.sale_status, s.deleted_at
            FROM gcv_sales s WHERE s.deleted_at IS NULL ORDER BY s.id DESC LIMIT 20";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
    out('visible=' . count($rows));
    foreach ($rows as $r) {
        out(json_encode($r, JSON_UNESCAPED_UNICODE));
    }
} catch (Throwable $e) {
    out('ERRO bookings sql: ' . $e->getMessage());
}

out('FEITO');
