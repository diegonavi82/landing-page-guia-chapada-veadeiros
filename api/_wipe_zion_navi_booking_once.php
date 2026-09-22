<?php
/**
 * ONE-SHOT: confirma e limpa rastros da reserva Zion Navi. Mantém GCV-47MH8R.
 * https://www.guiachapadaveadeiros.com/api/_wipe_zion_navi_booking_once.php?key=GCV-MKT-2026
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

function out(string $m): void
{
    echo $m . "\n";
}

$pdo = db();
out('OK: conectado');

try {
    $n = $pdo->exec(
        "DELETE FROM gcv_inbox WHERE title LIKE '%Zion%' OR title LIKE '%zion%' OR body LIKE '%Zion%' OR body LIKE '%zion%'"
    );
    out('OK inbox_zion rows=' . (int)$n);
} catch (Throwable $e) {
    out('ERR inbox: ' . $e->getMessage());
}

try {
    $n = $pdo->exec("DELETE FROM gcv_pix_carousel_seat_applied WHERE UPPER(reservation_id) <> 'GCV-47MH8R'");
    out('OK seat_applied leftovers rows=' . (int)$n);
} catch (Throwable $e) {
    out('ERR seat_applied: ' . $e->getMessage());
}

$dir = gcv_pix_storage_dir();
foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
    $code = strtoupper(basename($path, '.json'));
    $raw = (string)file_get_contents($path);
    out('PIX ' . $code);
    if ($code !== 'GCV-47MH8R' && stripos($raw, 'zion') !== false) {
        @unlink($path);
        out('json_apagado ' . $code);
    }
}

$sales = $pdo->query(
    'SELECT id, reservation_id, tourist_name, sale_status FROM gcv_sales WHERE deleted_at IS NULL'
)->fetchAll(PDO::FETCH_ASSOC) ?: [];
out('sales_restantes=' . count($sales));
foreach ($sales as $r) {
    out(json_encode($r, JSON_UNESCAPED_UNICODE));
}

out('FEITO: sem reserva Zion Navi no servidor');
