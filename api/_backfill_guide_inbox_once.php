<?php
/**
 * ONE-SHOT: diagnostica gcv_inbox e recria avisos do guia a partir de vendas/passeios.
 * Não envia WhatsApp. Apague depois do sucesso.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/inbox.php';
require_once __DIR__ . '/helpers/notify_ops.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    gcv_inbox_ensure_schema();
    $pdo = db();
    $inbox = $pdo->query("SHOW TABLES LIKE 'gcv_inbox'")->fetch();
    out('gcv_inbox: ' . ($inbox ? 'OK' : 'FALTA'));
    if (!$inbox) {
        out('ERRO: tabela não criada');
        exit;
    }

    $total = (int)$pdo->query('SELECT COUNT(*) FROM gcv_inbox')->fetchColumn();
    out('inbox total: ' . $total);

    $users = $pdo->query(
        "SELECT u.id, u.email, u.role, u.status,
                (SELECT COUNT(*) FROM gcv_inbox i WHERE i.user_id = u.id) AS n
         FROM gcv_users u
         WHERE u.email LIKE '%diego%' OR u.name LIKE '%Navi%' OR u.role = 'guide'
         ORDER BY u.id DESC
         LIMIT 20"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    foreach ($users as $u) {
        out('user #' . $u['id'] . ' ' . $u['email'] . ' role=' . $u['role'] . ' status=' . $u['status'] . ' inbox=' . $u['n']);
    }

    $salesCols = [];
    foreach ($pdo->query('SHOW COLUMNS FROM gcv_sales')->fetchAll(PDO::FETCH_ASSOC) as $c) {
        $salesCols[strtolower((string)$c['Field'])] = true;
    }
    $statusCol = isset($salesCols['sale_status']) ? 'sale_status' : (isset($salesCols['status']) ? 'status' : '');
    $paidFilter = $statusCol !== '' ? "AND UPPER(s.`{$statusCol}`) IN ('PAID','PAGO')" : '';

    $sales = $pdo->query(
        "SELECT s.id, s.guide_user_id, s.excursion_id, s.spots, s.tourist_name, s.reservation_id
         FROM gcv_sales s
         WHERE s.guide_user_id IS NOT NULL AND s.guide_user_id > 0
           AND (s.deleted_at IS NULL OR s.deleted_at = '0000-00-00 00:00:00')
           {$paidFilter}
         ORDER BY s.id DESC
         LIMIT 80"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $nSales = 0;
    foreach ($sales as $sale) {
        $guideId = (int)($sale['guide_user_id'] ?? 0);
        $saleId = (int)($sale['id'] ?? 0);
        $excId = (int)($sale['excursion_id'] ?? 0);
        if ($guideId < 1 || $saleId < 1) {
            continue;
        }
        $chk = $pdo->prepare('SELECT id FROM gcv_inbox WHERE user_id = ? AND sale_id = ? LIMIT 1');
        $chk->execute([$guideId, $saleId]);
        if ($chk->fetch()) {
            continue;
        }
        $exc = $excId > 0 ? gcv_ops_load_excursion($excId) : null;
        $text = $excId > 0
            ? gcv_ops_guide_tour_snapshot($excId, $exc, 'booking')
            : ('Nova inscrição' . (!empty($sale['tourist_name']) ? "\nCliente: " . $sale['tourist_name'] : ''));
        gcv_inbox_push($guideId, $text, [
            'kind' => 'booking',
            'sale_id' => $saleId,
            'excursion_id' => $excId,
        ]);
        $nSales++;
    }
    out('backfill vendas: ' . $nSales);

    $excursions = $pdo->query(
        "SELECT id, guide_user_id, status, date_iso, departure_time
         FROM gcv_excursions
         WHERE guide_user_id IS NOT NULL AND guide_user_id > 0
           AND deleted_at IS NULL
           AND status IN ('pending_approval','published','soldout')
         ORDER BY id DESC
         LIMIT 40"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $nExc = 0;
    foreach ($excursions as $exc) {
        $guideId = (int)$exc['guide_user_id'];
        $excId = (int)$exc['id'];
        $kind = ($exc['status'] === 'pending_approval') ? 'pending' : 'published';
        $chk = $pdo->prepare('SELECT id FROM gcv_inbox WHERE user_id = ? AND excursion_id = ? AND `kind` = ? LIMIT 1');
        $chk->execute([$guideId, $excId, $kind]);
        if ($chk->fetch()) {
            continue;
        }
        $text = gcv_ops_guide_tour_snapshot($excId, $exc, $kind === 'pending' ? 'published' : 'published');
        if ($kind === 'pending') {
            $text = "Passeio enviado para aprovação\n\n" . $text;
        }
        gcv_inbox_push($guideId, $text, [
            'kind' => $kind,
            'excursion_id' => $excId,
        ]);
        $nExc++;
    }
    out('backfill passeios: ' . $nExc);

    $total2 = (int)$pdo->query('SELECT COUNT(*) FROM gcv_inbox')->fetchColumn();
    out('inbox total depois: ' . $total2);
    $last = $pdo->query(
        'SELECT id, user_id, title, created_at FROM gcv_inbox ORDER BY id DESC LIMIT 8'
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    foreach ($last as $row) {
        out('#' . $row['id'] . ' user=' . $row['user_id'] . ' ' . $row['title'] . ' @ ' . $row['created_at']);
    }
    out('DONE');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
